// Minimal HMAC-SHA256 JWT helpers using Web Crypto for the Workers runtime.
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64urlEncode(value) {
  const bytes = typeof value === 'string'
    ? encoder.encode(value)
    : value instanceof ArrayBuffer
      ? new Uint8Array(value)
      : value;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlDecode(str) {
  let normalized = str.replace(/-/g, '+').replace(/_/g, '/');
  while (normalized.length % 4) normalized += '=';
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', key, encoder.encode(data));
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function sign(payload, secret, expSeconds = 60 * 60 * 24 * 30) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = { iat: now, exp: now + expSeconds, ...payload };
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedBody = base64urlEncode(JSON.stringify(body));
  const signature = await hmac(secret, `${encodedHeader}.${encodedBody}`);
  return `${encodedHeader}.${encodedBody}.${base64urlEncode(signature)}`;
}

export async function verify(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedBody, encodedSignature] = parts;
  const expected = new Uint8Array(await hmac(secret, `${encodedHeader}.${encodedBody}`));
  const actual = base64urlDecode(encodedSignature);
  if (!constantTimeEqual(actual, expected)) return null;
  const payload = JSON.parse(decoder.decode(base64urlDecode(encodedBody)));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}
