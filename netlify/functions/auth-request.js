// Send a magic-link sign-in email.
// POST { email, tier: 'free'|'gold' } → emails user a one-time link.
// On click, link hits auth-verify.js which issues a session JWT.

const { sign } = require('./_jwt.js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  const secret = process.env.JWT_SECRET;
  const resendKey = process.env.RESEND_API_KEY;
  const fromAddr = process.env.EMAIL_FROM || 'JoeBets <noreply@joebets.com>';
  const siteUrl = process.env.URL || 'https://joebets.com';

  if (!secret) return json(500, { error: 'JWT_SECRET not configured. See SETUP.md.' });
  if (!resendKey) return json(500, { error: 'RESEND_API_KEY not configured. See SETUP.md.' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Bad JSON' }); }
  const email = (body.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'Valid email required' });

  // Magic-link token: short-lived (15 min), carries email + intent
  const linkToken = sign({ email, purpose: 'magic-link', tier: 'free' }, secret, 15 * 60);
  const verifyUrl = `${siteUrl}/.netlify/functions/auth-verify?token=${encodeURIComponent(linkToken)}`;

  // Send email via Resend
  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddr,
      to: email,
      subject: 'Your JoeBets sign-in link',
      html: renderEmail(verifyUrl),
      text: `Sign in to JoeBets: ${verifyUrl}\n\nThis link expires in 15 minutes.`,
    }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.text();
    console.error('Resend error:', err);
    return json(500, { error: 'Could not send email. Try again.' });
  }

  return json(200, { ok: true });
};

function renderEmail(url) {
  return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#0a0a0c; color:#f4f2ec; margin:0; padding:40px 20px;">
  <div style="max-width:480px; margin:0 auto; background:#111114; border:1px solid #26252b; border-radius:14px; padding:32px;">
    <h1 style="font-family:Georgia,serif; color:#d4af37; margin:0 0 16px; font-size:1.6rem;">JoeBets</h1>
    <h2 style="color:#f4f2ec; margin:0 0 12px; font-size:1.2rem;">Sign in with this link</h2>
    <p style="color:#a09c92; font-size:0.95rem;">Click below to sign in to your JoeBets account. This link expires in 15 minutes.</p>
    <a href="${url}" style="display:inline-block; background:#d4af37; color:#111; padding:12px 24px; border-radius:999px; font-weight:600; text-decoration:none; margin:16px 0;">Sign in</a>
    <p style="color:#5c5850; font-size:0.82rem; margin-top:24px;">If you didn't request this, you can safely ignore it.</p>
  </div>
</body></html>`;
}

function json(status, data) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
}
