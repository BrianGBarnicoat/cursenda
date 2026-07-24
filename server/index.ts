import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { getDatabase, verifyPassword } from './db.js';
import crypto from 'crypto';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'cursenda_secret_key_2026_jwt_auth';

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Middleware de autenticación
async function authenticateToken(req: any, res: any, next: any) {
  const token = req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Sesión no iniciada' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
    const db = await getDatabase();
    const centro = await db.get('SELECT id, nombre, email, plan, plan_pendiente, fecha_renovacion, nombre_contacto, telefono FROM centros WHERE id = ?', [decoded.id]);
    
    if (!centro) {
      return res.status(401).json({ error: 'Centro no encontrado' });
    }

    req.centro = centro;
    next();
  } catch (err) {
    res.clearCookie('token');
    return res.status(403).json({ error: 'Sesión inválida o expirada' });
  }
}

// --- Endpoints de Autenticación ---

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña obligatorios' });
  }

  try {
    const db = await getDatabase();
    const centro = await db.get('SELECT * FROM centros WHERE email = ?', [email]);

    if (!centro) {
      return res.status(401).json({ error: 'Las credenciales introducidas no son correctas' });
    }

    const isValid = verifyPassword(password, centro.salt, centro.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Las credenciales introducidas no son correctas' });
    }

    const token = jwt.sign({ id: centro.id, email: centro.email }, JWT_SECRET, { expiresIn: '1d' });
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 día
    });

    res.json({
      id: centro.id,
      nombre: centro.nombre,
      email: centro.email,
      plan: centro.plan,
      plan_pendiente: centro.plan_pendiente,
      fecha_renovacion: centro.fecha_renovacion,
      rol: centro.rol
    });
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

app.get('/api/auth/me', authenticateToken, (req: any, res) => {
  res.json(req.centro);
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
    const pwdHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
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
      SELECT curso_id, COUNT(*) as count 
      FROM solicitudes 
      GROUP BY curso_id
    `);

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
app.post('/api/cursos', authenticateToken, async (req: any, res) => {
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
app.put('/api/cursos/:id', authenticateToken, async (req: any, res) => {
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
app.post('/api/cursos/:id/toggle-estado', authenticateToken, async (req: any, res) => {
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
    if (curso.webhook_url) {
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
app.get('/api/solicitudes/export', authenticateToken, async (req: any, res) => {
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
      
      // Limpiar texto para evitar romper CSV
      const nombre = sol.nombre.replace(/;/g, ',');
      const email = sol.email.replace(/;/g, ',');
      const telefono = sol.telefono.replace(/;/g, ',');
      const curso = sol.curso_titulo.replace(/;/g, ',');

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
app.post('/api/plan/cambio', authenticateToken, async (req: any, res) => {
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
app.post('/api/plan/cancelar-cambio', authenticateToken, async (req: any, res) => {
  try {
    const db = await getDatabase();
    await db.run('UPDATE centros SET plan_pendiente = NULL WHERE id = ?', [req.centro.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al cancelar la solicitud' });
  }
});

// Obtener facturas
app.get('/api/facturas', authenticateToken, async (req: any, res) => {
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
app.get('/api/centro/api-settings', authenticateToken, async (req: any, res) => {
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
app.post('/api/centro/api-settings/regenerate', authenticateToken, async (req: any, res) => {
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
app.post('/api/centro/api-settings/webhook', authenticateToken, async (req: any, res) => {
  const { webhook_url } = req.body;
  try {
    const db = await getDatabase();
    await db.run('UPDATE centros SET webhook_url = ? WHERE id = ?', [webhook_url || null, req.centro.id]);
    res.json({ success: true, webhook_url: webhook_url || '' });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar la URL de webhook' });
  }
});

// Middleware para verificar que el usuario autenticado es administrador
async function authenticateAdmin(req: any, res: any, next: any) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Sesión no iniciada' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
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
    
    const exists = await db.get('SELECT id FROM centros WHERE email = ?', [email]);
    if (exists) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const pwdHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
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
app.listen(PORT, () => {
  console.log(`Servidor de Cursenda corriendo en http://localhost:${PORT}`);
});
