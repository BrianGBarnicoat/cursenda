import type { Database } from 'sqlite';

// Datos de ejemplo de la cuenta demo (la que se enseña en los colegios).
// Emails @ejemplo.com y teléfonos inventados para no usar datos de nadie real.

const CURSOS = [
  {
    titulo: 'IFCD0210 - Desarrollo de Aplicaciones con Tecnologías Web',
    categoria: 'Informática', modalidad: 'Online', localidad: 'Madrid / Remoto',
    duracion_horas: 510, plazas: 25, plazas_cubiertas: 12, fecha_inicio: '15 de enero de 2027', dirigido_a: 'Desempleados', visitas: 184, estado: 'publicado',
    descripcion: 'Aprenda a desarrollar aplicaciones web modernas, desde el frontend con HTML, CSS y JavaScript hasta el backend y las bases de datos. Certificado de profesionalidad de nivel 3.'
  },
  {
    titulo: 'ADGD0210 - Creación y Gestión de Microempresas',
    categoria: 'Administración', modalidad: 'Mixta', localidad: 'Móstoles',
    duracion_horas: 520, plazas: 20, plazas_cubiertas: 19, fecha_inicio: '1 de febrero de 2027', dirigido_a: 'Todos', visitas: 98, estado: 'publicado',
    descripcion: 'Formación para planificar, poner en marcha y gestionar una pequeña empresa o un proyecto de autoempleo: contabilidad, fiscalidad, recursos humanos y marketing.'
  },
  {
    titulo: 'COML0309 - Organización y Gestión de Almacenes',
    categoria: 'Logística', modalidad: 'Presencial', localidad: 'Alcalá de Henares',
    duracion_horas: 390, plazas: 15, plazas_cubiertas: 5, fecha_inicio: 'Inmediata', dirigido_a: 'Ocupados', visitas: 45, estado: 'pausado',
    descripcion: 'Optimización de flujos de almacén, control de existencias, prevención de riesgos y manejo de programas de gestión de almacenes.'
  },
  {
    titulo: 'HOTR0608 - Servicios de Restaurante y Sumillería',
    categoria: 'Hostelería', modalidad: 'Presencial', localidad: 'Madrid Centro',
    duracion_horas: 580, plazas: 18, plazas_cubiertas: 8, fecha_inicio: '10 de febrero de 2027', dirigido_a: 'Todos', visitas: 62, estado: 'publicado',
    descripcion: 'Formación práctica para profesionales de sala: servicio de mesa, coctelería, cata de vinos, maridaje y organización de eventos.'
  },
  {
    titulo: 'SSCS0208 - Atención Sociosanitaria a Personas Dependientes en Instituciones Sociales',
    categoria: 'Sanidad', modalidad: 'Presencial', localidad: 'Fuenlabrada',
    duracion_horas: 450, plazas: 20, plazas_cubiertas: 15, fecha_inicio: '20 de enero de 2027', dirigido_a: 'Todos', visitas: 112, estado: 'publicado',
    descripcion: 'Certificado de profesionalidad para trabajar en residencias y centros de día: cuidados básicos, higiene, alimentación, apoyo psicosocial y primeros auxilios.'
  }
];

// curso = posición en CURSOS; hace = minutos desde que pidió plaza
const SOLICITUDES = [
  { curso: 0, nombre: 'Laura Fernández Gil', telefono: '600100201', hace: 18, estado: 'Nuevo' },
  { curso: 4, nombre: 'Marta Ruiz Ortega', telefono: '600100202', hace: 95, estado: 'Nuevo' },
  { curso: 0, nombre: 'Alejandro Torres Vega', telefono: '600100203', hace: 240, estado: 'Nuevo' },
  { curso: 3, nombre: 'Javier Moreno Sanz', telefono: '600100204', hace: 1440, estado: 'Llamado', nota: 'Llamado. Le interesa, pero empieza a trabajar en marzo. Volver a llamar el lunes.' },
  { curso: 1, nombre: 'Lucía Navarro Prieto', telefono: '600100205', hace: 2100, estado: 'Interesado', nota: 'Le he enviado por WhatsApp la lista de documentos. Trae el DARDE el jueves.' },
  { curso: 4, nombre: 'Carmen Díaz Romero', telefono: '600100206', hace: 3300, estado: 'Matriculado', nota: 'Matrícula firmada. Empieza el 20 de enero.' },
  { curso: 0, nombre: 'Pablo Jiménez Castro', telefono: '600100207', hace: 4500, estado: 'Interesado', nota: 'Prefiere la modalidad online. Pendiente de enviar el certificado de estudios.' },
  { curso: 1, nombre: 'Sergio Molina Herrero', telefono: '600100208', hace: 7200, estado: 'Descartado', nota: 'No cumple requisitos: no está inscrito como demandante de empleo.' }
];

