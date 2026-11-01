import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { getDatabase, verifyPassword, hashPassword, hashAntiguo } from './db.js';
import { reiniciarDemo, programarReinicioDemo } from './demo.js';
import { familiaDe, slugSector, NOMBRES_SECTORES } from './familias.js';
import { avisoContrasena, avisoPeticionAcceso, avisoPrueba, avisoSolicitud } from './correo.js';
import { ACCESO_SQL, VISIBLE_SQL, PLANES_DE_PAGO, pagosConfigurados, modoPruebaStripe, crearCheckout, crearPortal, handleWebhook } from './pagos.js';
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
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://cursenda.es,https://gbarnicoat.uk,http://localhost:5173')
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
// Avisos de Stripe: necesitan el cuerpo sin procesar para comprobar la firma
app.post('/api/pagos/webhook', express.raw({ type: 'application/json', limit: '1mb' }), handleWebhook);

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
    "img-src 'self' data:",
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

// Límite de envíos por IP para los formularios públicos
function limitePorIp(max: number, ventanaMs: number, mensaje: string) {
  const intentos = new Map<string, { count: number; resetAt: number }>();
  setInterval(() => {
    const ahora = Date.now();
    for (const [ip, e] of intentos) if (e.resetAt < ahora) intentos.delete(ip);
  }, ventanaMs).unref();
  return (req: any, res: any, next: any) => {
    const ahora = Date.now();
    const clave = req.ip || 'unknown';
    const e = intentos.get(clave);
    if (!e || e.resetAt < ahora) {
      intentos.set(clave, { count: 1, resetAt: ahora + ventanaMs });
      return next();
    }
    if (++e.count > max) return res.status(429).json({ error: mensaje });
    next();
  };
}
const UNA_HORA = 60 * 60 * 1000;
const limiteSolicitudes = limitePorIp(20, UNA_HORA, 'Has enviado demasiadas solicitudes. Inténtalo de nuevo dentro de un rato.');
const limiteAcceso = limitePorIp(5, UNA_HORA, 'Has enviado demasiadas peticiones. Inténtalo de nuevo dentro de un rato.');

const EMAIL_VALIDO = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;
const TELEFONO_VALIDO = /^[+\d\s().-]{6,30}$/;

setInterval(() => {
  const ahora = Date.now();
  for (const [ip, e] of loginAttempts) if (e.resetAt < ahora) loginAttempts.delete(ip);
}, LOGIN_WINDOW_MS).unref();

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

// Datos del centro que ve el panel (sin contraseñas ni claves)
const CAMPOS_CENTRO = `id, nombre, email, plan, plan_pendiente, fecha_renovacion, nombre_contacto, telefono, rol, cif, direccion, web, es_demo, logo,
  suscripcion_estado, prueba_hasta, stripe_subscription_id IS NOT NULL as tiene_suscripcion,
  CASE WHEN ${ACCESO_SQL} THEN 1 ELSE 0 END as acceso`;

