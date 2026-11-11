// Envía los avisos que la web deja en la carpeta de correo. Lo lanza cursenda-correo.timer cada minuto.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, renameSync, statSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const CARPETA = process.env.CARPETA_CORREO || '/srv/cursenda/data/correo';
const REMITENTE = 'info@cursenda.es';
const UN_DIA = 24 * 60 * 60 * 1000;

const base64 = (texto) => Buffer.from(texto, 'utf8').toString('base64');
const enLineas = (texto) => texto.match(/.{1,76}/g).join('\r\n');

// El asunto va codificado en trozos cortos, como pide el correo (RFC 2047), sin partir ninguna letra con tilde
function asuntoCodificado(asunto) {
  const trozos = [];
  let trozo = '';
  for (const letra of asunto.replace(/\s+/g, ' ').trim()) {
    if (Buffer.byteLength(trozo + letra, 'utf8') > 39) {
      trozos.push(trozo);
      trozo = '';
    }
    trozo += letra;
  }
  trozos.push(trozo);
  return trozos.map(t => '=?UTF-8?B?' + base64(t) + '?=').join('\r\n ');
}

function construir({ para, asunto, texto }) {
  return [
    'From: Cursenda <' + REMITENTE + '>',
    'To: ' + para,
    'Subject: ' + asuntoCodificado(asunto),
    'Date: ' + new Date().toUTCString().replace('GMT', '+0000'),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    enLineas(base64(texto)),
    ''
  ].join('\r\n');
}

const apartar = (ruta) => {
  try {
    renameSync(ruta, `${ruta}.fallido`);
  } catch {
    // Ya no está
  }
};

let archivos = [];
try {
  // Por orden de llegada: el nombre de cada aviso empieza por su fecha
  archivos = readdirSync(CARPETA).filter(f => f.endsWith('.json')).sort();
} catch {
  process.exit(0); // Todavía no hay ningún aviso
}

for (const archivo of archivos.slice(0, 100)) {
  const ruta = path.join(CARPETA, archivo);
  let correo;
  try {
    correo = JSON.parse(readFileSync(ruta, 'utf8'));
    // Una sola dirección: nadie puede colar otros destinatarios
    if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(correo.para) || typeof correo.asunto !== 'string' || typeof correo.texto !== 'string') {
      throw new Error('correo no válido');
    }
  } catch (err) {
    // Un aviso que no se puede leer no va a salir nunca: se aparta ya, sin reintentarlo todo el día
    console.error(`${archivo}: ${err.message}`);
    apartar(ruta);
    continue;
  }

  try {
    const envio = spawnSync('/usr/sbin/sendmail', ['-i', '-f', REMITENTE, '--', correo.para], { input: construir(correo), timeout: 30000 });
    if (envio.status !== 0) throw new Error(`sendmail ha devuelto ${envio.status}`);
    unlinkSync(ruta);
  } catch (err) {
    console.error(`${archivo}: ${err.message}`);
    // Se reintenta cada minuto; pasado un día se aparta para revisarlo
    try {
      if (Date.now() - statSync(ruta).mtimeMs > UN_DIA) apartar(ruta);
    } catch {
      // Ya no está
    }
  }
}
