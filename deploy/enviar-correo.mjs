// Envía los avisos que la web deja en la carpeta de correo. Lo lanza cursenda-correo.timer cada minuto.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, renameSync, statSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const CARPETA = process.env.CARPETA_CORREO || '/srv/cursenda/data/correo';
const REMITENTE = 'info@cursenda.es';
const UN_DIA = 24 * 60 * 60 * 1000;

const base64 = (texto) => Buffer.from(texto, 'utf8').toString('base64');
const enLineas = (texto) => texto.match(/.{1,76}/g).join('\r\n');

function construir({ para, asunto, texto }) {
  return [
    'From: Cursenda <' + REMITENTE + '>',
    'To: ' + para,
    'Subject: =?UTF-8?B?' + base64(asunto) + '?=',
    'Date: ' + new Date().toUTCString().replace('GMT', '+0000'),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    enLineas(base64(texto)),
    ''
  ].join('\r\n');
}

let archivos = [];
try {
  archivos = readdirSync(CARPETA).filter(f => f.endsWith('.json'));
} catch {
  process.exit(0); // Todavía no hay ningún aviso
}

for (const archivo of archivos.slice(0, 100)) {
  const ruta = path.join(CARPETA, archivo);
  try {
    const correo = JSON.parse(readFileSync(ruta, 'utf8'));
    // Una sola dirección y sin saltos de línea: nadie puede colar otros destinatarios
    if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(correo.para) || /[\r\n]/.test(correo.asunto)) {
      throw new Error('correo no válido');
    }
    const envio = spawnSync('/usr/sbin/sendmail', ['-i', '-f', REMITENTE, '--', correo.para], { input: construir(correo), timeout: 30000 });
    if (envio.status !== 0) throw new Error(`sendmail ha devuelto ${envio.status}`);
    unlinkSync(ruta);
  } catch (err) {
    console.error(`${archivo}: ${err.message}`);
    // Se reintenta cada minuto; pasado un día se aparta para revisarlo
    if (Date.now() - statSync(ruta).mtimeMs > UN_DIA) renameSync(ruta, `${ruta}.fallido`);
  }
}