const emailDe = (nombre: string) =>
  nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(' ').slice(0, 2).join('.') + '@ejemplo.com';

// Rellena el centro demo con cursos, solicitudes y notas recientes
export async function insertarDatosDemo(db: Database, centroId: number) {
  const ids: number[] = [];
  for (const c of CURSOS) {
    const r = await db.run(`
      INSERT INTO cursos (centro_id, titulo, categoria, modalidad, localidad, duracion_horas, plazas, plazas_cubiertas, fecha_inicio, dirigido_a, descripcion, visitas, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [centroId, c.titulo, c.categoria, c.modalidad, c.localidad, c.duracion_horas, c.plazas, c.plazas_cubiertas, c.fecha_inicio, c.dirigido_a, c.descripcion, c.visitas, c.estado]);
    ids.push(r.lastID as number);
  }

  for (const s of SOLICITUDES) {
    const r = await db.run(`
      INSERT INTO solicitudes (curso_id, nombre, email, telefono, fecha_creacion, gestionado, estado_detalle)
      VALUES (?, ?, ?, ?, datetime('now', ?), ?, ?)
    `, [ids[s.curso], s.nombre, emailDe(s.nombre), s.telefono, `-${s.hace} minutes`, s.estado === 'Nuevo' ? 0 : 1, s.estado]);
    if (s.nota) {
      await db.run(`INSERT INTO notas_contacto (solicitud_id, texto, fecha_creacion) VALUES (?, ?, datetime('now', ?))`,
        [r.lastID, s.nota, `-${Math.round(s.hace * 0.7)} minutes`]);
    }
  }
}

// Deja la cuenta demo como nueva (se lanza cada noche y desde el admin)
export async function reiniciarDemo(db: Database) {
  const demo = await db.get('SELECT id FROM centros WHERE es_demo = 1 ORDER BY id LIMIT 1');
  if (!demo) return false;

  await db.run('BEGIN TRANSACTION');
  try {
    // Al borrar los cursos se borran también sus solicitudes y notas
    await db.run('DELETE FROM cursos WHERE centro_id = ?', [demo.id]);
    await db.run('DELETE FROM miembros WHERE centro_id = ?', [demo.id]);
    await db.run('DELETE FROM plantillas WHERE centro_id = ?', [demo.id]);
    await db.run('DELETE FROM facturas WHERE centro_id = ? AND stripe_invoice_id IS NULL', [demo.id]);
    await db.run(`UPDATE centros SET webhook_url = NULL, plan = 'pro', plan_pendiente = NULL, suscripcion_estado = 'prueba',
      prueba_hasta = datetime('now', '+30 days') WHERE id = ?`, [demo.id]);
    await insertarDatosDemo(db, demo.id);
    await db.run('COMMIT');
    return true;
  } catch (err) {
    await db.run('ROLLBACK');
    throw err;
  }
}

// Programa el reinicio todas las noches a las 4:00 (hora del servidor)
export function programarReinicioDemo(getDb: () => Promise<Database>) {
  const siguiente = () => {
    const ahora = new Date();
    const objetivo = new Date(ahora);
    objetivo.setHours(4, 0, 0, 0);
    if (objetivo <= ahora) objetivo.setDate(objetivo.getDate() + 1);
    return objetivo.getTime() - ahora.getTime();
  };
  const lanzar = async () => {
    try {
      if (await reiniciarDemo(await getDb())) console.log('Cuenta demo reiniciada');
    } catch (err: any) {
      console.error('Error reiniciando la demo:', err.message);
    }
    setTimeout(lanzar, siguiente());
  };
  setTimeout(lanzar, siguiente());
}
