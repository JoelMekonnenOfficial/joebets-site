// GET /api/checkout-success?session_id=...
// Verifies the Stripe session, optionally marks the user as gold in Cloudflare KV,
// issues a session JWT, and redirects to /app.html.

import { sign } from '../_lib/jwt.js';
import { getUsersStore } from '../_lib/users.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'GET') {
    return htmlErr('GET only', 405, { Allow: 'GET' });
  }

  const sessionId = new URL(request.url).searchParams.get('session_id');
  if (!sessionId) return htmlErr('Missing session');

  const stripeKey = env.STRIPE_SECRET_KEY;
  const secret = env.JWT_SECRET;
  if (!stripeKey || !secret) return htmlErr('Server not configured');

  // Fetch Stripe session to verify payment
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { 'Authorization': `Bearer ${stripeKey}` },
  });
  if (!res.ok) return htmlErr('Could not verify payment');
  const session = await res.json();

  if (session.payment_status !== 'paid' && session.status !== 'complete') {
    return htmlErr('Payment not yet confirmed. If you just paid, refresh in a moment.');
  }

  const email = (session.customer_email || session.customer_details?.email || '').toLowerCase();
  if (!email) return htmlErr('Missing email on session');

  const store = getUsersStore(env);
  if (store) {
    try {
      const existing = await store.get(email) || {};
      await store.set(email, {
        ...existing,
        email,
        tier: 'gold',
        stripeCustomerId: session.customer,
        subscriptionId: session.subscription,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('User KV write failed:', e.message);
    }
  }

  const token = await sign({ email, tier: 'gold', sub: email }, secret, 30 * 24 * 3600);
  return new Response(null, {
    status: 302,
    headers: { Location: `/app.html?token=${encodeURIComponent(token)}&welcome=1` },
  });
}

function htmlErr(msg, status = 400, headers = {}) {
  return new Response(`<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0a0a0c;color:#f4f2ec;padding:40px;text-align:center;"><h2>Something went wrong</h2><p>${escapeHtml(msg)}</p><p><a style="color:#d4af37" href="/">Back to home</a></p></body></html>`, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      ...headers,
    },
  });
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}
