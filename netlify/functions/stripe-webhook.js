// Stripe webhook: handles subscription lifecycle to keep user tier in sync.
// Configure in Stripe dashboard → Developers → Webhooks → endpoint URL:
//   https://joebets.com/.netlify/functions/stripe-webhook
// Listen for: checkout.session.completed, customer.subscription.updated,
// customer.subscription.deleted

const crypto = require('crypto');
let getStore;
try { ({ getStore } = require('@netlify/blobs')); } catch {}

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return { statusCode: 500, body: 'STRIPE_WEBHOOK_SECRET not configured' };
  if (!sig) return { statusCode: 400, body: 'Missing stripe-signature' };

  // Verify Stripe signature
  const ok = verifyStripeSignature(event.body, sig, secret);
  if (!ok) return { statusCode: 400, body: 'Invalid signature' };

  let evt;
  try { evt = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Bad JSON' }; }

  const store = getStore ? getStore('users') : null;

  try {
    switch (evt.type) {
      case 'checkout.session.completed':
      case 'customer.subscription.updated': {
        const session = evt.data.object;
        const email = (session.customer_email || session.customer_details?.email || session.metadata?.email || '').toLowerCase();
        if (email && store) {
          const existing = (await store.get(`user:${email}`, { type: 'json' })) || {};
          await store.setJSON(`user:${email}`, {
            ...existing,
            email,
            tier: 'gold',
            stripeCustomerId: session.customer,
            subscriptionId: session.subscription || session.id,
            updatedAt: new Date().toISOString(),
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = evt.data.object;
        // Find user by customer id
        if (store) {
          // We indexed by email; can't cheaply find by customer id without a secondary index.
          // Simplest: store.list() and match. Fine for low volume early stage.
          const { blobs } = await store.list();
          for (const b of blobs) {
            const u = await store.get(b.key, { type: 'json' });
            if (u && u.stripeCustomerId === sub.customer) {
              await store.setJSON(b.key, { ...u, tier: 'free', updatedAt: new Date().toISOString() });
              break;
            }
          }
        }
        break;
      }
      default:
        // ignore unhandled types
        break;
    }
  } catch (e) {
    console.error('Webhook handler error:', e);
    return { statusCode: 500, body: 'Handler error' };
  }

  return { statusCode: 200, body: 'ok' };
};

function verifyStripeSignature(payload, header, secret) {
  try {
    const parts = Object.fromEntries(header.split(',').map(p => p.split('=')));
    const t = parts.t;
    const v1 = parts.v1;
    if (!t || !v1) return false;
    const signed = `${t}.${payload}`;
    const mac = crypto.createHmac('sha256', secret).update(signed).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(v1));
  } catch {
    return false;
  }
}
