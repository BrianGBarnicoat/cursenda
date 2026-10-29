#!/usr/bin/env node
// Deja Stripe listo para Cursenda: planes, IVA, portal del cliente y aviso de pagos (webhook).
// Guarda las claves en /etc/cursenda/cursenda.env. Se puede lanzar varias veces sin duplicar nada.
//
// Uso (como root):  node deploy/configurar-stripe.mjs
// Después:          systemctl restart cursenda
import fs from 'fs';
import Stripe from 'stripe';

const ENV_FILE = process.env.ENV_FILE || '/etc/cursenda/cursenda.env';

const PLANES = [
  { plan: 'starter', nombre: 'Cursenda Starter', importe: 7900, descripcion: 'Hasta 5 cursos activos, gestión de leads y exportación CSV' },
  { plan: 'pro', nombre: 'Cursenda Pro', importe: 14900, descripcion: 'Cursos ilimitados y estadísticas detalladas de visitas' }
];

const EVENTOS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.finalized',
  'invoice.paid',
  'invoice.payment_failed'
];

function leerEnv() {
  if (!fs.existsSync(ENV_FILE)) return {};
  return Object.fromEntries(
    fs.readFileSync(ENV_FILE, 'utf8').split('\n')
      .filter(l => l.includes('=') && !l.startsWith('#'))
      .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)])
  );
}

function guardarEnv(cambios) {
  const lineas = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8').split('\n').filter(Boolean) : [];
  const resto = lineas.filter(l => !Object.keys(cambios).some(k => l.startsWith(k + '=')));
  const nuevas = Object.entries(cambios).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(ENV_FILE, [...resto, ...nuevas].join('\n') + '\n', { mode: 0o600 });
  fs.chmodSync(ENV_FILE, 0o600);
}

