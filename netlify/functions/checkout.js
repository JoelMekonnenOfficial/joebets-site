// POST { email, tier: 'gold' } → returns { url } for Stripe Checkout redirect.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID_GOLD;
  const siteUrl = process.env.URL || 'https://joebets.com';

  if (!stripeKey) return json(500, { error: 'STRIPE_SECRET_KEY not configured. See SETUP.md.' });
  if (!priceId) return json(500, { error: 'STRIPE_PRICE_ID_GOLD not configured. See SETUP.md.' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Bad JSON' }); }
  const email = (body.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'Valid email required' });

  // Create Stripe Checkout session using REST (no SDK dep required)
  const params = new URLSearchParams();
  params.append('mode', 'subscription');
  params.append('line_items[0][price]', priceId);
  params.append('line_items[0][quantity]', '1');
  params.append('customer_email', email);
  params.append('success_url', `${siteUrl}/.netlify/functions/checkout-success?session_id={CHECKOUT_SESSION_ID}`);
  params.append('cancel_url', `${siteUrl}/#pricing`);
  params.append('metadata[email]', email);
  params.append('allow_promotion_codes', 'true');

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Stripe error:', err);
    return json(500, { error: 'Could not start checkout. Try again.' });
  }

  const session = await res.json();
  return json(200, { url: session.url });
};

function json(status, data) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
}
