import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { getDatabase, verifyPassword, hashPassword } from './db.js';
import crypto from 'crypto';
import path from 'path';
import net from 'net';
import dns from 'dns/promises';
import fs from 'fs';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
// En el servidor se usa un socket en vez de un puerto
const LISTEN_SOCKET = process.env.LISTEN_SOCKET;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (IS_PRODUCTION && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET es obligatorio en producción');
}
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

// Webs que pueden llamar a la API
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://gbarnicoat.uk,http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.disable('x-powered-by');
// Solo me fío de la IP que pasa nginx
app.set('trust proxy', (ip: string | undefined, hop: number) =>
  hop === 0 && (!ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1'));

app.use(cors({
  origin: (origin, callback) => callback(null, !origin || ALLOWED_ORIGINS.includes(origin)),
  credentials: true
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Cabeceras de seguridad
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "font-src 'self'",
    "img-src 'self' data: https://images.unsplash.com",
    "frame-src https://maps.google.com https://www.google.com",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; '));
  if (IS_PRODUCTION) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Máximo de intentos de login por IP
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function loginRateLimit(req: any, res: any, next: any) {
  const now = Date.now();
  const key = req.ip || 'unknown';
  const entry = loginAttempts.get(key);

  if (!entry || entry.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return next();
  }

  entry.count++;
  if (entry.count > MAX_LOGIN_ATTEMPTS) {
    return res.status(429).json({ error: 'Demasiados intentos. Inténtelo de nuevo en unos minutos' });
  }
  next();
}

// Dice si una IP es de una red interna
function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const lower = ip.toLowerCase();
  if (lower.startsWith('::ffff:')) return isPrivateAddress(lower.slice(7));
  return lower === '::' || lower === '::1' || lower.startsWith('fc') ||
    lower.startsWith('fd') || lower.startsWith('fe80');
}

// El webhook tiene que ser HTTPS y no apuntar a nada interno
async function isSafeWebhookUrl(rawUrl: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;

  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  try {
    const addresses = net.isIP(hostname)
      ? [hostname]
      : (await dns.lookup(hostname, { all: true })).map(a => a.address);
    return addresses.length > 0 && !addresses.some(isPrivateAddress);
  } catch {
    return false;
  }
}

// Que Excel no ejecute fórmulas metidas en los datos
function csvSafe(value: string): string {
  const clean = String(value ?? '').replace(/;/g, ',').replace(/"/g, '""');
  return /^[=+\-@\t\r]/.test(clean) ? `'${clean}` : clean;
}

const SESSION_MS = 24 * 60 * 60 * 1000;
const PASSWORD_MIN = 8;

// Guarda en el navegador la cookie de sesión
function setSessionCookie(res: any, payload: { id: number; tipo: 'centro' | 'miembro' }) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    maxAge: SESSION_MS
  });
}

// Tokens de un solo uso (invitaciones y recuperar contraseña): se guarda solo el hash
function nuevoToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function baseUrl(req: any) {
  return IS_PRODUCTION ? ALLOWED_ORIGINS[0] : `${req.protocol}://${req.get('host')}`;
}

// Middleware de autenticación: deja en req.centro el centro y en req.usuario quién es
async function authenticateToken(req: any, res: any, next: any) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Sesión no iniciada' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; tipo?: 'centro' | 'miembro' };
    const db = await getDatabase();
    const camposCentro = 'id, nombre, email, plan, plan_pendiente, fecha_renovacion, nombre_contacto, telefono, rol, cif, direccion, web';

    let centro: any;
    let usuario: any;

    if (decoded.tipo === 'miembro') {
      const miembro = await db.get('SELECT id, centro_id, nombre, email, rol FROM miembros WHERE id = ? AND activo = 1 AND password_hash IS NOT NULL', [decoded.id]);
      if (!miembro) {
        res.clearCookie('token');
        return res.status(401).json({ error: 'Usuario no encontrado' });
      }
      centro = await db.get(`SELECT ${camposCentro} FROM centros WHERE id = ?`, [miembro.centro_id]);
      usuario = { tipo: 'miembro', id: miembro.id, nombre: miembro.nombre, email: miembro.email, rol: miembro.rol };
    } else {
      centro = await db.get(`SELECT ${camposCentro} FROM centros WHERE id = ?`, [decoded.id]);
      if (centro) {
        usuario = { tipo: 'centro', id: centro.id, nombre: centro.nombre_contacto || centro.nombre, email: centro.email, rol: 'propietario' };
      }
    }

    if (!centro) {
      res.clearCookie('token');
      return res.status(401).json({ error: 'Centro no encontrado' });
    }

    req.centro = centro;
    req.usuario = usuario;
    next();
  } catch (err) {
    res.clearCookie('token');
    return res.status(403).json({ error: 'Sesión inválida o expirada' });
  }
}

// Permisos por rol dentro del centro
function requireRol(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!roles.includes(req.usuario?.rol)) {
      return res.status(403).json({ error: 'No tiene permisos para esta acción' });
    }
    next();
  };
}
const soloPropietario = requireRol('propietario');
const puedeEditar = requireRol('propietario', 'gestor');

function datosSesion(centro: any, usuario: any) {
  return { ...centro, usuario };
}

// --- Endpoints de Autenticación ---

app.post('/api/auth/login', loginRateLimit, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña obligatorios' });
  }

  const error = () => res.status(401).json({ error: 'Las credenciales introducidas no son correctas' });

  try {
    const db = await getDatabase();
    const emailLimpio = String(email).trim().toLowerCase();
    const centro = await db.get('SELECT * FROM centros WHERE lower(email) = ?', [emailLimpio]);

    if (centro) {
      if (!verifyPassword(password, centro.salt, centro.password_hash)) return error();
      setSessionCookie(res, { id: centro.id, tipo: 'centro' });
      const { password_hash, salt, api_token, webhook_url, ...publico } = centro;
      return res.json(datosSesion(publico, { tipo: 'centro', id: centro.id, nombre: centro.nombre_contacto || centro.nombre, email: centro.email, rol: 'propietario' }));
    }

    const miembro = await db.get('SELECT * FROM miembros WHERE lower(email) = ? AND activo = 1 AND password_hash IS NOT NULL', [emailLimpio]);
    if (!miembro || !verifyPassword(password, miembro.salt, miembro.password_hash)) return error();

    const centroMiembro = await db.get('SELECT id, nombre, email, plan, plan_pendiente, fecha_renovacion, nombre_contacto, telefono, rol FROM centros WHERE id = ?', [miembro.centro_id]);
    setSessionCookie(res, { id: miembro.id, tipo: 'miembro' });
    res.json(datosSesion(centroMiembro, { tipo: 'miembro', id: miembro.id, nombre: miembro.nombre, email: miembro.email, rol: miembro.rol }));
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

app.get('/api/auth/me', authenticateToken, (req: any, res) => {
  res.json(datosSesion(req.centro, req.usuario));
});

// Pedir recuperar la contraseña: queda apuntado para el admin (todavía no hay envío de emails)
app.post('/api/auth/recuperar', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email || email.length > 200 || !email.includes('@')) {
    return res.status(400).json({ error: 'Indique un correo electrónico válido' });
  }

  try {
    const db = await getDatabase();
    const pendiente = await db.get('SELECT id FROM peticiones_recuperacion WHERE email = ? AND atendida = 0', [email]);
    if (!pendiente) {
      await db.run('INSERT INTO peticiones_recuperacion (email) VALUES (?)', [email]);
    }
    // La misma respuesta exista o no la cuenta
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar la petición' });
  }
});

