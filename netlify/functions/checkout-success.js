// GET /.netlify/functions/checkout-success?session_id=...
// Verifies the Stripe session, marks the user as gold in Netlify Blobs,
// issues a session JWT and redirects to /app.html

const { sign } = require('./_jwt.js');

let getStore;
try { ({ getStore } = require('@netlify/blobs')); } catch {}

exports.handler = async (event) => {
  const sessionId = (event.queryStringParameters || {}).session_id;
  if (!sessionId) return htmlErr('Missing session');

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const secret = process.env.JWT_SECRET;
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

  // Persist user as Gold in Blobs
  if (getStore) {
    try {
      const store = getStore('users');
      await store.setJSON(`user:${email}`, {
        email,
        tier: 'gold',
        stripeCustomerId: session.customer,
        subscriptionId: session.subscription,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Blob write failed:', e.message);
    }
  }

  const token = sign({ email, tier: 'gold', sub: email }, secret, 30 * 24 * 3600);
  return {
    statusCode: 302,
    headers: { Location: `/app.html?token=${encodeURIComponent(token)}&welcome=1` },
    body: '',
  };
};

function htmlErr(msg) {
  return {
    statusCode: 400,
    headers: { 'Content-Type': 'text/html' },
    body: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0a0a0c;color:#f4f2ec;padding:40px;text-align:center;"><h2>Something went wrong</h2><p>${msg}</p><p><a style="color:#d4af37" href="/">Back to home</a></p></body></html>`,
  };
}
