import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import crypto from 'crypto';

let dbInstance: Database | null = null;

function hashPassword(password: string, salt: string): string {
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512');
  return hash.toString('hex');
}

export async function getDatabase(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = path.resolve(process.cwd(), 'cursenda.db');
  
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Habilitar claves foráneas
  await db.run('PRAGMA foreign_keys = ON');

  // Crear tablas
  await db.exec(`
    CREATE TABLE IF NOT EXISTS centros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      plan TEXT CHECK(plan IN ('starter', 'pro', 'custom')) DEFAULT 'starter',
      plan_pendiente TEXT CHECK(plan_pendiente IN ('starter', 'pro', 'custom', NULL)) DEFAULT NULL,
      fecha_renovacion DATETIME NOT NULL,
      nombre_contacto TEXT,
      telefono TEXT
    );

    CREATE TABLE IF NOT EXISTS cursos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      centro_id INTEGER REFERENCES centros(id) ON DELETE CASCADE,
      titulo TEXT NOT NULL,
      categoria TEXT NOT NULL,
      modalidad TEXT NOT NULL,
      localidad TEXT NOT NULL,
      duracion_horas INTEGER NOT NULL,
      plazas INTEGER NOT NULL,
      plazas_cubiertas INTEGER DEFAULT 0,
      fecha_inicio TEXT NOT NULL,
      dirigido_a TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      visitas INTEGER DEFAULT 0,
      estado TEXT CHECK(estado IN ('publicado', 'pausado')) DEFAULT 'publicado'
    );

    CREATE TABLE IF NOT EXISTS solicitudes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      curso_id INTEGER REFERENCES cursos(id) ON DELETE CASCADE,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL,
      telefono TEXT NOT NULL,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      gestionado INTEGER CHECK(gestionado IN (0, 1)) DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS notas_contacto (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      solicitud_id INTEGER REFERENCES solicitudes(id) ON DELETE CASCADE,
      texto TEXT NOT NULL,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS facturas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      centro_id INTEGER REFERENCES centros(id) ON DELETE CASCADE,
      numero TEXT NOT NULL,
      fecha TEXT NOT NULL,
      importe REAL NOT NULL,
      estado TEXT CHECK(estado IN ('pagada', 'pendiente')) DEFAULT 'pagada'
    );

    CREATE TABLE IF NOT EXISTS invitaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      token TEXT UNIQUE NOT NULL,
      usada INTEGER CHECK(usada IN (0, 1)) DEFAULT 0
    );
  `);

  // Migraciones de esquema
  try {
    await db.run('ALTER TABLE centros ADD COLUMN api_token TEXT');
  } catch (_) {}
  try {
    await db.run('ALTER TABLE centros ADD COLUMN webhook_url TEXT');
  } catch (_) {}

  // Semilla de datos si la base de datos está vacía
  const countCentros = await db.get('SELECT COUNT(*) as count FROM centros');
  if (countCentros && (countCentros as any).count === 0) {
    const salt = crypto.randomBytes(16).toString('hex');
    const pwdHash = hashPassword('demo123', salt);
    const demoApiToken = 'cursenda_live_' + crypto.randomBytes(16).toString('hex');
    
    const fechaRenovacion = new Date();
    fechaRenovacion.setMonth(fechaRenovacion.getMonth() + 1);

    // Insertar Centro Demo
    const resultCentro = await db.run(`
      INSERT INTO centros (nombre, email, password_hash, salt, plan, fecha_renovacion, nombre_contacto, telefono, api_token)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'Centro de Formación Tecnológica de Madrid',
      'demo@cursenda.es',
      pwdHash,
      salt,
      'starter',
      fechaRenovacion.toISOString(),
      'Brian Barnicoat',
      '600112233',
      demoApiToken
    ]);

    const centroId = resultCentro.lastID;

    // Insertar Cursos Demo (Certificados Oficiales del SEPE)
    const resultCurso1 = await db.run(`
      INSERT INTO cursos (centro_id, titulo, categoria, modalidad, localidad, duracion_horas, plazas, plazas_cubiertas, fecha_inicio, dirigido_a, descripcion, visitas, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      centroId,
      'IFCD0210 - Desarrollo de Aplicaciones con Tecnologías Web',
      'Informática',
      'Online',
      'Madrid / Remoto',
      510,
      25,
      12,
      '15 Septiembre 2026',
      'Desempleados',
      'Aprenda a desarrollar aplicaciones web modernas desde el frontend con React y JavaScript hasta el backend con Node.js y bases de datos relacionales. Curso oficial subvencionado con titulación oficial.',
      184,
      'publicado'
    ]);

    const resultCurso2 = await db.run(`
      INSERT INTO cursos (centro_id, titulo, categoria, modalidad, localidad, duracion_horas, plazas, plazas_cubiertas, fecha_inicio, dirigido_a, descripcion, visitas, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      centroId,
      'ADGD0210 - Creación y Gestión de Microempresas',
      'Administración',
      'Mixta',
      'Móstoles',
      520,
      20,
      19,
      '1 Octubre 2026',
      'Todos',
      'Capacitación oficial para planificar, dirigir y gestionar pequeñas y medianas empresas o proyectos de autoempleo. Incluye contabilidad, fiscalidad, recursos humanos y marketing.',
      98,
      'publicado'
    ]);

    const resultCurso3 = await db.run(`
      INSERT INTO cursos (centro_id, titulo, categoria, modalidad, localidad, duracion_horas, plazas, plazas_cubiertas, fecha_inicio, dirigido_a, descripcion, visitas, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      centroId,
      'COML0309 - Organización y Gestión de Almacenes',
      'Logística',
      'Presencial',
      'Alcalá de Henares',
      390,
      15,
      5,
      'Inmediata',
      'Ocupados',
      'Formación técnica avanzada en la optimización de flujos de almacén, control de existencias, gestión de stock, prevención de riesgos y manejo de herramientas informáticas SGA.',
      45,
      'pausado'
    ]);

    const resultCurso4 = await db.run(`
      INSERT INTO cursos (centro_id, titulo, categoria, modalidad, localidad, duracion_horas, plazas, plazas_cubiertas, fecha_inicio, dirigido_a, descripcion, visitas, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      centroId,
      'HOTR0608 - Servicios de Restaurante y Sumillería',
      'Hostelería',
      'Presencial',
      'Madrid Centro',
      580,
      18,
      8,
      '10 Noviembre 2026',
      'Todos',
      'Capacitación práctica para profesionales de sala. Módulos de coctelería avanzada, cata de vinos, maridaje, protocolo de servicio internacional y gestión de eventos de restauración.',
      62,
      'publicado'
    ]);

    const resultCurso5 = await db.run(`
      INSERT INTO cursos (centro_id, titulo, categoria, modalidad, localidad, duracion_horas, plazas, plazas_cubiertas, fecha_inicio, dirigido_a, descripcion, visitas, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      centroId,
      'SANT0208 - Atención Sociosanitaria a Personas Dependientes en Instituciones Sociales',
      'Sanidad',
      'Presencial',
      'Fuenlabrada',
      450,
      20,
      15,
      '15 Octubre 2026',
      'Todos',
      'Certificado de profesionalidad obligatorio para trabajar en residencias y centros de día. Cuidados físicos, higiene, alimentación, atención psicosocial y primeros auxilios en instituciones sociales.',
      112,
      'publicado'
    ]);

    const curso1Id = resultCurso1.lastID;
    const curso2Id = resultCurso2.lastID;

    // Insertar Solicitudes Demo
    const resSol1 = await db.run(`
      INSERT INTO solicitudes (curso_id, nombre, email, telefono, fecha_creacion, gestionado)
      VALUES (?, ?, ?, ?, datetime('now', '-1 day'), 1)
    `, [curso1Id, 'Sofía Martínez', 'sofia.mtz@gmail.com', '612345678']);

    const resSol2 = await db.run(`
      INSERT INTO solicitudes (curso_id, nombre, email, telefono, fecha_creacion, gestionado)
      VALUES (?, ?, ?, ?, datetime('now', '-2 hours'), 0)
    `, [curso1Id, 'Alejandro Ruiz', 'alexruiz@yahoo.es', '654321098']);

    const resSol3 = await db.run(`
      INSERT INTO solicitudes (curso_id, nombre, email, telefono, fecha_creacion, gestionado)
      VALUES (?, ?, ?, ?, datetime('now', '-1 hour'), 0)
    `, [curso1Id, 'Laura Fernández', 'laura.fdz@outlook.com', '678901234']);

    const resSol4 = await db.run(`
      INSERT INTO solicitudes (curso_id, nombre, email, telefono, fecha_creacion, gestionado)
      VALUES (?, ?, ?, ?, datetime('now', '-2 days'), 1)
    `, [curso2Id, 'Javier López', 'javi.lopez@hotmail.com', '699887766']);

    // Notas de contacto demo
    await db.run(`
      INSERT INTO notas_contacto (solicitud_id, texto, fecha_creacion)
      VALUES (?, ?, datetime('now', '-18 hours'))
    `, [resSol1.lastID, 'Llamada realizada. Confirmó interés, pero está pendiente de recibir el justificante de desempleo para finalizar la inscripción. Volver a llamar el lunes.']);

    await db.run(`
      INSERT INTO notas_contacto (solicitud_id, texto, fecha_creacion)
      VALUES (?, ?, datetime('now', '-1 day'))
    `, [resSol4.lastID, 'Contactado por email. Le hemos enviado el formulario de matrícula oficial y la documentación del curso.']);

    // Facturas demo
    await db.run(`
      INSERT INTO facturas (centro_id, numero, fecha, importe, estado)
      VALUES (?, ?, ?, ?, ?)
    `, [centroId, 'FAC-2026-001', '01/06/2026', 79.00, 'pagada']);

    await db.run(`
      INSERT INTO facturas (centro_id, numero, fecha, importe, estado)
      VALUES (?, ?, ?, ?, ?)
    `, [centroId, 'FAC-2026-002', '01/07/2026', 79.00, 'pagada']);

    // Invitación demo
    await db.run(`
      INSERT INTO invitaciones (email, token, usada)
      VALUES (?, ?, ?)
    `, ['centro-nuevo@cursenda.es', 'token_invitacion_123', 0]);
  }

  dbInstance = db;
  return dbInstance;
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const testHash = hashPassword(password, salt);
  return testHash === hash;
}