async function cargarCentro(id: number) {
  const db = await getDatabase();
  return db.get(`SELECT ${CAMPOS_CENTRO} FROM centros WHERE id = ?`, [id]);
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

    let centro: any;
    let usuario: any;

    if (decoded.tipo === 'miembro') {
      const miembro = await db.get('SELECT id, centro_id, nombre, email, rol FROM miembros WHERE id = ? AND activo = 1 AND password_hash IS NOT NULL', [decoded.id]);
      if (!miembro) {
        res.clearCookie('token');
        return res.status(401).json({ error: 'Usuario no encontrado' });
      }
      centro = await cargarCentro(miembro.centro_id);
      usuario = { tipo: 'miembro', id: miembro.id, nombre: miembro.nombre, email: miembro.email, rol: miembro.rol };
    } else {
      centro = await cargarCentro(decoded.id);
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

// Si se acabó la prueba y no paga, solo puede entrar a "Plan y facturas"
function requiereAcceso(req: any, res: any, next: any) {
  if (!req.centro?.acceso) {
    return res.status(402).json({ error: 'Tu mes de prueba ha terminado. Contrata un plan para seguir usando Cursenda.', codigo: 'sin_suscripcion' });
  }
  next();
}
const puedeEditar = requireRol('propietario', 'gestor');

function datosSesion(centro: any, usuario: any) {
  return { ...centro, usuario };
}

// --- Endpoints de Autenticación ---

async function reforzarContrasena(db: any, tabla: 'centros' | 'miembros', cuenta: any, password: string) {
  if (!hashAntiguo(cuenta.password_hash)) return;
  await db.run(`UPDATE ${tabla} SET password_hash = ? WHERE id = ?`, [hashPassword(password, cuenta.salt), cuenta.id]);
}

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
      await reforzarContrasena(db, 'centros', centro, password);
      loginAttempts.delete(req.ip || 'unknown');
      setSessionCookie(res, { id: centro.id, tipo: 'centro' });
      return res.json(datosSesion(await cargarCentro(centro.id), { tipo: 'centro', id: centro.id, nombre: centro.nombre_contacto || centro.nombre, email: centro.email, rol: 'propietario' }));
    }

    const miembro = await db.get('SELECT * FROM miembros WHERE lower(email) = ? AND activo = 1 AND password_hash IS NOT NULL', [emailLimpio]);
    if (!miembro) {
      // Tarda lo mismo exista o no la cuenta
      verifyPassword(password, 'sin-cuenta', 'v2$00');
      return error();
    }
    if (!verifyPassword(password, miembro.salt, miembro.password_hash)) return error();
    await reforzarContrasena(db, 'miembros', miembro, password);
    loginAttempts.delete(req.ip || 'unknown');

    const centroMiembro = await cargarCentro(miembro.centro_id);
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

// Lo mismo, pero sin sesión contesta null: la web pública lo pregunta en cada visita
app.get('/api/auth/sesion', (req: any, res, next) => {
  if (!req.cookies.token) return res.json(null);
  next();
}, authenticateToken, (req: any, res) => {
  res.json(datosSesion(req.centro, req.usuario));
});

// Pedir recuperar la contraseña: queda apuntado para el admin (todavía no hay envío de emails)
app.post('/api/auth/recuperar', limiteAcceso, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (email.length > 200 || !EMAIL_VALIDO.test(email)) {
    return res.status(400).json({ error: 'Indique un correo electrónico válido' });
  }

  try {
    const db = await getDatabase();
    const pendiente = await db.get('SELECT id FROM peticiones_recuperacion WHERE email = ? AND atendida = 0', [email]);
    if (!pendiente) {
      await db.run('INSERT INTO peticiones_recuperacion (email) VALUES (?)', [email]);
      avisoContrasena(email);
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

    const centro = await cargarCentro(miembro.centro_id);
    setSessionCookie(res, { id: miembro.id, tipo: 'miembro' });
    res.json(datosSesion(centro, { tipo: 'miembro', id: miembro.id, nombre: String(nombre).trim(), email: miembro.email, rol: miembro.rol }));
  } catch (err) {
    res.status(500).json({ error: 'Error al activar la cuenta' });
  }
});

// Solicitud de demo desde la página para centros
app.post('/api/public/demo', limiteAcceso, async (req, res) => {
  const { nombre_centro, nombre_contacto, email, telefono, rgpd } = req.body || {};
  const campos = [nombre_centro, nombre_contacto, email, telefono].map(v => String(v || '').trim());

  if (campos.some(v => !v) || campos.some(v => v.length > 200) || !EMAIL_VALIDO.test(campos[2]) || !TELEFONO_VALIDO.test(campos[3])) {
    return res.status(400).json({ error: 'Por favor, rellene todos los campos obligatorios.' });
  }
  if (!rgpd) {
    return res.status(400).json({ error: 'Debe aceptar la política de privacidad y protección de datos.' });
  }

  try {
    const db = await getDatabase();
    await db.run('INSERT INTO solicitudes_demo (nombre_centro, nombre_contacto, email, telefono) VALUES (?, ?, ?, ?)', campos);
    avisoPeticionAcceso({ nombre_centro: campos[0], nombre_contacto: campos[1], email: campos[2], telefono: campos[3] });
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
  if (String(password).length < PASSWORD_MIN) {
    return res.status(400).json({ error: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres` });
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
      INSERT INTO centros (nombre, email, password_hash, salt, plan, fecha_renovacion, nombre_contacto, telefono, api_token, prueba_hasta)
      VALUES (?, ?, ?, ?, 'starter', ?, ?, ?, ?, datetime('now', '+30 days'))
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
// Textos, precios y datos legales que se cambian desde el panel de administrador.
// Solo se guarda lo cambiado; lo demás lo pone la web por defecto.
app.get('/api/public/ajustes', async (req, res) => {
  try {
    const db = await getDatabase();
    // Los precios no salen aquí: solo los ven los centros con cuenta
    const filas = await db.all("SELECT clave, valor FROM ajustes WHERE clave NOT LIKE 'precio_%'");
    res.json(Object.fromEntries(filas.map((f: any) => [f.clave, f.valor])));
  } catch (err) {
    res.status(500).json({ error: 'Error al cargar los ajustes' });
  }
});

// Precios de los planes, solo con sesión iniciada
app.get('/api/precios', authenticateToken, async (req, res) => {
  try {
    const db = await getDatabase();
    const filas = await db.all("SELECT clave, valor FROM ajustes WHERE clave LIKE 'precio_%'");
    res.json({ precio_starter: '79', precio_pro: '149', ...Object.fromEntries(filas.map((f: any) => [f.clave, f.valor])) });
  } catch (err) {
    res.status(500).json({ error: 'Error al cargar los precios' });
  }
});

app.get('/api/public/cursos', async (req, res) => {
  const { search, categoria, modalidad } = req.query;

  try {
    const db = await getDatabase();
    let query = `SELECT cursos.*, centros.nombre as centro_nombre, centros.es_demo, centros.logo as centro_logo FROM cursos JOIN centros ON cursos.centro_id = centros.id WHERE cursos.estado = 'publicado' AND ${VISIBLE_SQL}`;
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
    const curso = await db.get(`SELECT cursos.*, centros.nombre as centro_nombre, centros.es_demo, centros.logo as centro_logo, centros.web as centro_web FROM cursos JOIN centros ON cursos.centro_id = centros.id WHERE cursos.id = ? AND cursos.estado = 'publicado' AND ${VISIBLE_SQL}`, [id]);

    if (!curso) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    res.json(curso);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el curso' });
  }
});

// Cursos de un centro para el widget que pegan en su propia web (abierto a cualquier web, sin cookies)
// Academias con algún curso a la vista. La demo no cuenta.
app.get('/api/public/academias', async (req, res) => {
  try {
    const db = await getDatabase();
    res.json(await db.all(`
      SELECT centros.id, centros.nombre, centros.logo, centros.web, centros.direccion, COUNT(cursos.id) as cursos
      FROM centros JOIN cursos ON cursos.centro_id = centros.id AND cursos.estado = 'publicado'
      WHERE centros.es_demo IS NOT 1 AND (centros.rol IS NULL OR centros.rol != 'admin') AND ${VISIBLE_SQL}
      GROUP BY centros.id ORDER BY cursos DESC, centros.nombre
    `));
  } catch (err) {
    res.status(500).json({ error: 'Error al cargar los centros' });
  }
});

app.get('/api/public/centros/:id/cursos', async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cache-Control', 'public, max-age=300');
  try {
    const db = await getDatabase();
    const centro = await db.get(`SELECT id, nombre FROM centros WHERE id = ? AND ${ACCESO_SQL} AND (rol IS NULL OR rol != 'admin')`, [req.params.id]);
    if (!centro) return res.status(404).json({ error: 'Centro no encontrado' });
    const cursos = await db.all(`
      SELECT id, titulo, categoria, modalidad, localidad, duracion_horas, plazas, plazas_cubiertas, fecha_inicio
      FROM cursos WHERE centro_id = ? AND estado = 'publicado' ORDER BY id DESC
    `, [centro.id]);
    res.json({ centro: centro.nombre, web: ALLOWED_ORIGINS[0], cursos });
  } catch (err) {
    res.status(500).json({ error: 'Error al cargar los cursos' });
  }
});

// Registrar visita a curso (Público)
app.post('/api/public/cursos/:id/visita', async (req, res) => {
  const { id } = req.params;

  try {
    const db = await getDatabase();
    await db.run("UPDATE cursos SET visitas = visitas + 1 WHERE id = ? AND estado = 'publicado'", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar visita' });
  }
});

// Obtener cursos del centro autenticado
app.get('/api/cursos', authenticateToken, requiereAcceso, async (req: any, res) => {
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
// Datos del curso que la academia puede dejar en blanco
const textoOpcional = (v: any) => String(v ?? '').trim().slice(0, 2000) || null;

// El plan Starter permite 5 cursos activos a la vez. Pausar siempre se puede.
const LIMITE_CURSOS_STARTER = 5;
const AVISO_LIMITE_CURSOS = `El plan Starter permite ${LIMITE_CURSOS_STARTER} cursos activos a la vez. Pausa uno o cambia al plan Pro.`;

// Comprueba los datos de un curso ya completos: evita errores raros y cifras imposibles
const MODALIDADES = ['Online', 'Presencial', 'Mixta'];
const LARGOS_CURSO: Record<string, number> = { titulo: 200, localidad: 120, fecha_inicio: 60, dirigido_a: 120, descripcion: 5000 };

function errorDeCurso(c: any): string | null {
  const horas = Number(c.duracion_horas);
  const plazas = Number(c.plazas);
  const cubiertas = Number(c.plazas_cubiertas || 0);
  if (!Number.isInteger(horas) || horas < 1 || horas > 10000) return 'Las horas tienen que ser un número entero mayor que 0.';
  if (!Number.isInteger(plazas) || plazas < 1 || plazas > 10000) return 'Las plazas tienen que ser un número entero mayor que 0.';
  if (!Number.isInteger(cubiertas) || cubiertas < 0 || cubiertas > plazas) return 'Las plazas cubiertas no pueden ser más que las plazas del curso.';
  if (!MODALIDADES.includes(c.modalidad)) return 'La modalidad no es válida.';
  for (const [campo, max] of Object.entries(LARGOS_CURSO)) {
    if (String(c[campo] ?? '').length > max) return `El campo ${campo.replace('_', ' ')} es demasiado largo (máximo ${max} caracteres).`;
  }
  return null;
}

async function superaLimiteCursos(db: any, centro: any) {
  if (centro.plan !== 'starter' || centro.rol === 'admin') return false;
  const { total } = await db.get(`SELECT COUNT(*) as total FROM cursos WHERE centro_id = ? AND estado = 'publicado'`, [centro.id]);
  return total >= LIMITE_CURSOS_STARTER;
}

app.post('/api/cursos', authenticateToken, puedeEditar, requiereAcceso, async (req: any, res) => {
  const { titulo, categoria, modalidad, localidad, duracion_horas, plazas, plazas_cubiertas, fecha_inicio, dirigido_a, descripcion, aprenderas, requisitos, salidas, horario } = req.body;

  if (!titulo || !categoria || !modalidad || !localidad || !duracion_horas || !plazas || !fecha_inicio || !dirigido_a || !descripcion) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }
  const errorCurso = errorDeCurso(req.body);
  if (errorCurso) return res.status(400).json({ error: errorCurso });

  if (modalidad === 'Presencial' || modalidad === 'Mixta') {
    const locLower = (localidad || '').trim().toLowerCase();
    const invalidTerms = ['online', 'remoto', 'virtual', 'internet', 'no presencial', 'distancia', 'remota', 'pantalla', 'cualquiera'];
    if (invalidTerms.some(term => locLower.includes(term)) || locLower === '') {
      return res.status(400).json({ error: 'Para cursos presenciales o mixtos, pon una localidad real, no "Online" ni "Remoto".' });
    }
  }

  try {
    const db = await getDatabase();
    if (await superaLimiteCursos(db, req.centro)) {
      return res.status(403).json({ error: AVISO_LIMITE_CURSOS });
    }

    const result = await db.run(`
      INSERT INTO cursos (centro_id, titulo, categoria, modalidad, localidad, duracion_horas, plazas, plazas_cubiertas, fecha_inicio, dirigido_a, descripcion, aprenderas, requisitos, salidas, horario)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.centro.id,
      titulo,
      familiaDe(titulo, categoria),
      modalidad,
      localidad,
      parseInt(duracion_horas),
      parseInt(plazas),
      parseInt(plazas_cubiertas || 0),
      fecha_inicio,
      dirigido_a,
      descripcion,
      textoOpcional(aprenderas),
      textoOpcional(requisitos),
      textoOpcional(salidas),
      textoOpcional(horario)
    ]);

    const newCurso = await db.get('SELECT * FROM cursos WHERE id = ?', [result.lastID]);
    res.status(201).json(newCurso);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear el curso' });
  }
});

// Editar curso
app.put('/api/cursos/:id', authenticateToken, puedeEditar, requiereAcceso, async (req: any, res) => {
  const { id } = req.params;
  const { titulo, categoria, modalidad, localidad, duracion_horas, plazas, plazas_cubiertas, fecha_inicio, dirigido_a, descripcion, aprenderas, requisitos, salidas, horario } = req.body;

  try {
    const db = await getDatabase();
    const curso = await db.get('SELECT * FROM cursos WHERE id = ? AND centro_id = ?', [id, req.centro.id]);

    if (!curso) {
      return res.status(404).json({ error: 'Curso no encontrado o sin permisos' });
    }
    const errorCurso = errorDeCurso({ ...curso, ...req.body });
    if (errorCurso) return res.status(400).json({ error: errorCurso });

    const finalModalidad = modalidad !== undefined ? modalidad : curso.modalidad;
    const finalLocalidad = localidad !== undefined ? localidad : curso.localidad;

    if (finalModalidad === 'Presencial' || finalModalidad === 'Mixta') {
      const locLower = (finalLocalidad || '').trim().toLowerCase();
      const invalidTerms = ['online', 'remoto', 'virtual', 'internet', 'no presencial', 'distancia', 'remota', 'pantalla', 'cualquiera'];
      if (invalidTerms.some(term => locLower.includes(term)) || locLower === '') {
        return res.status(400).json({ error: 'Para cursos presenciales o mixtos, pon una localidad real, no "Online" ni "Remoto".' });
      }
    }

    await db.run(`
      UPDATE cursos 
      SET titulo = ?, categoria = ?, modalidad = ?, localidad = ?, duracion_horas = ?, plazas = ?, plazas_cubiertas = ?, fecha_inicio = ?, dirigido_a = ?, descripcion = ?, aprenderas = ?, requisitos = ?, salidas = ?, horario = ?
      WHERE id = ?
    `, [
      titulo || curso.titulo,
      familiaDe(titulo || curso.titulo, categoria || curso.categoria),
      modalidad || curso.modalidad,
      localidad || curso.localidad,
      duracion_horas !== undefined ? parseInt(duracion_horas) : curso.duracion_horas,
      plazas !== undefined ? parseInt(plazas) : curso.plazas,
      plazas_cubiertas !== undefined ? parseInt(plazas_cubiertas) : curso.plazas_cubiertas,
      fecha_inicio || curso.fecha_inicio,
      dirigido_a || curso.dirigido_a,
      descripcion || curso.descripcion,
      aprenderas !== undefined ? textoOpcional(aprenderas) : curso.aprenderas,
      requisitos !== undefined ? textoOpcional(requisitos) : curso.requisitos,
      salidas !== undefined ? textoOpcional(salidas) : curso.salidas,
      horario !== undefined ? textoOpcional(horario) : curso.horario,
      id
    ]);

    const updatedCurso = await db.get('SELECT * FROM cursos WHERE id = ?', [id]);
    res.json(updatedCurso);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar el curso' });
  }
});

// Pausar/Reanudar curso
// Archivar: el curso sale de la web y deja de contar como activo. Al recuperarlo vuelve pausado.
app.post('/api/cursos/:id/archivar', authenticateToken, puedeEditar, requiereAcceso, async (req: any, res) => {
  const archivar = req.body?.archivar !== false;
  try {
    const db = await getDatabase();
    const r = await db.run(`UPDATE cursos SET archivado = ?, estado = 'pausado' WHERE id = ? AND centro_id = ?`, [archivar ? 1 : 0, req.params.id, req.centro.id]);
    if (!r.changes) return res.status(404).json({ error: 'Curso no encontrado' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al archivar el curso' });
  }
});

app.post('/api/cursos/:id/toggle-estado', authenticateToken, puedeEditar, requiereAcceso, async (req: any, res) => {
  const { id } = req.params;

  try {
    const db = await getDatabase();
    const curso = await db.get('SELECT * FROM cursos WHERE id = ? AND centro_id = ?', [id, req.centro.id]);

    if (!curso) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    if (curso.archivado) {
      return res.status(400).json({ error: 'Recupera el curso del archivo antes de publicarlo.' });
    }

    const nuevoEstado = curso.estado === 'publicado' ? 'pausado' : 'publicado';
    if (nuevoEstado === 'publicado' && await superaLimiteCursos(db, req.centro)) {
      return res.status(403).json({ error: AVISO_LIMITE_CURSOS });
    }
    await db.run('UPDATE cursos SET estado = ? WHERE id = ?', [nuevoEstado, id]);

    res.json({ success: true, estado: nuevoEstado });
  } catch (err) {
    res.status(500).json({ error: 'Error al cambiar el estado del curso' });
  }
});

// --- Endpoints de Solicitudes (Leads) ---

// Registrar solicitud (Público - Alumno)
app.post('/api/public/solicitudes', limiteSolicitudes, async (req, res) => {
  const { curso_id, rgpd } = req.body || {};
  const nombre = String(req.body?.nombre ?? '').trim();
  const email = String(req.body?.email ?? '').trim();
  const telefono = String(req.body?.telefono ?? '').trim();

  if (!curso_id || !nombre || !email || !telefono) {
    return res.status(400).json({ error: 'Por favor, rellene todos los campos requeridos' });
  }
  if (!Number.isInteger(Number(curso_id)) || nombre.length > 120) {
    return res.status(400).json({ error: 'Revisa los datos del formulario' });
  }
  if (email.length > 200 || !EMAIL_VALIDO.test(email)) {
    return res.status(400).json({ error: 'El correo no es válido' });
  }
  if (!TELEFONO_VALIDO.test(telefono)) {
    return res.status(400).json({ error: 'El teléfono no es válido' });
  }

  if (!rgpd) {
    return res.status(400).json({ error: 'Debe aceptar la política de privacidad y protección de datos' });
  }

  try {
    const db = await getDatabase();
    const curso = await db.get(`
      SELECT cursos.id, cursos.titulo, centros.id as centro_id, centros.email as centro_email, centros.es_demo, centros.webhook_url, centros.nombre as centro_nombre
      FROM cursos
      JOIN centros ON cursos.centro_id = centros.id
      WHERE cursos.id = ? AND cursos.estado = 'publicado' AND ${VISIBLE_SQL}
    `, [curso_id]);
    
    if (!curso) {
      return res.status(404).json({ error: 'El curso no está disponible para solicitudes' });
    }
    // Nadie va a llamar por un curso de ejemplo: no se recogen datos de gente real
    if (curso.es_demo) {
      return res.status(400).json({ error: 'Este curso es de ejemplo y no admite solicitudes.' });
    }

    // Si ya la pidió con ese correo, no se repite ni se avisa otra vez al centro
    const repetida = await db.get('SELECT id FROM solicitudes WHERE curso_id = ? AND lower(email) = lower(?)', [curso_id, email]);
    if (repetida) {
      return res.status(201).json({ success: true, message: 'Solicitud enviada correctamente' });
    }

    await db.run(`
      INSERT INTO solicitudes (curso_id, nombre, email, telefono, gestionado)
      VALUES (?, ?, ?, ?, 0)
    `, [curso_id, nombre, email, telefono]);

    avisoSolicitud({ id: curso.centro_id, email: curso.centro_email }, curso.titulo);

    // Despachar Webhook si está configurado en el centro
    if (curso.webhook_url && await isSafeWebhookUrl(curso.webhook_url)) {
      fetch(curso.webhook_url, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
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
app.get('/api/solicitudes', authenticateToken, requiereAcceso, async (req: any, res) => {
  try {
    const db = await getDatabase();
    const list = await db.all(`
      SELECT solicitudes.*, cursos.titulo as curso_titulo, cursos.fecha_inicio as curso_fecha 
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
app.post('/api/solicitudes/:id/archivar', authenticateToken, requiereAcceso, async (req: any, res) => {
  const archivar = req.body?.archivar !== false;
  try {
    const db = await getDatabase();
    const r = await db.run(`UPDATE solicitudes SET archivada = ? WHERE id = ? AND curso_id IN (SELECT id FROM cursos WHERE centro_id = ?)`, [archivar ? 1 : 0, req.params.id, req.centro.id]);
    if (!r.changes) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al archivar la solicitud' });
  }
});

app.post('/api/solicitudes/:id/gestionado', authenticateToken, requiereAcceso, async (req: any, res) => {
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
app.put('/api/solicitudes/:id/estado', authenticateToken, requiereAcceso, async (req: any, res) => {
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
app.get('/api/solicitudes/:id/notas', authenticateToken, requiereAcceso, async (req: any, res) => {
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
app.post('/api/solicitudes/:id/notas', authenticateToken, requiereAcceso, async (req: any, res) => {
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
app.get('/api/solicitudes/export', authenticateToken, puedeEditar, requiereAcceso, async (req: any, res) => {
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
      const fecha = new Date(String(sol.fecha_creacion).replace(' ', 'T') + 'Z').toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
      
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

app.get('/api/estadisticas', authenticateToken, requiereAcceso, async (req: any, res) => {
  try {
    const db = await getDatabase();
    
    const countCursos = await db.get("SELECT COUNT(*) as count FROM cursos WHERE centro_id = ? AND estado = 'publicado'", [req.centro.id]);
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
      WHERE cursos.centro_id = ? AND solicitudes.gestionado = 0 AND solicitudes.archivada IS NOT 1
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

// --- Pagos con Stripe ---

// Estado de la suscripción para la pestaña "Plan y facturas"
app.get('/api/pagos/estado', authenticateToken, soloPropietario, async (req: any, res) => {
  const c = req.centro;
  const finPrueba = c.prueba_hasta ? new Date(String(c.prueba_hasta).replace(' ', 'T') + 'Z') : null;
  const diasPrueba = finPrueba ? Math.max(0, Math.ceil((finPrueba.getTime() - Date.now()) / 86400000)) : 0;
  res.json({
    configurado: pagosConfigurados(),
    modo_prueba: modoPruebaStripe(),
    estado: c.suscripcion_estado,
    acceso: !!c.acceso,
    prueba_hasta: c.prueba_hasta,
    dias_prueba: diasPrueba,
    tiene_suscripcion: !!c.tiene_suscripcion,
    plan: c.plan,
    fecha_renovacion: c.fecha_renovacion
  });
});

// Ir a la página de pago de Stripe para contratar un plan
app.post('/api/pagos/checkout', authenticateToken, soloPropietario, async (req: any, res) => {
  const plan = req.body?.plan;
  if (!PLANES_DE_PAGO.includes(plan)) {
    return res.status(400).json({ error: 'Plan no válido' });
  }
  if (!pagosConfigurados()) {
    return res.status(503).json({ error: 'El pago con tarjeta todavía no está activo. Escríbenos para contratar.' });
  }
  if (req.centro.tiene_suscripcion) {
    return res.status(400).json({ error: 'Ya tienes una suscripción. Usa "Gestionar pago" para cambiar de plan.' });
  }
  try {
    res.json({ url: await crearCheckout(req.centro.id, plan, baseUrl(req)) });
  } catch (err: any) {
    console.error('Error creando el pago:', err.message);
    res.status(500).json({ error: 'No se pudo abrir la página de pago. Inténtelo de nuevo.' });
  }
});

// Portal de Stripe para cambiar tarjeta, plan, ver facturas o darse de baja
app.post('/api/pagos/portal', authenticateToken, soloPropietario, async (req: any, res) => {
  if (!pagosConfigurados()) {
    return res.status(503).json({ error: 'Los pagos todavía no están activados.' });
  }
  try {
    res.json({ url: await crearPortal(req.centro.id, baseUrl(req)) });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'No se pudo abrir el portal de pago' });
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
app.get('/api/centro/api-settings', authenticateToken, soloPropietario, requiereAcceso, async (req: any, res) => {
  try {
    const db = await getDatabase();
    const row = await db.get('SELECT webhook_url FROM centros WHERE id = ?', [req.centro.id]);
    res.json({
      webhook_url: row?.webhook_url || ''
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener la configuración de API' });
  }
});

// Regenerar clave API
app.post('/api/centro/api-settings/webhook', authenticateToken, soloPropietario, requiereAcceso, async (req: any, res) => {
  const { webhook_url } = req.body;
  if (webhook_url && !(await isSafeWebhookUrl(webhook_url))) {
    return res.status(400).json({ error: 'La dirección debe empezar por https:// y ser de un servidor público.' });
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
app.put('/api/centro/perfil', authenticateToken, soloPropietario, requiereAcceso, async (req: any, res) => {
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

app.get('/api/equipo', authenticateToken, soloPropietario, requiereAcceso, async (req: any, res) => {
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
app.post('/api/equipo', authenticateToken, soloPropietario, requiereAcceso, async (req: any, res) => {
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
app.put('/api/equipo/:id', authenticateToken, soloPropietario, requiereAcceso, async (req: any, res) => {
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

app.delete('/api/equipo/:id', authenticateToken, soloPropietario, requiereAcceso, async (req: any, res) => {
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
app.post('/api/equipo/:id/enlace-recuperacion', authenticateToken, soloPropietario, requiereAcceso, async (req: any, res) => {
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
  { titulo: 'Convocatoria de inicio (WhatsApp)', tipo: 'whatsapp', texto: '¡Buenas noticias [Nombre]! Tu plaza para el curso "[Curso]" está confirmada. Empezamos el [Fecha]. Por favor, confirma que vienes respondiendo a este mensaje.' }
];

app.get('/api/plantillas', authenticateToken, requiereAcceso, async (req: any, res) => {
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

app.post('/api/plantillas', authenticateToken, puedeEditar, requiereAcceso, async (req: any, res) => {
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

app.put('/api/plantillas/:id', authenticateToken, puedeEditar, requiereAcceso, async (req: any, res) => {
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

app.delete('/api/plantillas/:id', authenticateToken, puedeEditar, requiereAcceso, async (req: any, res) => {
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
    const list = await db.all(`SELECT ${CAMPOS_CENTRO} FROM centros ORDER BY id DESC`);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener los centros' });
  }
});

// Crear una nueva academia
app.post('/api/admin/centros', authenticateAdmin, async (req, res) => {
  const { nombre, email, password, plan, nombre_contacto, telefono } = req.body;

  if (!nombre || !email) {
    return res.status(400).json({ error: 'El nombre y el correo son obligatorios' });
  }

  try {
    const db = await getDatabase();
    
    const exists = await db.get('SELECT id FROM centros WHERE lower(email) = lower(?)', [email])
      || await db.get('SELECT id FROM miembros WHERE lower(email) = lower(?)', [email]);
    if (exists) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    // Sin contraseña: la pone la academia con el enlace que le envía el admin
    const pwdHash = hashPassword(password || crypto.randomBytes(32).toString('hex'), salt);
    const apiToken = 'cursenda_live_' + crypto.randomBytes(16).toString('hex');
    
    const fechaRenovacion = new Date();
    fechaRenovacion.setMonth(fechaRenovacion.getMonth() + 1);

    const result = await db.run(`
      INSERT INTO centros (nombre, email, password_hash, salt, plan, fecha_renovacion, nombre_contacto, telefono, api_token, rol, prueba_hasta)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'centro', datetime('now', '+30 days'))
    `, [nombre, email, pwdHash, salt, plan || 'starter', fechaRenovacion.toISOString(), nombre_contacto || null, telefono || null, apiToken]);

    const newCentro = await db.get('SELECT id, nombre, email, plan, fecha_renovacion, nombre_contacto, telefono, rol FROM centros WHERE id = ?', [result.lastID]);
    res.status(201).json(newCentro);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear el centro' });
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
      return res.status(404).json({ error: 'Centro no encontrado' });
    }

    if (email && String(email).toLowerCase() !== String(centro.email).toLowerCase()) {
      const ocupado = await db.get('SELECT id FROM centros WHERE lower(email) = lower(?)', [email])
        || await db.get('SELECT id FROM miembros WHERE lower(email) = lower(?)', [email]);
      if (ocupado) return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
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
    res.status(500).json({ error: 'Error al actualizar el centro' });
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
      return res.status(404).json({ error: 'Centro no encontrado' });
    }

    await db.run('DELETE FROM centros WHERE id = ?', [id]);
    res.json({ success: true, message: 'Centro eliminado con éxito' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar el centro' });
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
    const errorCurso = errorDeCurso({ ...curso, ...req.body });
    if (errorCurso) return res.status(400).json({ error: errorCurso });
    if (estado === 'publicado' && curso.archivado) {
      return res.status(400).json({ error: 'Recupera el curso del archivo antes de publicarlo.' });
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

// Ampliar la prueba gratis de un centro (por defecto 30 días más desde hoy o desde su fin)
const AJUSTES_EDITABLES: Record<string, number> = {
  portada_titulo: 120, portada_texto: 400, academias_titulo: 120, academias_texto: 500, pie_texto: 300,
  precio_starter: 5, precio_pro: 5, demo_oculta: 1,
  legal_titular: 200, legal_nif: 30, legal_domicilio: 300, legal_email: 200
};

app.put('/api/admin/ajustes', authenticateAdmin, async (req, res) => {
  const cambios = req.body || {};
  const claves = Object.keys(cambios);
  for (const clave of claves) {
    const valor = String(cambios[clave] ?? '').trim();
    if (!(clave in AJUSTES_EDITABLES)) return res.status(400).json({ error: `Ajuste no válido: ${clave}` });
    if (valor.length > AJUSTES_EDITABLES[clave]) return res.status(400).json({ error: `El campo ${clave} es demasiado largo` });
    if (clave.startsWith('precio_') && valor && !/^\d+$/.test(valor)) return res.status(400).json({ error: 'El precio tiene que ser un número entero' });
    if (clave === 'legal_email' && valor && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) return res.status(400).json({ error: 'El correo no es válido' });
  }

  try {
    const db = await getDatabase();
    const antes = Object.fromEntries((await db.all('SELECT clave, valor FROM ajustes')).map((f: any) => [f.clave, f.valor]));
    let legalCambiado = false;
    for (const clave of claves) {
      const valor = String(cambios[clave] ?? '').trim();
      if (clave.startsWith('legal_') && valor !== (antes[clave] ?? '')) legalCambiado = true;
      // Vacío: vuelve al texto por defecto
      if (valor) await db.run('INSERT INTO ajustes (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor', [clave, valor]);
      else await db.run('DELETE FROM ajustes WHERE clave = ?', [clave]);
    }
    if (legalCambiado) {
      const hoy = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });
      await db.run("INSERT INTO ajustes (clave, valor) VALUES ('legal_actualizado', ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor", [hoy]);
    }
    const filas = await db.all('SELECT clave, valor FROM ajustes');
    res.json(Object.fromEntries(filas.map((f: any) => [f.clave, f.valor])));
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar los ajustes' });
  }
});

app.post('/api/admin/cursos/:id/archivar', authenticateAdmin, async (req, res) => {
  try {
    const db = await getDatabase();
    await db.run(`UPDATE cursos SET archivado = ?, estado = 'pausado' WHERE id = ?`, [req.body?.archivar !== false ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al archivar el curso' });
  }
});

app.post('/api/admin/solicitudes/:id/archivar', authenticateAdmin, async (req, res) => {
  try {
    const db = await getDatabase();
    await db.run('UPDATE solicitudes SET archivada = ? WHERE id = ?', [req.body?.archivar !== false ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al archivar la solicitud' });
  }
});

app.delete('/api/admin/solicitudes/:id', authenticateAdmin, async (req, res) => {
  try {
    const db = await getDatabase();
    await db.run('DELETE FROM notas_contacto WHERE solicitud_id = ?', [req.params.id]);
    await db.run('DELETE FROM solicitudes WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar la solicitud' });
  }
});

app.post('/api/admin/centros/:id/ampliar-prueba', authenticateAdmin, async (req, res) => {
  const dias = Math.min(365, Math.max(1, parseInt(req.body?.dias) || 30));
  try {
    const db = await getDatabase();
    const centro = await db.get("SELECT id, stripe_subscription_id FROM centros WHERE id = ? AND (rol IS NULL OR rol != 'admin')", [req.params.id]);
    if (!centro) return res.status(404).json({ error: 'Centro no encontrado' });
    if (centro.stripe_subscription_id) {
      return res.status(400).json({ error: 'Este centro ya paga con Stripe; la prueba se cambia desde Stripe.' });
    }
    await db.run(`
      UPDATE centros SET suscripcion_estado = 'prueba', aviso_prueba = 0,
        prueba_hasta = datetime(MAX(COALESCE(prueba_hasta, datetime('now')), datetime('now')), '+' || ? || ' days')
      WHERE id = ?
    `, [dias, centro.id]);
    res.json(await db.get(`SELECT ${CAMPOS_CENTRO} FROM centros WHERE id = ?`, [centro.id]));
  } catch (err) {
    res.status(500).json({ error: 'Error al ampliar la prueba' });
  }
});

// Dejar la cuenta demo como nueva (antes de enseñarla en un colegio)
app.post('/api/admin/reiniciar-demo', authenticateAdmin, async (req, res) => {
  try {
    const ok = await reiniciarDemo(await getDatabase());
    if (!ok) return res.status(404).json({ error: 'No hay ninguna cuenta demo' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo reiniciar la demo' });
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

// Crea la cuenta de una academia que ha pedido acceso y da el enlace para poner su contraseña
app.post('/api/admin/demos/:id/crear-cuenta', authenticateAdmin, async (req, res) => {
  try {
    const db = await getDatabase();
    const demo = await db.get('SELECT * FROM solicitudes_demo WHERE id = ?', [req.params.id]);
    if (!demo) return res.status(404).json({ error: 'Petición no encontrada' });

    const existe = await db.get('SELECT id FROM centros WHERE lower(email) = lower(?)', [demo.email])
      || await db.get('SELECT id FROM miembros WHERE lower(email) = lower(?)', [demo.email]);
    if (existe) return res.status(400).json({ error: 'Ya hay una cuenta con ese correo' });

    const salt = crypto.randomBytes(16).toString('hex');
    const fechaRenovacion = new Date();
    fechaRenovacion.setMonth(fechaRenovacion.getMonth() + 1);
    const nuevo = await db.run(`
      INSERT INTO centros (nombre, email, password_hash, salt, plan, fecha_renovacion, nombre_contacto, telefono, api_token, rol, prueba_hasta)
      VALUES (?, ?, ?, ?, 'starter', ?, ?, ?, ?, 'centro', datetime('now', '+30 days'))
    `, [demo.nombre_centro, demo.email, hashPassword(crypto.randomBytes(32).toString('hex'), salt), salt, fechaRenovacion.toISOString(), demo.nombre_contacto, demo.telefono, 'cursenda_live_' + crypto.randomBytes(16).toString('hex')]);

    await db.run("UPDATE solicitudes_demo SET estado = 'contactada' WHERE id = ?", [demo.id]);
    res.status(201).json({ enlace: await crearEnlaceRecuperacion(req, 'centro', nuevo.lastID as number) });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear la cuenta' });
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
    if (!centro) return res.status(404).json({ error: 'Centro no encontrado' });
    res.json({ enlace: await crearEnlaceRecuperacion(req, 'centro', centro.id) });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear el enlace' });
  }
});

// Logo de la academia: solo PNG, JPG o WebP, comprobando el contenido real del archivo
const CARPETA_LOGOS = path.join(path.dirname(process.env.CURSENDA_DB_PATH || './cursenda.db'), 'logos');
const formatoLogo = (b: Buffer) => {
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
};
const borrarLogo = (nombre?: string | null) => {
  if (nombre && /^[\w-]+\.(png|jpg|webp)$/.test(nombre)) fs.rmSync(path.join(CARPETA_LOGOS, nombre), { force: true });
};

app.put('/api/centro/logo', authenticateToken, soloPropietario, requiereAcceso,
  express.raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: '200kb' }), async (req: any, res) => {
    const formato = Buffer.isBuffer(req.body) ? formatoLogo(req.body) : null;
    if (!formato) return res.status(400).json({ error: 'El logo tiene que ser PNG, JPG o WebP.' });
    try {
      const db = await getDatabase();
      const actual = await db.get('SELECT logo FROM centros WHERE id = ?', [req.centro.id]);
      fs.mkdirSync(CARPETA_LOGOS, { recursive: true, mode: 0o700 });
      const nombre = `${req.centro.id}-${crypto.randomBytes(6).toString('hex')}.${formato}`;
      fs.writeFileSync(path.join(CARPETA_LOGOS, nombre), req.body, { mode: 0o600 });
      await db.run('UPDATE centros SET logo = ? WHERE id = ?', [nombre, req.centro.id]);
      borrarLogo(actual?.logo);
      res.json({ logo: nombre });
    } catch (err) {
      res.status(500).json({ error: 'No se ha podido guardar el logo.' });
    }
  });

app.delete('/api/centro/logo', authenticateToken, soloPropietario, requiereAcceso, async (req: any, res) => {
  try {
    const db = await getDatabase();
    const actual = await db.get('SELECT logo FROM centros WHERE id = ?', [req.centro.id]);
    await db.run('UPDATE centros SET logo = NULL WHERE id = ?', [req.centro.id]);
    borrarLogo(actual?.logo);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'No se ha podido quitar el logo.' });
  }
});

app.get('/logos/:archivo', (req, res) => {
  const archivo = req.params.archivo;
  if (!/^[\w-]+\.(png|jpg|webp)$/.test(archivo)) return res.status(404).end();
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cache-Control', 'public, max-age=86400');
  res.sendFile(archivo, { root: path.resolve(CARPETA_LOGOS) }, (err) => { if (err && !res.headersSent) res.status(404).end(); });
});

// --- Servir archivos estáticos del Frontend en Producción ---
const distPath = path.resolve(process.cwd(), 'dist');
// index: false para que "/" pase por las metaetiquetas de abajo
app.use(express.static(distPath, { index: false }));

// --- Títulos, descripciones y vistas previas (WhatsApp, LinkedIn, Google) ---

const escapeHtml = (texto: string) => String(texto ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const recortar = (texto: string, max = 160) => {
  const limpio = String(texto ?? '').replace(/\s+/g, ' ').trim();
  return limpio.length > max ? limpio.slice(0, max - 1).trimEnd() + '…' : limpio;
};

const IMAGENES_CATEGORIA: Record<string, string> = {
  'Informática y comunicaciones': 'informatica', 'Sanidad': 'sanidad', 'Servicios socioculturales y a la comunidad': 'sanidad',
  'Comercio y marketing': 'logistica', 'Hostelería y turismo': 'hosteleria', 'Administración y gestión': 'administracion'
};

let plantillaHtml: string | null = null;
function leerPlantilla() {
  if (!plantillaHtml || !IS_PRODUCTION) {
    plantillaHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf8');
  }
  return plantillaHtml;
}

type Meta = { titulo: string; descripcion: string; ruta: string; imagen?: string; tipo?: string; jsonld?: any; noindex?: boolean; estado?: number; enlaces?: { texto: string; ruta: string }[] };

function paginaHtml(meta: Meta) {
  const web = ALLOWED_ORIGINS[0];
  const url = web + meta.ruta;
  const imagen = web + (meta.imagen || '/images/og-cursenda.jpg');
  const etiquetas = [
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta property="og:type" content="${meta.tipo || 'website'}" />`,
    `<meta property="og:site_name" content="Cursenda" />`,
    `<meta property="og:locale" content="es_ES" />`,
    `<meta property="og:title" content="${escapeHtml(meta.titulo)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.descripcion)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${escapeHtml(imagen)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    meta.noindex ? '<meta name="robots" content="noindex" />' : '',
    // El JSON va escapado para que no pueda cerrar la etiqueta <script>
    ...(meta.jsonld ? [meta.jsonld].flat() : []).map((d: any) => `<script type="application/ld+json">${JSON.stringify(d).replace(/</g, '\\u003c')}</script>`)
  ].filter(Boolean).join('\n    ');

  return leerPlantilla()
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(meta.titulo)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(meta.descripcion)}" />`)
    .replace('</head>', `    ${etiquetas}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root"></div>\n    <noscript><h1>${escapeHtml(meta.titulo)}</h1><p>${escapeHtml(meta.descripcion)}</p>${(meta.enlaces || []).map(e => `<p><a href="${escapeHtml(e.ruta)}">${escapeHtml(e.texto)}</a></p>`).join('')}</noscript>`);
}

const META_PORTADA: Meta = {
  titulo: 'Cursos gratis subvencionados | Cursenda',
  descripcion: 'Cursos gratuitos subvencionados con dinero público que publican los centros de formación. Pide plaza y el centro te llama.',
  ruta: '/',
  jsonld: [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Cursenda',
      url: `${ALLOWED_ORIGINS[0]}/`,
      inLanguage: 'es-ES',
      potentialAction: { '@type': 'SearchAction', target: `${ALLOWED_ORIGINS[0]}/cursos?q={busqueda}`, 'query-input': 'required name=busqueda' }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Cursenda',
      url: `${ALLOWED_ORIGINS[0]}/`,
      logo: `${ALLOWED_ORIGINS[0]}/logo/logo.png`,
      description: 'Portal independiente donde los centros de formación publican sus cursos subvencionados.'
    }
  ]
};

async function metaDe(ruta: string): Promise<Meta> {
  if (ruta === '/centros-de-formacion') {
    const db = await getDatabase();
    const alguno = await db.get(`SELECT centros.id FROM centros JOIN cursos ON cursos.centro_id = centros.id AND cursos.estado = 'publicado'
      WHERE centros.es_demo IS NOT 1 AND (centros.rol IS NULL OR centros.rol != 'admin') AND ${VISIBLE_SQL} LIMIT 1`);
    return { titulo: 'Centros de formación | Cursenda', descripcion: 'Los centros de formación que publican sus cursos subvencionados en Cursenda.', ruta, noindex: !alguno };
  }

  const academia = ruta.match(/^\/centro-de-formacion\/(\d+)$/);
  if (academia) {
    const db = await getDatabase();
    const a = await db.get(`SELECT centros.nombre FROM centros JOIN cursos ON cursos.centro_id = centros.id AND cursos.estado = 'publicado'
      WHERE centros.id = ? AND centros.es_demo IS NOT 1 AND ${VISIBLE_SQL}`, [academia[1]]);
    if (a) return { titulo: `${a.nombre} | Cursenda`, descripcion: `Cursos de ${a.nombre} publicados en Cursenda.`, ruta };
  }

  if (ruta === '/como-funciona') {
    return { titulo: 'Cómo funcionan los cursos subvencionados | Cursenda', descripcion: 'Quién puede apuntarse, qué es un certificado profesional y qué requisitos pide cada nivel, con enlaces a las fuentes oficiales.', ruta };
  }

  const sector = ruta.match(/^\/cursos\/([a-z0-9-]+)$/);
  if (sector) {
    const nombre = NOMBRES_SECTORES.find(n => slugSector(n) === sector[1]);
    if (!nombre) return { titulo: 'Página no encontrada | Cursenda', descripcion: META_PORTADA.descripcion, ruta, noindex: true, estado: 404 };
    const db = await getDatabase();
    const lista = await db.all(`SELECT cursos.id, cursos.titulo FROM cursos JOIN centros ON cursos.centro_id = centros.id
      WHERE cursos.categoria = ? AND cursos.estado = 'publicado' AND centros.es_demo IS NOT 1 AND ${VISIBLE_SQL}`, [nombre]);
    return {
      titulo: `Cursos gratis de ${nombre.toLowerCase()} | Cursenda`,
      descripcion: recortar(`Cursos subvencionados de ${nombre.toLowerCase()} que publican los centros de formación. Consulta fechas y plazas, y pide plaza gratis.`),
      ruta,
      // Sin cursos reales no se ofrece a Google: sería una página vacía
      noindex: lista.length === 0,
      enlaces: lista.map((c: any) => ({ texto: c.titulo, ruta: `/curso/${c.id}` }))
    };
  }

  if (ruta === '/cursos') {
    return { titulo: 'Cursos gratis | Cursenda', descripcion: 'Todos los cursos gratuitos publicados en Cursenda, por sector, modalidad, localidad y fecha de inicio.', ruta };
  }

  if (ruta === '/centros') {
    return {
      titulo: 'Publica tus cursos subvencionados | Cursenda para centros',
      descripcion: 'Publica tus cursos subvencionados y recibe en un panel a la gente que pide plaza, con su teléfono. El primer mes es gratis y sin tarjeta.',
      ruta,
      imagen: '/images/og-centros.jpg'
    };
  }

  const legal: Record<string, string> = { '/legal/aviso-legal': 'Aviso legal', '/legal/privacidad': 'Política de privacidad', '/legal/cookies': 'Política de cookies' };
  if (legal[ruta]) {
    return { titulo: `${legal[ruta]} | Cursenda`, descripcion: `${legal[ruta]} de Cursenda.`, ruta };
  }

  if (ruta.startsWith('/centros/')) {
    return { titulo: 'Entrar al panel | Cursenda', descripcion: 'Panel de gestión de cursos y solicitudes para centros de formación.', ruta, noindex: true };
  }

  const curso = ruta.match(/^\/curso\/(\d+)$/);
  if (curso) {
    const db = await getDatabase();
    const c = await db.get(`
      SELECT cursos.*, centros.nombre as centro_nombre, centros.es_demo FROM cursos JOIN centros ON cursos.centro_id = centros.id
      WHERE cursos.id = ? AND cursos.estado = 'publicado' AND ${VISIBLE_SQL}
    `, [curso[1]]);
    if (c) {
      const modos: Record<string, string> = { Online: 'Online', Presencial: 'Onsite', Mixta: 'Blended' };
      const nombre = c.titulo.replace(/^[A-Z]{4}\d{4}\s*[-–]\s*/, '');
      const dondeTitulo = c.modalidad === 'Online' ? 'online' : `en ${c.localidad}`;
      const web = ALLOWED_ORIGINS[0];
      return {
        titulo: `${nombre}: curso gratis ${dondeTitulo} | Cursenda`,
        descripcion: recortar(`Curso subvencionado de ${c.duracion_horas} horas, ${c.modalidad === 'Online' ? 'online' : `${c.modalidad === 'Mixta' ? 'mixto' : 'presencial'} en ${c.localidad}`}. Lo imparte ${c.centro_nombre}. Empieza: ${c.fecha_inicio}.`),
        ruta,
        tipo: 'article',
        // Los cursos de ejemplo no son reales: Google no debe ofrecerlos
        noindex: !!c.es_demo,
        imagen: `/images/og/${IMAGENES_CATEGORIA[c.categoria] || 'generica'}.jpg`,
        jsonld: c.es_demo ? undefined : [
          {
            '@context': 'https://schema.org',
            '@type': 'Course',
            name: nombre,
            description: recortar(c.descripcion, 500),
            provider: { '@type': 'Organization', name: c.centro_nombre },
            offers: { '@type': 'Offer', price: 0, priceCurrency: 'EUR', category: 'Free' },
            hasCourseInstance: {
              '@type': 'CourseInstance',
              courseMode: modos[c.modalidad] || c.modalidad,
              ...(c.modalidad === 'Online' ? {} : { location: c.localidad }),
              courseWorkload: `PT${c.duracion_horas}H`
            }
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Cursos', item: `${web}/cursos` },
              { '@type': 'ListItem', position: 2, name: c.categoria, item: `${web}/cursos/${slugSector(c.categoria)}` },
              { '@type': 'ListItem', position: 3, name: nombre }
            ]
          }
        ],
        enlaces: [{ texto: `Más cursos de ${c.categoria}`, ruta: `/cursos/${slugSector(c.categoria)}` }]
      };
    }
    return { titulo: 'Curso no disponible | Cursenda', descripcion: 'Este curso ya no está disponible.', ruta, noindex: true, estado: 404 };
  }

  if (ruta === '/') return META_PORTADA;
  return { titulo: 'Página no encontrada | Cursenda', descripcion: META_PORTADA.descripcion, ruta, noindex: true, estado: 404 };
}

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nDisallow: /centros/\nDisallow: /api/\n\nSitemap: ${ALLOWED_ORIGINS[0]}/sitemap.xml\n`);
});

app.get('/sitemap.xml', async (req, res) => {
  try {
    const db = await getDatabase();
    const reales = await db.all(`SELECT cursos.id, cursos.categoria, cursos.centro_id FROM cursos JOIN centros ON cursos.centro_id = centros.id
      WHERE cursos.estado = 'publicado' AND centros.es_demo IS NOT 1 AND ${VISIBLE_SQL}`);
    const rutas = ['/', '/cursos', '/como-funciona', '/centros', '/legal/aviso-legal', '/legal/privacidad', '/legal/cookies',
      ...(reales.length ? ['/centros-de-formacion'] : []),
      ...[...new Set(reales.map((c: any) => `/cursos/${slugSector(c.categoria)}`))],
      ...[...new Set(reales.map((c: any) => `/centro-de-formacion/${c.centro_id}`))],
      ...reales.map((c: any) => `/curso/${c.id}`)];
    const urls = rutas.map(r => `  <url><loc>${escapeHtml(ALLOWED_ORIGINS[0] + r)}</loc></url>`).join('\n');
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  } catch (err) {
    res.status(500).send('');
  }
});

// Cualquier otra ruta devuelve la aplicación React con sus metaetiquetas
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api/') || (req.method !== 'GET' && req.method !== 'HEAD')) {
    return next();
  }
  // /cursos/ y /cursos son la misma página
  if (/^\/[^/].*\/$/.test(req.path) && !req.path.includes('//')) {
    const consulta = req.originalUrl.slice(req.path.length);
    return res.redirect(301, req.path.replace(/\/$/, '') + consulta);
  }
  try {
    const meta = await metaDe(req.path);
    res.status(meta.estado || 200).type('html').send(paginaHtml(meta));
  } catch (err) {
    res.sendFile(path.join(distPath, 'index.html'));
  }
});

// Cualquier otro error de la API contesta en JSON, nunca con una página suelta
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'No encontrado' });
});

app.use((err: any, req: any, res: any, next: any) => {
  if (res.headersSent) return next(err);
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'El archivo o el texto es demasiado grande.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Los datos enviados no son válidos.' });
  console.error('Error sin controlar:', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// La cuenta demo se reinicia cada noche
programarReinicioDemo(getDatabase);

// Cumple los plazos de la política de privacidad: solicitudes 2 años, peticiones de acceso 1 año
async function tareasDiarias() {
  try {
    const db = await getDatabase();
    await db.run("DELETE FROM notas_contacto WHERE solicitud_id IN (SELECT id FROM solicitudes WHERE fecha_creacion < datetime('now', '-2 years'))");
    await db.run("DELETE FROM solicitudes WHERE fecha_creacion < datetime('now', '-2 years')");
    await db.run("DELETE FROM solicitudes_demo WHERE fecha_creacion < datetime('now', '-1 year')");

    // Aviso a la academia cuando le quedan 7 días de prueba y el último día
    const enPrueba = await db.all(`SELECT id, email, aviso_prueba, CAST(julianday(prueba_hasta) - julianday('now') + 0.999 AS INTEGER) as dias FROM centros
      WHERE suscripcion_estado = 'prueba' AND es_demo IS NOT 1 AND (rol IS NULL OR rol != 'admin') AND stripe_subscription_id IS NULL
      AND prueba_hasta > datetime('now') AND prueba_hasta <= datetime('now', '+7 days')`);
    for (const c of enPrueba) {
      const tramo = c.dias <= 1 ? 1 : 7;
      if (c.aviso_prueba === tramo || (c.aviso_prueba === 1 && tramo === 7)) continue;
      avisoPrueba(c.email, c.dias);
      await db.run('UPDATE centros SET aviso_prueba = ? WHERE id = ?', [tramo, c.id]);
    }
  } catch (err: any) {
    console.error('Error borrando datos caducados:', err.message);
  }
}
tareasDiarias();
setInterval(tareasDiarias, 6 * 60 * 60 * 1000);

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
