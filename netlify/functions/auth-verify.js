// GET /.netlify/functions/auth-verify?token=...
// Verifies the magic-link token, looks up tier (from KV/blob store if present),
// issues a 30-day session JWT and redirects to /app.html#token=<session-jwt>

const { sign, verify } = require('./_jwt.js');

// Netlify Blobs (available in modern Netlify Functions). Import lazily so it
// doesn't crash locally if the package isn't present.
let getStore;
try { ({ getStore } = require('@netlify/blobs')); } catch {}

exports.handler = async (event) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) return htmlErr('JWT_SECRET not configured');

  const token = (event.queryStringParameters || {}).token;
  if (!token) return htmlErr('Missing token');

  const payload = verify(token, secret);
  if (!payload || payload.purpose !== 'magic-link') return htmlErr('Link expired or invalid');

  const email = payload.email;

  // Determine tier: check blobs store for paid users
  let tier = 'free';
  if (getStore) {
    try {
      const store = getStore('users');
      const u = await store.get(`user:${email}`, { type: 'json' });
      if (u && u.tier === 'gold') tier = 'gold';
    } catch (e) {
      console.warn('Blobs read failed:', e.message);
    }
  }

  // Issue 30-day session JWT
  const sessionToken = sign({ email, tier, sub: email }, secret, 30 * 24 * 3600);

  // Redirect to dashboard with token in query (client stores it)
  return {
    statusCode: 302,
    headers: {
      Location: `/app.html?token=${encodeURIComponent(sessionToken)}`,
    },
    body: '',
  };
};

function htmlErr(msg) {
  return {
    statusCode: 400,
    headers: { 'Content-Type': 'text/html' },
    body: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0a0a0c;color:#f4f2ec;padding:40px;text-align:center;"><h2>Sign-in failed</h2><p>${msg}</p><p><a style="color:#d4af37" href="/">Back to home</a></p></body></html>`,
  };
}
