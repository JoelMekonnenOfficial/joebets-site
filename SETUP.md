# JoeBets — post-deploy setup

The site deploys and runs immediately. The auth + payments features need a few environment variables set in Netlify before they'll work. Until you set them, the static pages work fine and the auth buttons will show a friendly error.

## Required environment variables

Set these in **Netlify → Site settings → Environment variables**:

| Variable | What it is | Where to get it |
| --- | --- | --- |
| `JWT_SECRET` | Random 32+ char secret for signing session tokens | Generate: run `openssl rand -hex 32` or use any long random string |
| `RESEND_API_KEY` | Email sending API key | [resend.com](https://resend.com) → API Keys |
| `EMAIL_FROM` | From address for magic-link emails | e.g. `JoeBets <noreply@joebets.com>` (must be a verified Resend domain) |
| `STRIPE_SECRET_KEY` | Stripe secret key (starts with `sk_live_…` or `sk_test_…`) | Stripe dashboard → Developers → API keys |
| `STRIPE_PRICE_ID_GOLD` | Price ID for the monthly Gold Ticket subscription | Stripe → Products → Gold Ticket → copy price ID `price_…` |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the Stripe webhook | Stripe → Developers → Webhooks → Add endpoint (see below) |

Netlify also exposes `URL` automatically (your production URL).

## Step by step

### 1. Generate `JWT_SECRET`
Any long random string. On Mac/Linux: `openssl rand -hex 32`. Paste the output into Netlify.

### 2. Set up Resend for email
1. Sign up at [resend.com](https://resend.com).
2. Add and verify `joebets.com` as a sending domain (adds a few DNS records to your Netlify DNS zone).
3. Create an API key. Copy it into `RESEND_API_KEY`.
4. Set `EMAIL_FROM` to something like `JoeBets <noreply@joebets.com>`.

### 3. Set up Stripe
1. Sign up / sign in at [stripe.com](https://stripe.com).
2. Create a product: **Gold Ticket**, recurring, $29/month (or whatever price you want).
3. Copy the price ID (starts with `price_…`) into `STRIPE_PRICE_ID_GOLD`.
4. Copy your secret key into `STRIPE_SECRET_KEY` (start with test mode `sk_test_…` — switch to `sk_live_…` when ready).

### 4. Set up the Stripe webhook
1. In Stripe → Developers → Webhooks → Add endpoint.
2. Endpoint URL: `https://joebets.com/.netlify/functions/stripe-webhook`
3. Events to listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy the signing secret (starts with `whsec_…`) into `STRIPE_WEBHOOK_SECRET`.

### 5. Redeploy
After setting env vars, trigger a redeploy (Netlify auto-deploys on next push, or use **Deploys → Trigger deploy**).

## How the auth flow works

**Free signup:** user enters email → `auth-request` sends a magic link → user clicks → `auth-verify` issues a 30-day session JWT → client stores it in `localStorage`.

**Gold upgrade:** user enters email → `checkout` starts a Stripe Checkout session → user pays → Stripe redirects to `checkout-success` → we verify the payment, mark the user Gold in Netlify Blobs, issue a Gold session JWT.

**Ongoing:** `stripe-webhook` keeps the user's tier in sync — downgrades to Free on cancellation.

## User data storage

Users are stored in Netlify Blobs (a key-value store built into every Netlify site — no separate DB to set up). Key format: `user:<email>`. Value: `{ email, tier, stripeCustomerId, subscriptionId, updatedAt }`.

For higher volume later you'd swap this for Supabase / FaunaDB / Postgres — the function code is isolated enough that this is a clean swap.

## What's still stubbed

- **Picks pipeline:** the `events` function attaches demo picks to the top event of each league. Real picks come from you. You can add a `picks` blob store and write a small admin interface later.
- **Tapology scraping:** not wired in this deploy. ESPN events carry the matchups; when you want fighter-level stats, add a `fighter-stats` function that scrapes Tapology on demand (cache aggressively — their site is fragile).
- **Community:** `community.html` shows pinned demo threads. Full threaded forum is a bigger build — candidates: a tiny self-hosted forum, or embed Discord / a Slack.
