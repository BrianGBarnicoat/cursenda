import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import crypto from 'crypto';
import { insertarDatosDemo } from './demo.js';

let dbInstance: Database | null = null;

export function hashPassword(password: string, salt: string): string {
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512');
  return hash.toString('hex');
}

export async function getDatabase(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = process.env.CURSENDA_DB_PATH || path.resolve(process.cwd(), 'cursenda.db');
  
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
  try {
    await db.run("ALTER TABLE centros ADD COLUMN rol TEXT CHECK(rol IN ('centro', 'admin')) DEFAULT 'centro'");
  } catch (_) {}
  try {
    await db.run("ALTER TABLE solicitudes ADD COLUMN estado_detalle TEXT CHECK(estado_detalle IN ('Nuevo', 'Llamado', 'Interesado', 'Matriculado', 'Descartado')) DEFAULT 'Nuevo'");
  } catch (_) {}

  for (const col of ['cif', 'direccion', 'web']) {
    try {
      await db.run(`ALTER TABLE centros ADD COLUMN ${col} TEXT`);
    } catch (_) {}
  }

  // Suscripción y pagos con Stripe
  const columnasPago = [
    'ALTER TABLE centros ADD COLUMN stripe_customer_id TEXT',
    'ALTER TABLE centros ADD COLUMN stripe_subscription_id TEXT',
    "ALTER TABLE centros ADD COLUMN suscripcion_estado TEXT DEFAULT 'prueba'",
    'ALTER TABLE centros ADD COLUMN prueba_hasta DATETIME',
    'ALTER TABLE facturas ADD COLUMN stripe_invoice_id TEXT',
    'ALTER TABLE facturas ADD COLUMN url TEXT',
    'ALTER TABLE centros ADD COLUMN es_demo INTEGER DEFAULT 0',
    'ALTER TABLE cursos ADD COLUMN archivado INTEGER DEFAULT 0',
    'ALTER TABLE solicitudes ADD COLUMN archivada INTEGER DEFAULT 0'
  ];
  for (const sql of columnasPago) {
    try {
      await db.run(sql);
    } catch (_) {}
  }
  await db.run('CREATE UNIQUE INDEX IF NOT EXISTS facturas_stripe ON facturas(stripe_invoice_id)');
  // La cuenta demo de siempre
  await db.run("UPDATE centros SET es_demo = 1 WHERE email = 'demo@cursenda.es' AND es_demo IS NOT 1");
  // Los centros que ya existían empiezan con su mes de prueba
  await db.run("UPDATE centros SET suscripcion_estado = 'prueba', prueba_hasta = datetime('now', '+30 days') WHERE prueba_hasta IS NULL AND (rol IS NULL OR rol != 'admin')");

  await db.exec(`
    CREATE TABLE IF NOT EXISTS ajustes (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS solicitudes_demo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_centro TEXT NOT NULL,
      nombre_contacto TEXT NOT NULL,
      email TEXT NOT NULL,
      telefono TEXT NOT NULL,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      estado TEXT CHECK(estado IN ('nueva', 'contactada', 'descartada')) DEFAULT 'nueva'
    );

    CREATE TABLE IF NOT EXISTS miembros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      centro_id INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
      nombre TEXT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      salt TEXT,
      rol TEXT CHECK(rol IN ('gestor', 'colaborador')) NOT NULL DEFAULT 'gestor',
      activo INTEGER CHECK(activo IN (0, 1)) DEFAULT 1,
      invitacion_hash TEXT,
      invitacion_expira DATETIME,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS peticiones_recuperacion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      atendida INTEGER CHECK(atendida IN (0, 1)) DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tokens_recuperacion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT CHECK(tipo IN ('centro', 'miembro')) NOT NULL,
      usuario_id INTEGER NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      expira DATETIME NOT NULL,
      usado INTEGER CHECK(usado IN (0, 1)) DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS plantillas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      centro_id INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
      titulo TEXT NOT NULL,
      tipo TEXT CHECK(tipo IN ('whatsapp', 'email')) NOT NULL DEFAULT 'whatsapp',
      texto TEXT NOT NULL
    );
  `);

  // Ver si la base de datos está vacía antes de crear el admin
  const totalCentros = await db.get('SELECT COUNT(*) as count FROM centros');
  const esNueva = (totalCentros as any).count === 0;

  // Semilla de administrador si no existe
  try {
    const adminEmail = 'admin@cursenda.es';
    const adminExists = await db.get('SELECT * FROM centros WHERE email = ?', [adminEmail]);
    if (!adminExists) {
      const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString('base64url');
      if (!process.env.ADMIN_PASSWORD) {
        console.log(`Administrador creado con contraseña aleatoria: ${adminPassword}`);
      }
      const salt = crypto.randomBytes(16).toString('hex');
      const pwdHash = hashPassword(adminPassword, salt);
      const fechaRenovacion = new Date();
      fechaRenovacion.setFullYear(fechaRenovacion.getFullYear() + 10);
      
      await db.run(`
        INSERT INTO centros (nombre, email, password_hash, salt, plan, fecha_renovacion, nombre_contacto, telefono, rol)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'Administrador Cursenda',
        adminEmail,
        pwdHash,
        salt,
        'custom',
        fechaRenovacion.toISOString(),
        'Admin',
        '900000000',
        'admin'
      ]);
    }
  } catch (err) {
    console.error("Error al sembrar administrador:", err);
  }

  // Centro demo para enseñar la plataforma (en local entra con demo123)
  if (esNueva && process.env.NODE_ENV !== 'production') {
    const salt = crypto.randomBytes(16).toString('hex');
    const resultCentro = await db.run(`
      INSERT INTO centros (nombre, email, password_hash, salt, plan, fecha_renovacion, nombre_contacto, telefono, api_token, prueba_hasta, es_demo)
      VALUES (?, ?, ?, ?, 'pro', ?, ?, ?, ?, datetime('now', '+30 days'), 1)
    `, [
      'Centro de Formación Tecnológica de Madrid',
      'demo@cursenda.es',
      hashPassword('demo123', salt),
      salt,
      new Date(Date.now() + 30 * 86400000).toISOString(),
      'Brian Barnicoat',
      '910000000',
      'cursenda_live_' + crypto.randomBytes(16).toString('hex')
    ]);
    await insertarDatosDemo(db, resultCentro.lastID as number);
  }

  dbInstance = db;
  return dbInstance;
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const testHash = Buffer.from(hashPassword(password, salt), 'hex');
  const storedHash = Buffer.from(hash, 'hex');
  return testHash.length === storedHash.length && crypto.timingSafeEqual(testHash, storedHash);
}