// Ver si un enlace de recuperación sigue valiendo
app.get('/api/auth/restablecer/:token', async (req, res) => {
  try {
    const db = await getDatabase();
    const fila = await db.get("SELECT id FROM tokens_recuperacion WHERE token_hash = ? AND usado = 0 AND expira > datetime('now')", [hashToken(req.params.token)]);
    res.json({ valido: !!fila });
  } catch (err) {
    res.status(500).json({ error: 'Error al comprobar el enlace' });
  }
});

// Poner contraseña nueva con el enlace
app.post('/api/auth/restablecer', async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password || String(password).length < PASSWORD_MIN) {
    return res.status(400).json({ error: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres` });
  }

  try {
    const db = await getDatabase();
    const fila = await db.get("SELECT * FROM tokens_recuperacion WHERE token_hash = ? AND usado = 0 AND expira > datetime('now')", [hashToken(token)]);
    if (!fila) {
      return res.status(400).json({ error: 'El enlace no es válido o ha caducado' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const tabla = fila.tipo === 'miembro' ? 'miembros' : 'centros';
    await db.run('BEGIN TRANSACTION');
    await db.run(`UPDATE ${tabla} SET password_hash = ?, salt = ? WHERE id = ?`, [hashPassword(password, salt), salt, fila.usuario_id]);
    await db.run('UPDATE tokens_recuperacion SET usado = 1 WHERE tipo = ? AND usuario_id = ?', [fila.tipo, fila.usuario_id]);
    await db.run('COMMIT');
    res.json({ success: true });
  } catch (err) {
    try { await (await getDatabase()).run('ROLLBACK'); } catch (_) {}
    res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
});

// Crea un enlace de recuperación válido 24 horas
async function crearEnlaceRecuperacion(req: any, tipo: 'centro' | 'miembro', usuarioId: number) {
  const db = await getDatabase();
  const { token, hash } = nuevoToken();
  await db.run('UPDATE tokens_recuperacion SET usado = 1 WHERE tipo = ? AND usuario_id = ? AND usado = 0', [tipo, usuarioId]);
  await db.run("INSERT INTO tokens_recuperacion (tipo, usuario_id, token_hash, expira) VALUES (?, ?, ?, datetime('now', '+1 day'))", [tipo, usuarioId, hash]);
  return `${baseUrl(req)}/centros/restablecer?token=${token}`;
}

// Activar la cuenta de un miembro invitado
app.get('/api/auth/invitacion-miembro/:token', async (req, res) => {
  try {
    const db = await getDatabase();
    const miembro = await db.get(`
      SELECT miembros.email, miembros.rol, centros.nombre as centro_nombre
      FROM miembros JOIN centros ON miembros.centro_id = centros.id
      WHERE miembros.invitacion_hash = ? AND miembros.invitacion_expira > datetime('now') AND miembros.activo = 1
    `, [hashToken(req.params.token)]);
    if (!miembro) return res.status(404).json({ error: 'La invitación no es válida o ha caducado' });
    res.json(miembro);
  } catch (err) {
    res.status(500).json({ error: 'Error al comprobar la invitación' });
  }
});

app.post('/api/auth/activar-miembro', async (req, res) => {
  const { token, nombre, password } = req.body || {};
  if (!token || !nombre || !String(nombre).trim()) {
    return res.status(400).json({ error: 'Indique su nombre' });
  }
  if (!password || String(password).length < PASSWORD_MIN) {
    return res.status(400).json({ error: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres` });
  }

  try {
    const db = await getDatabase();
    const miembro = await db.get("SELECT * FROM miembros WHERE invitacion_hash = ? AND invitacion_expira > datetime('now') AND activo = 1", [hashToken(token)]);
    if (!miembro) return res.status(400).json({ error: 'La invitación no es válida o ha caducado' });

    const salt = crypto.randomBytes(16).toString('hex');
    await db.run('UPDATE miembros SET nombre = ?, password_hash = ?, salt = ?, invitacion_hash = NULL, invitacion_expira = NULL WHERE id = ?',
      [String(nombre).trim().slice(0, 120), hashPassword(password, salt), salt, miembro.id]);

    const centro = await db.get('SELECT id, nombre, email, plan, plan_pendiente, fecha_renovacion, nombre_contacto, telefono, rol FROM centros WHERE id = ?', [miembro.centro_id]);
    setSessionCookie(res, { id: miembro.id, tipo: 'miembro' });
    res.json(datosSesion(centro, { tipo: 'miembro', id: miembro.id, nombre: String(nombre).trim(), email: miembro.email, rol: miembro.rol }));
  } catch (err) {
    res.status(500).json({ error: 'Error al activar la cuenta' });
  }
});

// Solicitud de demo desde la página para centros
app.post('/api/public/demo', async (req, res) => {
  const { nombre_centro, nombre_contacto, email, telefono, rgpd } = req.body || {};
  const campos = [nombre_centro, nombre_contacto, email, telefono].map(v => String(v || '').trim());

  if (campos.some(v => !v) || campos.some(v => v.length > 200) || !campos[2].includes('@')) {
    return res.status(400).json({ error: 'Por favor, rellene todos los campos obligatorios.' });
  }
  if (!rgpd) {
    return res.status(400).json({ error: 'Debe aceptar la política de privacidad y protección de datos.' });
  }

  try {
    const db = await getDatabase();
    await db.run('INSERT INTO solicitudes_demo (nombre_centro, nombre_contacto, email, telefono) VALUES (?, ?, ?, ?)', campos);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo enviar la solicitud. Inténtelo de nuevo.' });
  }
});

