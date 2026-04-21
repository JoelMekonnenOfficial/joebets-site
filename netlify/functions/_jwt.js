// Minimal HMAC-SHA256 JWT helpers. No external deps.
const crypto = require('crypto');

function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64');
}

function sign(payload, secret, expSeconds = 60 * 60 * 24 * 30) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = { iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + expSeconds, ...payload };
  const h = base64url(JSON.stringify(header));
  const b = base64url(JSON.stringify(body));
  const mac = crypto.createHmac('sha256', secret).update(`${h}.${b}`).digest();
  return `${h}.${b}.${base64url(mac)}`;
}

function verify(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, b, s] = parts;
  const expected = base64url(crypto.createHmac('sha256', secret).update(`${h}.${b}`).digest());
  if (!crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))) return null;
  const payload = JSON.parse(b64urlDecode(b).toString('utf8'));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

module.exports = { sign, verify };
