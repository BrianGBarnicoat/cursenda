import { mkdirSync, renameSync, writeFileSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

// La web está aislada y no puede hablar con el correo del servidor.
// Deja cada aviso en esta carpeta y deploy/enviar-correo.mjs (servicio aparte) lo envía cada minuto.
const CARPETA = path.join(path.dirname(process.env.CURSENDA_DB_PATH || './cursenda.db'), 'correo');
export const CORREO_ADMIN = 'info@cursenda.es';
const WEB = 'https://cursenda.es';

export function encolarCorreo(para: string, asunto: string, texto: string) {
  try {
    if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(para)) return;
    mkdirSync(CARPETA, { recursive: true, mode: 0o700 });
    const nombre = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const temporal = path.join(CARPETA, `${nombre}.tmp`);
    writeFileSync(temporal, JSON.stringify({ para, asunto, texto: `${texto}\n\n--\nCursenda\n${WEB}\n` }), { mode: 0o600 });
    renameSync(temporal, path.join(CARPETA, `${nombre}.json`));
  } catch (err: any) {
    // Un aviso que no sale nunca debe romper la solicitud de nadie
    console.error('No se pudo dejar el correo en la cola:', err.message);
  }
}

export const avisoPeticionAcceso = (d: { nombre_centro: string; nombre_contacto: string; email: string; telefono: string }) =>
  encolarCorreo(CORREO_ADMIN, `Petición de acceso: ${d.nombre_centro}`,
    `${d.nombre_centro} quiere probar Cursenda.\n\nContacto: ${d.nombre_contacto}\nTeléfono: ${d.telefono}\nCorreo: ${d.email}\n\nCrea su cuenta en ${WEB}/centros/dashboard (Peticiones de acceso).`);

export const avisoContrasena = (email: string) =>
  encolarCorreo(CORREO_ADMIN, 'Alguien ha pedido cambiar su contraseña',
    `${email} ha pulsado "He olvidado mi contraseña".\n\nSi el correo tiene cuenta, crea el enlace en ${WEB}/centros/dashboard (Contraseñas).`);

// Como mucho un aviso cada 10 minutos por academia, para que nadie pueda llenarle el correo
const ultimoAviso = new Map<number, number>();
export function avisoSolicitud(centro: { id: number; email: string }, curso: string) {
  const ahora = Date.now();
  if (ahora - (ultimoAviso.get(centro.id) || 0) < 10 * 60 * 1000) return;
  ultimoAviso.set(centro.id, ahora);
  // Sin datos de la persona en el correo: se ven al entrar al panel
  encolarCorreo(centro.email, 'Tienes una solicitud nueva en Cursenda',
    `Alguien ha pedido plaza en "${curso}".\n\nEntra en tu panel para ver sus datos y llamarle: ${WEB}/centros/dashboard`);
}

export const avisoPrueba = (email: string, dias: number) =>
  encolarCorreo(email, dias <= 1 ? 'Mañana termina tu mes de prueba en Cursenda' : `Te quedan ${dias} días de prueba en Cursenda`,
    `Cuando termine la prueba, tus cursos dejarán de verse en la web y el panel quedará bloqueado hasta que contrates un plan. Tus datos se guardan.\n\nElige tu plan aquí: ${WEB}/centros/dashboard`);
