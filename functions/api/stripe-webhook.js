// Stripe webhook: handles subscription lifecycle to keep user tier in sync.
// Configure in Stripe dashboard -> Developers -> Webhooks -> endpoint URL:
//   https://joebets.com/api/stripe-webhook
// Listen for: checkout.session.completed, customer.subscription.updated,
// customer.subscription.deleted

import Stripe from 'stripe';
import { getUsersStore } from '../_lib/users.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return text('POST only', 405, { Allow: 'POST' });
  }

  const sig = request.headers.get('stripe-signature');
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = env.STRIPE_SECRET_KEY;
  if (!webhookSecret) return text('STRIPE_WEBHOOK_SECRET not configured', 500);
  if (!stripeKey) return text('STRIPE_SECRET_KEY not configured', 500);
  if (!sig) return text('Missing stripe-signature', 400);

  const raw = await request.text();
  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  let evt;
  try {
    evt = await stripe.webhooks.constructEventAsync(
      raw,
      sig,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch (e) {
    console.warn('Stripe signature verification failed:', e.message);
    return text('Invalid signature', 400);
  }

  const store = getUsersStore(env);

  try {
    switch (evt.type) {
      case 'checkout.session.completed':
      case 'customer.subscription.updated': {
        const stripeObject = evt.data.object;
        const email = await emailFromStripeObject(stripeObject, stripe);
        if (email && store) {
          const existing = await store.get(email) || {};
          await store.set(email, {
            ...existing,
            email,
            tier: 'gold',
            stripeCustomerId: getStripeId(stripeObject.customer),
            subscriptionId: stripeObject.subscription || stripeObject.id,
            updatedAt: new Date().toISOString(),
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = evt.data.object;
        const customerId = getStripeId(sub.customer);
        if (store) {
          // Users are keyed by email, so find by customer id. Fine for low volume early stage.
          const match = await store.findByStripeCustomerId(customerId);
          if (match) {
            await store.setByKey(match.key, { ...match.user, tier: 'free', updatedAt: new Date().toISOString() });
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
    return text('Handler error', 500);
  }

  return text('ok');
}

async function emailFromStripeObject(stripeObject, stripe) {
  let email = stripeObject.customer_email
    || stripeObject.customer_details?.email
    || stripeObject.metadata?.email
    || stripeObject.email;

  if (!email && stripeObject.customer) {
    const customerId = getStripeId(stripeObject.customer);
    const customer = typeof stripeObject.customer === 'object'
      ? stripeObject.customer
      : await stripe.customers.retrieve(customerId);
    if (customer && !customer.deleted) email = customer.email;
  }

  return (email || '').trim().toLowerCase();
}

function getStripeId(value) {
  if (!value) return '';
  return typeof value === 'string' ? value : value.id || '';
}

function text(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      ...headers,
    },
  });
}
