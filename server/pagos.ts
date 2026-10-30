import Stripe from 'stripe';
import { getDatabase } from './db.js';

// Las claves van en /etc/cursenda/cursenda.env (las crea deploy/configurar-stripe.mjs)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const PRECIOS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER || '',
  pro: process.env.STRIPE_PRICE_PRO || ''
};
const TAX_RATE = process.env.STRIPE_TAX_RATE || '';
const PORTAL_CONFIG = process.env.STRIPE_PORTAL_CONFIG || '';

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

export const PLANES_DE_PAGO = ['starter', 'pro'];

export function pagosConfigurados() {
  return !!(stripe && STRIPE_WEBHOOK_SECRET && PRECIOS.starter && PRECIOS.pro);
}

export function modoPruebaStripe() {
  return STRIPE_SECRET_KEY.startsWith('sk_test_');
}

// Un centro puede usar el panel si paga, si está en su mes de prueba, si es admin o si es la demo
export const accesoDe = (t: string) => `(${t}.rol = 'admin' OR ${t}.es_demo = 1
  OR ${t}.suscripcion_estado IN ('activa', 'impago')
  OR (${t}.suscripcion_estado = 'prueba' AND ${t}.prueba_hasta > datetime('now')))`;
export const ACCESO_SQL = accesoDe('centros');

// En la web pública: los cursos de la demo solo salen si el admin no los ha quitado y mientras no haya cursos de centros reales
export const VISIBLE_SQL = `(${ACCESO_SQL} AND (centros.es_demo IS NOT 1 OR (NOT EXISTS (SELECT 1 FROM ajustes WHERE clave = 'demo_oculta') AND NOT EXISTS (
  SELECT 1 FROM cursos cr JOIN centros cc ON cr.centro_id = cc.id
  WHERE cc.es_demo IS NOT 1 AND (cc.rol IS NULL OR cc.rol != 'admin') AND cr.estado = 'publicado' AND ${accesoDe('cc')}
))))`;

function planDePrecio(priceId?: string | null) {
  return Object.keys(PRECIOS).find(plan => PRECIOS[plan] && PRECIOS[plan] === priceId) || null;
}

function aFechaSqlite(segundos: number) {
  return new Date(segundos * 1000).toISOString().replace('T', ' ').slice(0, 19);
}

async function clienteDelCentro(centro: any) {
  if (!stripe) throw new Error('Stripe no está configurado');
  if (centro.stripe_customer_id) return centro.stripe_customer_id as string;

  const cliente = await stripe.customers.create({
    email: centro.email,
    name: centro.nombre,
    metadata: { centro_id: String(centro.id) }
  });
  const db = await getDatabase();
  await db.run('UPDATE centros SET stripe_customer_id = ? WHERE id = ?', [cliente.id, centro.id]);
  return cliente.id;
}

// Página de pago de Stripe para contratar un plan. Si le queda prueba, no se cobra hasta que acabe.
export async function crearCheckout(centroId: number, plan: string, baseUrl: string) {
  if (!stripe || !pagosConfigurados()) throw new Error('Los pagos no están configurados');
  if (!PLANES_DE_PAGO.includes(plan)) throw new Error('Plan no válido');

  const db = await getDatabase();
  const centro = await db.get('SELECT * FROM centros WHERE id = ?', [centroId]);
  const customer = await clienteDelCentro(centro);

  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
    metadata: { centro_id: String(centro.id), plan }
  };
  // Stripe pide que el final de la prueba sea al menos 48 h después
  const finPrueba = centro.prueba_hasta ? Math.floor(new Date(centro.prueba_hasta.replace(' ', 'T') + 'Z').getTime() / 1000) : 0;
  if (centro.suscripcion_estado === 'prueba' && finPrueba > Date.now() / 1000 + 48 * 3600) {
    subscriptionData.trial_end = finPrueba;
  }
  if (TAX_RATE) subscriptionData.default_tax_rates = [TAX_RATE];

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer,
    line_items: [{ price: PRECIOS[plan], quantity: 1 }],
    subscription_data: subscriptionData,
    payment_method_collection: 'always',
    billing_address_collection: 'required',
    tax_id_collection: { enabled: true },
    customer_update: { name: 'auto', address: 'auto' },
    locale: 'es',
    success_url: `${baseUrl}/centros/dashboard?pago=ok`,
    cancel_url: `${baseUrl}/centros/dashboard?pago=cancelado`
  });
  return session.url;
}