// Registrar centro desde invitación
app.post('/api/auth/register-invitation', async (req, res) => {
  const { token, nombre, password, nombre_contacto, telefono } = req.body;

  if (!token || !nombre || !password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const db = await getDatabase();
    const invitacion = await db.get('SELECT * FROM invitaciones WHERE token = ? AND usada = 0', [token]);

    if (!invitacion) {
      return res.status(400).json({ error: 'El enlace de invitación no es válido o ya ha expirado' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const pwdHash = hashPassword(password, salt);
    const apiToken = 'cursenda_live_' + crypto.randomBytes(16).toString('hex');
    
    const fechaRenovacion = new Date();
    fechaRenovacion.setMonth(fechaRenovacion.getMonth() + 1);

    await db.run('BEGIN TRANSACTION');

    const result = await db.run(`
      INSERT INTO centros (nombre, email, password_hash, salt, plan, fecha_renovacion, nombre_contacto, telefono, api_token)
      VALUES (?, ?, ?, ?, 'starter', ?, ?, ?, ?)
    `, [nombre, invitacion.email, pwdHash, salt, fechaRenovacion.toISOString(), nombre_contacto || null, telefono || null, apiToken]);

    await db.run('UPDATE invitaciones SET usada = 1 WHERE id = ?', [invitacion.id]);

    await db.run('COMMIT');

    const newCentroId = result.lastID;
    const loginToken = jwt.sign({ id: newCentroId, email: invitacion.email }, JWT_SECRET, { expiresIn: '1d' });
    
    res.cookie('token', loginToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      id: newCentroId,
      nombre,
      email: invitacion.email,
      plan: 'starter',
      fecha_renovacion: fechaRenovacion.toISOString()
    });
  } catch (err) {
    try {
      const db = await getDatabase();
      await db.run('ROLLBACK');
    } catch (_) {}
    res.status(500).json({ error: 'Error al activar la cuenta' });
  }
});

// --- Endpoints de Cursos (Público y Privado) ---

// Obtener todos los cursos publicados (Vista alumnos con filtros)
app.get('/api/public/cursos', async (req, res) => {
  const { search, categoria, modalidad } = req.query;

  try {
    const db = await getDatabase();
    let query = 'SELECT cursos.*, centros.nombre as centro_nombre FROM cursos JOIN centros ON cursos.centro_id = centros.id WHERE cursos.estado = "publicado"';
    const params: any[] = [];

    if (search) {
      query += ' AND (cursos.titulo LIKE ? OR cursos.localidad LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (categoria && categoria !== 'Todas') {
      query += ' AND cursos.categoria = ?';
      params.push(categoria);
    }

    if (modalidad && modalidad !== 'Todas') {
      query += ' AND cursos.modalidad = ?';
      params.push(modalidad);
    }

    query += ' ORDER BY cursos.id DESC';
    const list = await db.all(query, params);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Error al cargar los cursos' });
  }
});

// Obtener detalle de curso (Público)
app.get('/api/public/cursos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const db = await getDatabase();
    const curso = await db.get('SELECT cursos.*, centros.nombre as centro_nombre FROM cursos JOIN centros ON cursos.centro_id = centros.id WHERE cursos.id = ? AND cursos.estado = "publicado"', [id]);

    if (!curso) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    res.json(curso);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el curso' });
  }
});

// Registrar visita a curso (Público)
app.post('/api/public/cursos/:id/visita', async (req, res) => {
  const { id } = req.params;

  try {
    const db = await getDatabase();
    await db.run('UPDATE cursos SET visitas = visitas + 1 WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar visita' });
  }
});

// Obtener cursos del centro autenticado
app.get('/api/cursos', authenticateToken, async (req: any, res) => {
  try {
    const db = await getDatabase();
    const list = await db.all('SELECT * FROM cursos WHERE centro_id = ? ORDER BY id DESC', [req.centro.id]);
    
    // Obtener solicitudes por curso para sumarlas en la respuesta
    const counts = await db.all(`
      SELECT solicitudes.curso_id, COUNT(*) as count
      FROM solicitudes
      JOIN cursos ON solicitudes.curso_id = cursos.id
      WHERE cursos.centro_id = ?
      GROUP BY solicitudes.curso_id
    `, [req.centro.id]);

    const countMap: Record<number, number> = {};
    counts.forEach((item: any) => {
      countMap[item.curso_id] = item.count;
    });

    const enrichedList = list.map((curso: any) => ({
      ...curso,
      solicitudes_count: countMap[curso.id] || 0
    }));

    res.json(enrichedList);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener los cursos' });
  }
});