// Pide la clave sin que se vea al escribir
function pedirClave(pregunta) {
  return new Promise(resolve => {
    const stdin = process.stdin;
    // Primero se oculta lo que se escribe y luego se pregunta
    stdin.setRawMode?.(true);
    stdin.resume();
    process.stdout.write(pregunta);
    let valor = '';
    stdin.on('data', d => {
      for (const c of d.toString()) {
        if (c === '\r' || c === '\n') {
          stdin.setRawMode?.(false);
          stdin.pause();
          process.stdout.write('\n');
          // Quitar los códigos que mete el terminal al pegar y cualquier carácter invisible
          return resolve(valor.replace(/\x1b\[[0-9;]*[~A-Za-z]/g, '').replace(/[^\x21-\x7e]/g, ''));
        }
        if (c === '\u0003') process.exit(1);
        if (c === '\u007f') valor = valor.slice(0, -1);
        else valor += c;
      }
    });
  });
}

const env = leerEnv();
let clave = env.STRIPE_SECRET_KEY;
if (!clave) {
  console.log('Copia la clave secreta de Stripe (Desarrolladores → Claves de API).');
  console.log('Empieza por sk_test_ en modo pruebas o sk_live_ cuando cobres de verdad.\n');
  clave = await pedirClave('Clave secreta: ');
}
if (!/^(sk|rk)_(test|live)_/.test(clave)) {
  const inicio = clave ? `"${clave.slice(0, 8)}..." (${clave.length} caracteres)` : 'nada';
  console.error(`Esa clave no parece de Stripe. He recibido: ${inicio}`);
  if (clave.startsWith('pk_')) {
    console.error('Esa es la clave publicable. Hace falta la SECRETA, la que empieza por sk_test_ (pulsa "Revelar" en Stripe).');
  } else {
    console.error('Tiene que empezar por sk_test_ (pruebas) o sk_live_ (real).');
  }
  process.exit(1);
}

const stripe = new Stripe(clave);

// Errores de Stripe explicados sin tecnicismos
function errorStripe(err) {
  if (err?.type === 'StripeAuthenticationError') {
    console.error('\nStripe dice que esa clave no es válida. Cópiala otra vez desde Stripe (Desarrolladores → Claves de API → Revelar).');
  } else if (err?.type === 'StripePermissionError') {
    console.error('\nEsa clave no tiene permisos suficientes. Usa la clave secreta normal (sk_test_...), no una restringida.');
  } else {
    console.error('\nNo se pudo terminar la configuración:', err?.message || err);
  }
  console.error('No se ha guardado nada.');
  process.exit(1);
}
process.on('unhandledRejection', errorStripe);
process.on('uncaughtException', errorStripe);
const web = (env.ALLOWED_ORIGINS || 'https://gbarnicoat.uk').split(',')[0].trim();
const modo = clave.includes('_test_') ? 'PRUEBAS' : 'REAL';
console.log(`\n==> Stripe en modo ${modo}, web ${web}`);

// 1. Productos y precios mensuales
const precios = {};
for (const p of PLANES) {
  const lookup = `cursenda_${p.plan}_mensual`;
  const existentes = await stripe.prices.list({ lookup_keys: [lookup], active: true, limit: 1 });
  if (existentes.data[0] && existentes.data[0].unit_amount === p.importe) {
    precios[p.plan] = existentes.data[0];
    console.log(`    ${p.nombre}: ya existe (${p.importe / 100} €/mes)`);
    continue;
  }
  const producto = await stripe.products.create({ name: p.nombre, description: p.descripcion, metadata: { cursenda_plan: p.plan } });
  precios[p.plan] = await stripe.prices.create({
    product: producto.id,
    currency: 'eur',
    unit_amount: p.importe,
    recurring: { interval: 'month' },
    lookup_key: lookup,
    transfer_lookup_key: true,
    tax_behavior: 'exclusive'
  });
  console.log(`    ${p.nombre}: creado (${p.importe / 100} €/mes + IVA)`);
}

// 2. IVA del 21 %
const tasas = await stripe.taxRates.list({ active: true, limit: 100 });
let iva = tasas.data.find(t => t.metadata?.cursenda === 'iva21');
if (!iva) {
  iva = await stripe.taxRates.create({
    display_name: 'IVA',
    percentage: 21,
    inclusive: false,
    country: 'ES',
    jurisdiction: 'ES',
    description: 'IVA general España',
    metadata: { cursenda: 'iva21' }
  });
  console.log('    IVA 21 %: creado');
} else {
  console.log('    IVA 21 %: ya existe');
}

// 3. Portal del cliente (cambiar tarjeta, plan, facturas, baja)
const datosPortal = {
  name: 'Cursenda',
  business_profile: { headline: 'Cursenda: gestione su suscripción' },
  default_return_url: `${web}/centros/dashboard`,
  features: {
    customer_update: { enabled: true, allowed_updates: ['email', 'name', 'address', 'tax_id'] },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: { enabled: true, mode: 'at_period_end', proration_behavior: 'none' },
    subscription_update: {
      enabled: true,
      default_allowed_updates: ['price'],
      proration_behavior: 'create_prorations',
      products: PLANES.map(p => ({ product: String(precios[p.plan].product), prices: [precios[p.plan].id] }))
    }
  }
};
const portales = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
const previo = portales.data.find(c => c.name === 'Cursenda');
const portal = previo
  ? await stripe.billingPortal.configurations.update(previo.id, datosPortal)
  : await stripe.billingPortal.configurations.create(datosPortal);
console.log(`    Portal del cliente: ${previo ? 'actualizado' : 'creado'}`);

// 4. Aviso de pagos (webhook). El secreto solo se ve al crearlo, así que se rehace.
const url = `${web}/api/pagos/webhook`;
const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
for (const e of endpoints.data.filter(e => e.url === url)) {
  await stripe.webhookEndpoints.del(e.id);
}
const webhook = await stripe.webhookEndpoints.create({ url, enabled_events: EVENTOS, description: 'Cursenda' });
console.log(`    Webhook: ${url}`);

guardarEnv({
  STRIPE_SECRET_KEY: clave,
  STRIPE_WEBHOOK_SECRET: webhook.secret,
  STRIPE_PRICE_STARTER: precios.starter.id,
  STRIPE_PRICE_PRO: precios.pro.id,
  STRIPE_TAX_RATE: iva.id,
  STRIPE_PORTAL_CONFIG: portal.id
});

console.log(`\n==> Claves guardadas en ${ENV_FILE}`);
console.log('    Ahora reinicia Cursenda:  systemctl restart cursenda');