// Portal de Stripe: cambiar tarjeta, ver facturas, cambiar de plan o darse de baja
export async function crearPortal(centroId: number, baseUrl: string) {
  if (!stripe) throw new Error('Los pagos no están configurados');
  const db = await getDatabase();
  const centro = await db.get('SELECT * FROM centros WHERE id = ?', [centroId]);
  if (!centro?.stripe_customer_id) throw new Error('Este centro todavía no tiene ningún pago');

  const session = await stripe.billingPortal.sessions.create({
    customer: centro.stripe_customer_id,
    return_url: `${baseUrl}/centros/dashboard`,
    locale: 'es',
    ...(PORTAL_CONFIG ? { configuration: PORTAL_CONFIG } : {})
  });
  return session.url;
}

async function centroDeStripe(customerId: string | null, centroIdMeta?: string) {
  const db = await getDatabase();
  if (customerId) {
    const porCliente = await db.get('SELECT id FROM centros WHERE stripe_customer_id = ?', [customerId]);
    if (porCliente) return porCliente.id as number;
  }
  if (centroIdMeta) {
    const porId = await db.get('SELECT id FROM centros WHERE id = ?', [centroIdMeta]);
    if (porId) return porId.id as number;
  }
  return null;
}

// Copia en la base de datos el estado de la suscripción que tiene Stripe
async function sincronizarSuscripcion(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const centroId = await centroDeStripe(customerId, sub.metadata?.centro_id);
  if (!centroId) return;

  const estados: Record<string, string> = {
    trialing: 'prueba',
    active: 'activa',
    past_due: 'impago',
    unpaid: 'impago',
    incomplete: 'impago',
    paused: 'cancelada',
    canceled: 'cancelada',
    incomplete_expired: 'cancelada'
  };
  const estado = estados[sub.status] || 'cancelada';
  const item = sub.items.data[0];
  const plan = planDePrecio(item?.price?.id);

  const db = await getDatabase();
  await db.run(`
    UPDATE centros SET
      stripe_customer_id = ?,
      stripe_subscription_id = ?,
      suscripcion_estado = ?,
      prueba_hasta = COALESCE(?, prueba_hasta),
      plan = COALESCE(?, plan),
      plan_pendiente = NULL,
      fecha_renovacion = COALESCE(?, fecha_renovacion)
    WHERE id = ?
  `, [
    customerId,
    estado === 'cancelada' ? null : sub.id,
    estado,
    sub.trial_end ? aFechaSqlite(sub.trial_end) : null,
    plan,
    item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
    centroId
  ]);
}

// Guarda la factura de Stripe en la pestaña "Plan y facturas" del centro
async function guardarFactura(inv: Stripe.Invoice) {
  // Las facturas de 0 € de la prueba no se guardan
  if (!inv.total || !inv.customer) return;
  const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer.id;
  const centroId = await centroDeStripe(customerId);
  if (!centroId) return;

  const db = await getDatabase();
  await db.run(`
    INSERT INTO facturas (centro_id, numero, fecha, importe, estado, stripe_invoice_id, url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(stripe_invoice_id) DO UPDATE SET numero = excluded.numero, importe = excluded.importe, estado = excluded.estado, url = excluded.url
  `, [
    centroId,
    inv.number || inv.id,
    new Date(inv.created * 1000).toLocaleDateString('es-ES'),
    inv.total / 100,
    inv.status === 'paid' ? 'pagada' : 'pendiente',
    inv.id,
    inv.hosted_invoice_url || inv.invoice_pdf || null
  ]);
}

// Avisos que manda Stripe a /api/pagos/webhook
export async function handleWebhook(req: any, res: any) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Pagos no configurados' });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return res.status(400).json({ error: 'Firma no válida' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          await sincronizarSuscripcion(await stripe.subscriptions.retrieve(subId));
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await sincronizarSuscripcion(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.finalized':
      case 'invoice.paid':
      case 'invoice.payment_failed':
        await guardarFactura(event.data.object as Stripe.Invoice);
        break;
    }
    res.json({ received: true });
  } catch (err: any) {
    console.error('Error procesando aviso de Stripe:', event.type, err.message);
    // Stripe lo reintentará
    res.status(500).json({ error: 'Error procesando el aviso' });
  }
}