// Crear curso
app.post('/api/cursos', authenticateToken, puedeEditar, async (req: any, res) => {
  const { titulo, categoria, modalidad, localidad, duracion_horas, plazas, plazas_cubiertas, fecha_inicio, dirigido_a, descripcion } = req.body;

  if (!titulo || !categoria || !modalidad || !localidad || !duracion_horas || !plazas || !fecha_inicio || !dirigido_a || !descripcion) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  if (modalidad === 'Presencial' || modalidad === 'Mixta') {
    const locLower = (localidad || '').trim().toLowerCase();
    const invalidTerms = ['online', 'remoto', 'virtual', 'internet', 'no presencial', 'distancia', 'remota', 'pantalla', 'cualquiera'];
    if (invalidTerms.some(term => locLower.includes(term)) || locLower === '') {
      return res.status(400).json({ error: 'Para cursos presenciales o mixtos, debe indicar una localidad o dirección física real (no se permite "Online", "Remoto" o similar).' });
    }
  }

  try {
    const db = await getDatabase();
    const result = await db.run(`
      INSERT INTO cursos (centro_id, titulo, categoria, modalidad, localidad, duracion_horas, plazas, plazas_cubiertas, fecha_inicio, dirigido_a, descripcion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.centro.id,
      titulo,
      categoria,
      modalidad,
      localidad,
      parseInt(duracion_horas),
      parseInt(plazas),
      parseInt(plazas_cubiertas || 0),
      fecha_inicio,
      dirigido_a,
      descripcion
    ]);

    const newCurso = await db.get('SELECT * FROM cursos WHERE id = ?', [result.lastID]);
    res.status(201).json(newCurso);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear el curso' });
  }
});

// Editar curso
app.put('/api/cursos/:id', authenticateToken, puedeEditar, async (req: any, res) => {
  const { id } = req.params;
  const { titulo, categoria, modalidad, localidad, duracion_horas, plazas, plazas_cubiertas, fecha_inicio, dirigido_a, descripcion } = req.body;

  try {
    const db = await getDatabase();
    const curso = await db.get('SELECT * FROM cursos WHERE id = ? AND centro_id = ?', [id, req.centro.id]);

    if (!curso) {
      return res.status(404).json({ error: 'Curso no encontrado o sin permisos' });
    }

    const finalModalidad = modalidad !== undefined ? modalidad : curso.modalidad;
    const finalLocalidad = localidad !== undefined ? localidad : curso.localidad;

    if (finalModalidad === 'Presencial' || finalModalidad === 'Mixta') {
      const locLower = (finalLocalidad || '').trim().toLowerCase();
      const invalidTerms = ['online', 'remoto', 'virtual', 'internet', 'no presencial', 'distancia', 'remota', 'pantalla', 'cualquiera'];
      if (invalidTerms.some(term => locLower.includes(term)) || locLower === '') {
        return res.status(400).json({ error: 'Para cursos presenciales o mixtos, debe indicar una localidad o dirección física real (no se permite "Online", "Remoto" o similar).' });
      }
    }

    await db.run(`
      UPDATE cursos 
      SET titulo = ?, categoria = ?, modalidad = ?, localidad = ?, duracion_horas = ?, plazas = ?, plazas_cubiertas = ?, fecha_inicio = ?, dirigido_a = ?, descripcion = ?
      WHERE id = ?
    `, [
      titulo || curso.titulo,
      categoria || curso.categoria,
      modalidad || curso.modalidad,
      localidad || curso.localidad,
      duracion_horas !== undefined ? parseInt(duracion_horas) : curso.duracion_horas,
      plazas !== undefined ? parseInt(plazas) : curso.plazas,
      plazas_cubiertas !== undefined ? parseInt(plazas_cubiertas) : curso.plazas_cubiertas,
      fecha_inicio || curso.fecha_inicio,
      dirigido_a || curso.dirigido_a,
      descripcion || curso.descripcion,
      id
    ]);

    const updatedCurso = await db.get('SELECT * FROM cursos WHERE id = ?', [id]);
    res.json(updatedCurso);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar el curso' });
  }
});

// Pausar/Reanudar curso
app.post('/api/cursos/:id/toggle-estado', authenticateToken, puedeEditar, async (req: any, res) => {
  const { id } = req.params;

  try {
    const db = await getDatabase();
    const curso = await db.get('SELECT * FROM cursos WHERE id = ? AND centro_id = ?', [id, req.centro.id]);

    if (!curso) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    const nuevoEstado = curso.estado === 'publicado' ? 'pausado' : 'publicado';
    await db.run('UPDATE cursos SET estado = ? WHERE id = ?', [nuevoEstado, id]);

    res.json({ success: true, estado: nuevoEstado });
  } catch (err) {
    res.status(500).json({ error: 'Error al cambiar el estado del curso' });
  }
});

// --- Endpoints de Solicitudes (Leads) ---

// Registrar solicitud (Público - Alumno)
app.post('/api/public/solicitudes', async (req, res) => {
  const { curso_id, nombre, email, telefono, rgpd } = req.body;

  if (!curso_id || !nombre || !email || !telefono) {
    return res.status(400).json({ error: 'Por favor, rellene todos los campos requeridos' });
  }

  if (!rgpd) {
    return res.status(400).json({ error: 'Debe aceptar la política de privacidad y protección de datos' });
  }

  try {
    const db = await getDatabase();
    const curso = await db.get(`
      SELECT cursos.id, cursos.titulo, centros.webhook_url, centros.nombre as centro_nombre
      FROM cursos
      JOIN centros ON cursos.centro_id = centros.id
      WHERE cursos.id = ? AND cursos.estado = "publicado"
    `, [curso_id]);
    
    if (!curso) {
      return res.status(404).json({ error: 'El curso no está disponible para solicitudes' });
    }

    await db.run(`
      INSERT INTO solicitudes (curso_id, nombre, email, telefono, gestionado)
      VALUES (?, ?, ?, ?, 0)
    `, [curso_id, nombre, email, telefono]);

    // Despachar Webhook si está configurado en el centro
    if (curso.webhook_url && await isSafeWebhookUrl(curso.webhook_url)) {
      fetch(curso.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'lead.created',
          timestamp: new Date().toISOString(),
          data: {
            curso: curso.titulo,
            centro: curso.centro_nombre,
            alumno: {
              nombre,
              email,
              telefono
            }
          }
        })
      }).catch((err: any) => console.error('Error al despachar webhook:', err.message));
    }

    res.status(201).json({ success: true, message: 'Solicitud enviada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar su solicitud. Inténtelo de nuevo' });
  }
});

// Obtener solicitudes del centro
app.get('/api/solicitudes', authenticateToken, async (req: any, res) => {
  try {
    const db = await getDatabase();
    const list = await db.all(`
      SELECT solicitudes.*, cursos.titulo as curso_titulo 
      FROM solicitudes 
      JOIN cursos ON solicitudes.curso_id = cursos.id 
      WHERE cursos.centro_id = ? 
      ORDER BY solicitudes.fecha_creacion DESC
    `, [req.centro.id]);

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener las solicitudes' });
  }
});

// Marcar solicitud como gestionada
app.post('/api/solicitudes/:id/gestionado', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { gestionado } = req.body;

  try {
    const db = await getDatabase();
    // Validar propiedad del curso correspondiente
    const solicitud = await db.get(`
      SELECT solicitudes.id 
      FROM solicitudes 
      JOIN cursos ON solicitudes.curso_id = cursos.id 
      WHERE solicitudes.id = ? AND cursos.centro_id = ?
    `, [id, req.centro.id]);

    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    await db.run('UPDATE solicitudes SET gestionado = ? WHERE id = ?', [gestionado ? 1 : 0, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar el estado' });
  }
});

// Actualizar estado detallado de una solicitud
app.put('/api/solicitudes/:id/estado', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { estado_detalle } = req.body;

  const validStates = ['Nuevo', 'Llamado', 'Interesado', 'Matriculado', 'Descartado'];
  if (!validStates.includes(estado_detalle)) {
    return res.status(400).json({ error: 'Estado no válido' });
  }

  try {
    const db = await getDatabase();
    const solicitud = await db.get(`
      SELECT solicitudes.id 
      FROM solicitudes 
      JOIN cursos ON solicitudes.curso_id = cursos.id 
      WHERE solicitudes.id = ? AND cursos.centro_id = ?
    `, [id, req.centro.id]);

    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    const gestionado = estado_detalle === 'Nuevo' ? 0 : 1;

    await db.run('UPDATE solicitudes SET estado_detalle = ?, gestionado = ? WHERE id = ?', [estado_detalle, gestionado, id]);
    res.json({ success: true, estado_detalle, gestionado });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar el estado de la solicitud' });
  }
});

// Obtener notas de una solicitud
app.get('/api/solicitudes/:id/notas', authenticateToken, async (req: any, res) => {
  const { id } = req.params;

  try {
    const db = await getDatabase();
    const solicitud = await db.get(`
      SELECT solicitudes.id 
      FROM solicitudes 
      JOIN cursos ON solicitudes.curso_id = cursos.id 
      WHERE solicitudes.id = ? AND cursos.centro_id = ?
    `, [id, req.centro.id]);

    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    const notas = await db.all('SELECT * FROM notas_contacto WHERE solicitud_id = ? ORDER BY fecha_creacion DESC', [id]);
    res.json(notas);
  } catch (err) {
    res.status(500).json({ error: 'Error al cargar el historial' });
  }
});

// Añadir nota de contacto (marca automáticamente como gestionado)
app.post('/api/solicitudes/:id/notas', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { texto } = req.body;

  if (!texto || texto.trim() === '') {
    return res.status(400).json({ error: 'El contenido de la nota no puede estar vacío' });
  }

  try {
    const db = await getDatabase();
    const solicitud = await db.get(`
      SELECT solicitudes.id 
      FROM solicitudes 
      JOIN cursos ON solicitudes.curso_id = cursos.id 
      WHERE solicitudes.id = ? AND cursos.centro_id = ?
    `, [id, req.centro.id]);

    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    await db.run('BEGIN TRANSACTION');

    await db.run('INSERT INTO notas_contacto (solicitud_id, texto) VALUES (?, ?)', [id, texto]);
    await db.run('UPDATE solicitudes SET gestionado = 1 WHERE id = ?', [id]);

    await db.run('COMMIT');

    const nuevaNota = await db.get('SELECT * FROM notas_contacto WHERE solicitud_id = ? ORDER BY id DESC LIMIT 1', [id]);
    res.status(201).json(nuevaNota);
  } catch (err) {
    try {
      const db = await getDatabase();
      await db.run('ROLLBACK');
    } catch (_) {}
    res.status(500).json({ error: 'Error al guardar la nota' });
  }
});

// Exportar solicitudes a CSV con formato español (; y UTF-8 BOM)
app.get('/api/solicitudes/export', authenticateToken, puedeEditar, async (req: any, res) => {
  try {
    const db = await getDatabase();
    const list = await db.all(`
      SELECT solicitudes.nombre, solicitudes.email, solicitudes.telefono, solicitudes.fecha_creacion, solicitudes.gestionado, cursos.titulo as curso_titulo
      FROM solicitudes 
      JOIN cursos ON solicitudes.curso_id = cursos.id 
      WHERE cursos.centro_id = ? 
      ORDER BY solicitudes.fecha_creacion DESC
    `, [req.centro.id]);

    // Generar contenido CSV con delimitador ;
    let csvContent = 'Nombre;Email;Teléfono;Curso;Fecha de Solicitud;Gestionado\r\n';
    
    list.forEach((sol: any) => {
      const gestionadoTexto = sol.gestionado ? 'Sí' : 'No';
      const fecha = new Date(sol.fecha_creacion).toLocaleString('es-ES');
      
      // Limpiar los datos para el CSV
      const nombre = csvSafe(sol.nombre);
      const email = csvSafe(sol.email);
      const telefono = csvSafe(sol.telefono);
      const curso = csvSafe(sol.curso_titulo);

      csvContent += `"${nombre}";"${email}";"${telefono}";"${curso}";"${fecha}";"${gestionadoTexto}"\r\n`;
    });

    // Enviar con UTF-8 BOM
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=solicitudes_cursenda.csv');
    
    // Escribir el BOM (Byte Order Mark) para UTF-8: EF BB BF
    const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
    res.write(bom);
    res.write(csvContent);
    res.end();
  } catch (err) {
    res.status(500).json({ error: 'Error al exportar los datos' });
  }
});

// --- Endpoints de Estadísticas ---

app.get('/api/estadisticas', authenticateToken, async (req: any, res) => {
  try {
    const db = await getDatabase();
    
    const countCursos = await db.get('SELECT COUNT(*) as count FROM cursos WHERE centro_id = ?', [req.centro.id]);
    const visitasTotales = await db.get('SELECT SUM(visitas) as count FROM cursos WHERE centro_id = ?', [req.centro.id]);
    
    // Solicitudes totales del centro
    const countSolicitudes = await db.get(`
      SELECT COUNT(*) as count 
      FROM solicitudes 
      JOIN cursos ON solicitudes.curso_id = cursos.id 
      WHERE cursos.centro_id = ?
    `, [req.centro.id]);

    // Solicitudes nuevas esta semana
    const countNuevasSemana = await db.get(`
      SELECT COUNT(*) as count 
      FROM solicitudes 
      JOIN cursos ON solicitudes.curso_id = cursos.id 
      WHERE cursos.centro_id = ? 
        AND solicitudes.fecha_creacion >= datetime('now', '-7 days')
    `, [req.centro.id]);

    // Solicitudes sin gestionar (gestionado = 0)
    const countSinGestionar = await db.get(`
      SELECT COUNT(*) as count 
      FROM solicitudes 
      JOIN cursos ON solicitudes.curso_id = cursos.id 
      WHERE cursos.centro_id = ? AND solicitudes.gestionado = 0
    `, [req.centro.id]);

    res.json({
      cursos_publicados: (countCursos as any)?.count || 0,
      visitas_totales: (visitasTotales as any)?.count || 0,
      solicitudes_totales: (countSolicitudes as any)?.count || 0,
      solicitudes_nuevas_semana: (countNuevasSemana as any)?.count || 0,
      solicitudes_sin_gestionar: (countSinGestionar as any)?.count || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al cargar estadísticas' });
  }
});

// --- Endpoints de Plan y Facturas ---

// Solicitar cambio de plan (se aplica en la siguiente renovación)
app.post('/api/plan/cambio', authenticateToken, soloPropietario, async (req: any, res) => {
  const { plan } = req.body;

  if (!plan || !['starter', 'pro', 'custom'].includes(plan)) {
    return res.status(400).json({ error: 'Plan no válido' });
  }

  try {
    const db = await getDatabase();
    await db.run('UPDATE centros SET plan_pendiente = ? WHERE id = ?', [plan, req.centro.id]);
    res.json({ success: true, plan_pendiente: plan });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar el plan' });
  }
});

// Cancelar cambio de plan pendiente
app.post('/api/plan/cancelar-cambio', authenticateToken, soloPropietario, async (req: any, res) => {
  try {
    const db = await getDatabase();
    await db.run('UPDATE centros SET plan_pendiente = NULL WHERE id = ?', [req.centro.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al cancelar la solicitud' });
  }
});

// Obtener facturas
app.get('/api/facturas', authenticateToken, soloPropietario, async (req: any, res) => {
  try {
    const db = await getDatabase();
    const list = await db.all('SELECT * FROM facturas WHERE centro_id = ? ORDER BY id DESC', [req.centro.id]);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener facturas' });
  }
});

// --- Endpoints de Configuración de API y Webhooks ---

// Obtener configuración de API y Webhook
app.get('/api/centro/api-settings', authenticateToken, soloPropietario, async (req: any, res) => {
  try {
    const db = await getDatabase();
    const row = await db.get('SELECT api_token, webhook_url FROM centros WHERE id = ?', [req.centro.id]);
    res.json({
      api_token: row?.api_token || '',
      webhook_url: row?.webhook_url || ''
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener la configuración de API' });
  }
});

// Regenerar clave API
app.post('/api/centro/api-settings/regenerate', authenticateToken, soloPropietario, async (req: any, res) => {
  const nuevoToken = 'cursenda_live_' + crypto.randomBytes(16).toString('hex');
  try {
    const db = await getDatabase();
    await db.run('UPDATE centros SET api_token = ? WHERE id = ?', [nuevoToken, req.centro.id]);
    res.json({ success: true, api_token: nuevoToken });
  } catch (err) {
    res.status(500).json({ error: 'Error al regenerar el token de API' });
  }
});

// Guardar webhook
app.post('/api/centro/api-settings/webhook', authenticateToken, soloPropietario, async (req: any, res) => {
  const { webhook_url } = req.body;
  if (webhook_url && !(await isSafeWebhookUrl(webhook_url))) {
    return res.status(400).json({ error: 'La URL del webhook debe ser HTTPS y apuntar a un servidor público' });
  }
  try {
    const db = await getDatabase();
    await db.run('UPDATE centros SET webhook_url = ? WHERE id = ?', [webhook_url || null, req.centro.id]);
    res.json({ success: true, webhook_url: webhook_url || '' });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar la URL de webhook' });
  }
});

// Datos del centro (pestaña Configuración)
app.put('/api/centro/perfil', authenticateToken, soloPropietario, async (req: any, res) => {
  const limpio = (v: any, max = 200) => String(v ?? '').trim().slice(0, max);
  const nombre = limpio(req.body?.nombre);
  if (!nombre) return res.status(400).json({ error: 'El nombre del centro es obligatorio' });

  const web = limpio(req.body?.web);
  if (web && !/^https?:\/\//i.test(web)) {
    return res.status(400).json({ error: 'La web tiene que empezar por http:// o https://' });
  }

  try {
    const db = await getDatabase();
    await db.run('UPDATE centros SET nombre = ?, telefono = ?, cif = ?, direccion = ?, web = ? WHERE id = ?', [
      nombre, limpio(req.body?.telefono, 30), limpio(req.body?.cif, 20), limpio(req.body?.direccion), web, req.centro.id
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar los datos' });
  }
});

// --- Equipo del centro ---

const ROLES_MIEMBRO = ['gestor', 'colaborador'];

app.get('/api/equipo', authenticateToken, soloPropietario, async (req: any, res) => {
  try {
    const db = await getDatabase();
    const miembros = await db.all(`
      SELECT id, nombre, email, rol, activo, fecha_creacion,
        CASE WHEN password_hash IS NULL THEN 'pendiente' WHEN activo = 0 THEN 'desactivado' ELSE 'activo' END as estado
      FROM miembros WHERE centro_id = ? ORDER BY id
    `, [req.centro.id]);
    res.json({
      propietario: { nombre: req.centro.nombre_contacto || req.centro.nombre, email: req.centro.email },
      miembros
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al cargar el equipo' });
  }
});

// Invitar a alguien: devuelve el enlace para pasárselo (válido 7 días)
app.post('/api/equipo', authenticateToken, soloPropietario, async (req: any, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const rol = req.body?.rol;

  if (!email.includes('@') || email.length > 200) {
    return res.status(400).json({ error: 'Indique un correo electrónico válido' });
  }
  if (!ROLES_MIEMBRO.includes(rol)) {
    return res.status(400).json({ error: 'Rol no válido' });
  }

  try {
    const db = await getDatabase();
    const ocupado = await db.get('SELECT id FROM centros WHERE lower(email) = ?', [email])
      || await db.get('SELECT id FROM miembros WHERE lower(email) = ?', [email]);
    if (ocupado) {
      return res.status(400).json({ error: 'Ese correo ya tiene una cuenta en Cursenda' });
    }

    const { token, hash } = nuevoToken();
    await db.run("INSERT INTO miembros (centro_id, email, rol, invitacion_hash, invitacion_expira) VALUES (?, ?, ?, ?, datetime('now', '+7 days'))",
      [req.centro.id, email, rol, hash]);
    res.status(201).json({ success: true, enlace: `${baseUrl(req)}/centros/unirse?token=${token}` });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear la invitación' });
  }
});

// Cambiar rol o activar/desactivar
app.put('/api/equipo/:id', authenticateToken, soloPropietario, async (req: any, res) => {
  const { rol, activo } = req.body || {};
  if (rol !== undefined && !ROLES_MIEMBRO.includes(rol)) {
    return res.status(400).json({ error: 'Rol no válido' });
  }

  try {
    const db = await getDatabase();
    const miembro = await db.get('SELECT * FROM miembros WHERE id = ? AND centro_id = ?', [req.params.id, req.centro.id]);
    if (!miembro) return res.status(404).json({ error: 'Usuario no encontrado' });

    await db.run('UPDATE miembros SET rol = ?, activo = ? WHERE id = ?', [
      rol ?? miembro.rol,
      activo === undefined ? miembro.activo : (activo ? 1 : 0),
      miembro.id
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar el usuario' });
  }
});

app.delete('/api/equipo/:id', authenticateToken, soloPropietario, async (req: any, res) => {
  try {
    const db = await getDatabase();
    const result = await db.run('DELETE FROM miembros WHERE id = ? AND centro_id = ?', [req.params.id, req.centro.id]);
    if (!result.changes) return res.status(404).json({ error: 'Usuario no encontrado' });
    await db.run("DELETE FROM tokens_recuperacion WHERE tipo = 'miembro' AND usuario_id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar el usuario' });
  }
});

// Enlace para que un miembro ponga contraseña nueva
app.post('/api/equipo/:id/enlace-recuperacion', authenticateToken, soloPropietario, async (req: any, res) => {
  try {
    const db = await getDatabase();
    const miembro = await db.get('SELECT id FROM miembros WHERE id = ? AND centro_id = ? AND password_hash IS NOT NULL', [req.params.id, req.centro.id]);
    if (!miembro) return res.status(404).json({ error: 'Usuario no encontrado o sin activar' });
    res.json({ enlace: await crearEnlaceRecuperacion(req, 'miembro', miembro.id) });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear el enlace' });
  }
});

// --- Plantillas de contacto ---

const PLANTILLAS_INICIALES = [
  { titulo: 'Primer contacto (WhatsApp)', tipo: 'whatsapp', texto: 'Hola [Nombre], te escribimos de [Centro] por tu solicitud de plaza gratuita en el curso "[Curso]". ¿Te viene bien una llamada breve hoy para confirmar tus datos?' },
  { titulo: 'Requisitos SEPE (Email)', tipo: 'email', texto: 'Estimado/a [Nombre],\n\nPara tramitar su matrícula gratuita en el curso "[Curso]", necesitamos que nos facilite una copia de su DNI y su documento de demanda de empleo (DARDE) o su última nómina.\n\nUn saludo,\n[Centro]' },
  { titulo: 'Convocatoria de inicio (WhatsApp)', tipo: 'whatsapp', texto: '¡Buenas noticias [Nombre]! Tu plaza para el curso "[Curso]" ha sido confirmada. Empezamos el próximo [Fecha] a las 09:00. Por favor, confirma tu asistencia respondiendo a este mensaje.' }
];

app.get('/api/plantillas', authenticateToken, async (req: any, res) => {
  try {
    const db = await getDatabase();
    let lista = await db.all('SELECT * FROM plantillas WHERE centro_id = ? ORDER BY id', [req.centro.id]);
    // La primera vez se crean las de ejemplo
    if (lista.length === 0) {
      for (const p of PLANTILLAS_INICIALES) {
        await db.run('INSERT INTO plantillas (centro_id, titulo, tipo, texto) VALUES (?, ?, ?, ?)', [req.centro.id, p.titulo, p.tipo, p.texto]);
      }
      lista = await db.all('SELECT * FROM plantillas WHERE centro_id = ? ORDER BY id', [req.centro.id]);
    }
    res.json(lista);
  } catch (err) {
    res.status(500).json({ error: 'Error al cargar las plantillas' });
  }
});

function validarPlantilla(body: any) {
  const titulo = String(body?.titulo || '').trim();
  const texto = String(body?.texto || '').trim();
  const tipo = body?.tipo === 'email' ? 'email' : 'whatsapp';
  if (!titulo || !texto || titulo.length > 120 || texto.length > 4000) return null;
  return { titulo, texto, tipo };
}

app.post('/api/plantillas', authenticateToken, puedeEditar, async (req: any, res) => {
  const p = validarPlantilla(req.body);
  if (!p) return res.status(400).json({ error: 'El título y el texto son obligatorios' });
  try {
    const db = await getDatabase();
    const result = await db.run('INSERT INTO plantillas (centro_id, titulo, tipo, texto) VALUES (?, ?, ?, ?)', [req.centro.id, p.titulo, p.tipo, p.texto]);
    res.status(201).json(await db.get('SELECT * FROM plantillas WHERE id = ?', [result.lastID]));
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar la plantilla' });
  }
});

app.put('/api/plantillas/:id', authenticateToken, puedeEditar, async (req: any, res) => {
  const p = validarPlantilla(req.body);
  if (!p) return res.status(400).json({ error: 'El título y el texto son obligatorios' });
  try {
    const db = await getDatabase();
    const result = await db.run('UPDATE plantillas SET titulo = ?, tipo = ?, texto = ? WHERE id = ? AND centro_id = ?', [p.titulo, p.tipo, p.texto, req.params.id, req.centro.id]);
    if (!result.changes) return res.status(404).json({ error: 'Plantilla no encontrada' });
    res.json(await db.get('SELECT * FROM plantillas WHERE id = ?', [req.params.id]));
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar la plantilla' });
  }
});

app.delete('/api/plantillas/:id', authenticateToken, puedeEditar, async (req: any, res) => {
  try {
    const db = await getDatabase();
    const result = await db.run('DELETE FROM plantillas WHERE id = ? AND centro_id = ?', [req.params.id, req.centro.id]);
    if (!result.changes) return res.status(404).json({ error: 'Plantilla no encontrada' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al borrar la plantilla' });
  }
});

// Middleware para verificar que el usuario autenticado es administrador
async function authenticateAdmin(req: any, res: any, next: any) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Sesión no iniciada' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; tipo?: string };
    // Los miembros de un centro nunca son admin
    if (decoded.tipo === 'miembro') {
      return res.status(403).json({ error: 'Acceso denegado: se requieren permisos de administrador' });
    }
    const db = await getDatabase();
    const admin = await db.get('SELECT id, nombre, email, rol FROM centros WHERE id = ? AND rol = "admin"', [decoded.id]);
    
    if (!admin) {
      return res.status(403).json({ error: 'Acceso denegado: se requieren permisos de administrador' });
    }

    req.admin = admin;
    next();
  } catch (err) {
    res.clearCookie('token');
    return res.status(403).json({ error: 'Sesión inválida o expirada' });
  }
}

// --- Endpoints de Administración (Portal de Admin) ---

// Obtener todas las academias
app.get('/api/admin/centros', authenticateAdmin, async (req, res) => {
  try {
    const db = await getDatabase();
    const list = await db.all('SELECT id, nombre, email, plan, plan_pendiente, fecha_renovacion, nombre_contacto, telefono, rol FROM centros ORDER BY id DESC');
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener las academias' });
  }
});

// Crear una nueva academia
app.post('/api/admin/centros', authenticateAdmin, async (req, res) => {
  const { nombre, email, password, plan, nombre_contacto, telefono } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
  }

  try {
    const db = await getDatabase();
    
    const exists = await db.get('SELECT id FROM centros WHERE lower(email) = lower(?)', [email])
      || await db.get('SELECT id FROM miembros WHERE lower(email) = lower(?)', [email]);
    if (exists) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const pwdHash = hashPassword(password, salt);
    const apiToken = 'cursenda_live_' + crypto.randomBytes(16).toString('hex');
    
    const fechaRenovacion = new Date();
    fechaRenovacion.setMonth(fechaRenovacion.getMonth() + 1);

    const result = await db.run(`
      INSERT INTO centros (nombre, email, password_hash, salt, plan, fecha_renovacion, nombre_contacto, telefono, api_token, rol)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'centro')
    `, [nombre, email, pwdHash, salt, plan || 'starter', fechaRenovacion.toISOString(), nombre_contacto || null, telefono || null, apiToken]);

    const newCentro = await db.get('SELECT id, nombre, email, plan, fecha_renovacion, nombre_contacto, telefono, rol FROM centros WHERE id = ?', [result.lastID]);
    res.status(201).json(newCentro);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear la academia' });
  }
});

// Modificar datos de una academia (por ejemplo, cambiar su plan)
app.put('/api/admin/centros/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre, email, plan, fecha_renovacion, nombre_contacto, telefono } = req.body;

  try {
    const db = await getDatabase();
    const centro = await db.get('SELECT * FROM centros WHERE id = ?', [id]);
    if (!centro) {
      return res.status(404).json({ error: 'Academia no encontrada' });
    }

    await db.run(`
      UPDATE centros
      SET nombre = ?, email = ?, plan = ?, fecha_renovacion = ?, nombre_contacto = ?, telefono = ?
      WHERE id = ?
    `, [
      nombre || centro.nombre,
      email || centro.email,
      plan || centro.plan,
      fecha_renovacion || centro.fecha_renovacion,
      nombre_contacto !== undefined ? nombre_contacto : centro.nombre_contacto,
      telefono !== undefined ? telefono : centro.telefono,
      id
    ]);

    const updated = await db.get('SELECT id, nombre, email, plan, fecha_renovacion, nombre_contacto, telefono, rol FROM centros WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar la academia' });
  }
});

// Eliminar una academia
app.delete('/api/admin/centros/:id', authenticateAdmin, async (req: any, res) => {
  const { id } = req.params;

  try {
    const db = await getDatabase();
    
    if (parseInt(id) === req.admin.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta de administrador' });
    }

    const centro = await db.get('SELECT id FROM centros WHERE id = ?', [id]);
    if (!centro) {
      return res.status(404).json({ error: 'Academia no encontrada' });
    }

    await db.run('DELETE FROM centros WHERE id = ?', [id]);
    res.json({ success: true, message: 'Academia eliminada con éxito' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar la academia' });
  }
});

// Obtener todos los cursos
app.get('/api/admin/cursos', authenticateAdmin, async (req, res) => {
  try {
    const db = await getDatabase();
    const list = await db.all(`
      SELECT cursos.*, centros.nombre as centro_nombre 
      FROM cursos 
      JOIN centros ON cursos.centro_id = centros.id 
      ORDER BY cursos.id DESC
    `);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener los cursos' });
  }
});

// Modificar un curso desde moderación (cambiar estado, título, descripción, etc.)
app.put('/api/admin/cursos/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { titulo, categoria, modalidad, localidad, duracion_horas, plazas, plazas_cubiertas, fecha_inicio, dirigido_a, descripcion, estado } = req.body;

  try {
    const db = await getDatabase();
    const curso = await db.get('SELECT * FROM cursos WHERE id = ?', [id]);
    if (!curso) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    await db.run(`
      UPDATE cursos 
      SET titulo = ?, categoria = ?, modalidad = ?, localidad = ?, duracion_horas = ?, plazas = ?, plazas_cubiertas = ?, fecha_inicio = ?, dirigido_a = ?, descripcion = ?, estado = ?
      WHERE id = ?
    `, [
      titulo || curso.titulo,
      categoria || curso.categoria,
      modalidad || curso.modalidad,
      localidad || curso.localidad,
      duracion_horas !== undefined ? parseInt(duracion_horas) : curso.duracion_horas,
      plazas !== undefined ? parseInt(plazas) : curso.plazas,
      plazas_cubiertas !== undefined ? parseInt(plazas_cubiertas) : curso.plazas_cubiertas,
      fecha_inicio || curso.fecha_inicio,
      dirigido_a || curso.dirigido_a,
      descripcion || curso.descripcion,
      estado || curso.estado,
      id
    ]);

    const updated = await db.get('SELECT * FROM cursos WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar el curso' });
  }
});

// Eliminar un curso
app.delete('/api/admin/cursos/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const db = await getDatabase();
    const curso = await db.get('SELECT id FROM cursos WHERE id = ?', [id]);
    if (!curso) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    await db.run('DELETE FROM cursos WHERE id = ?', [id]);
    res.json({ success: true, message: 'Curso eliminado con éxito' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar el curso' });
  }
});

// Obtener todas las solicitudes registradas
app.get('/api/admin/solicitudes', authenticateAdmin, async (req, res) => {
  try {
    const db = await getDatabase();
    const list = await db.all(`
      SELECT solicitudes.*, cursos.titulo as curso_titulo, centros.nombre as centro_nombre
      FROM solicitudes
      JOIN cursos ON solicitudes.curso_id = cursos.id
      JOIN centros ON cursos.centro_id = centros.id
      ORDER BY solicitudes.id DESC
    `);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener las solicitudes' });
  }
});

// Solicitudes de demo de la página para centros
app.get('/api/admin/demos', authenticateAdmin, async (req, res) => {
  try {
    const db = await getDatabase();
    res.json(await db.all('SELECT * FROM solicitudes_demo ORDER BY id DESC'));
  } catch (err) {
    res.status(500).json({ error: 'Error al cargar las solicitudes de demo' });
  }
});

app.put('/api/admin/demos/:id', authenticateAdmin, async (req, res) => {
  const estado = req.body?.estado;
  if (!['nueva', 'contactada', 'descartada'].includes(estado)) {
    return res.status(400).json({ error: 'Estado no válido' });
  }
  try {
    const db = await getDatabase();
    await db.run('UPDATE solicitudes_demo SET estado = ? WHERE id = ?', [estado, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar la solicitud' });
  }
});

// Peticiones de "he olvidado mi contraseña"
app.get('/api/admin/recuperaciones', authenticateAdmin, async (req, res) => {
  try {
    const db = await getDatabase();
    const lista = await db.all(`
      SELECT p.*,
        (SELECT nombre FROM centros WHERE lower(email) = p.email) as centro_nombre,
        (SELECT c.nombre FROM miembros m JOIN centros c ON m.centro_id = c.id WHERE lower(m.email) = p.email) as miembro_de
      FROM peticiones_recuperacion p ORDER BY p.atendida, p.id DESC LIMIT 200
    `);
    res.json(lista);
  } catch (err) {
    res.status(500).json({ error: 'Error al cargar las peticiones' });
  }
});

// Genera el enlace para la cuenta de esa petición y la marca como atendida
app.post('/api/admin/recuperaciones/:id/enlace', authenticateAdmin, async (req, res) => {
  try {
    const db = await getDatabase();
    const peticion = await db.get('SELECT * FROM peticiones_recuperacion WHERE id = ?', [req.params.id]);
    if (!peticion) return res.status(404).json({ error: 'Petición no encontrada' });

    const centro = await db.get('SELECT id FROM centros WHERE lower(email) = ?', [peticion.email]);
    const miembro = centro ? null : await db.get('SELECT id FROM miembros WHERE lower(email) = ? AND password_hash IS NOT NULL', [peticion.email]);
    if (!centro && !miembro) {
      return res.status(404).json({ error: 'No hay ninguna cuenta con ese correo' });
    }

    const enlace = await crearEnlaceRecuperacion(req, centro ? 'centro' : 'miembro', (centro || miembro).id);
    await db.run('UPDATE peticiones_recuperacion SET atendida = 1 WHERE id = ?', [peticion.id]);
    res.json({ enlace });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear el enlace' });
  }
});

app.post('/api/admin/recuperaciones/:id/descartar', authenticateAdmin, async (req, res) => {
  try {
    const db = await getDatabase();
    await db.run('UPDATE peticiones_recuperacion SET atendida = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar la petición' });
  }
});

// Enlace de recuperación para un centro concreto
app.post('/api/admin/centros/:id/enlace-recuperacion', authenticateAdmin, async (req, res) => {
  try {
    const db = await getDatabase();
    const centro = await db.get('SELECT id FROM centros WHERE id = ?', [req.params.id]);
    if (!centro) return res.status(404).json({ error: 'Academia no encontrada' });
    res.json({ enlace: await crearEnlaceRecuperacion(req, 'centro', centro.id) });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear el enlace' });
  }
});

// --- Servir archivos estáticos del Frontend en Producción ---
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

// Cualquier otra ruta en producción devolverá la aplicación React
app.use((req, res, next) => {
  // Ignorar peticiones API
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Iniciar servidor
if (LISTEN_SOCKET) {
  // Borrar el socket si se quedó de antes
  if (fs.existsSync(LISTEN_SOCKET)) fs.unlinkSync(LISTEN_SOCKET);
  app.listen(LISTEN_SOCKET, () => {
    // Para que nginx pueda entrar
    fs.chmodSync(LISTEN_SOCKET, 0o660);
    console.log(`Servidor de Cursenda escuchando en el socket ${LISTEN_SOCKET}`);
  });
} else {
  app.listen(PORT, HOST, () => {
    console.log(`Servidor de Cursenda corriendo en http://${HOST}:${PORT}`);
  });
}
