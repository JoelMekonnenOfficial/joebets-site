# JoeBets

Sports betting picks platform. Live at [joebets.com](https://joebets.com).

## What's here

- **`index.html`** — landing page (hero, how it works, pricing)
- **`app.html`** — dashboard with live upcoming events
- **`community.html`** — community page (free-account gated)
- **`logo.png`** — the JoeBets logo (transparent background)
- **`assets/styles.css`** — shared dark-gold design system
- **`netlify/functions/`** — serverless backend:
  - `events.js` — aggregates upcoming UFC/boxing/NBA/NFL from ESPN public API
  - `auth-request.js` — sends magic-link emails via Resend
  - `auth-verify.js` — verifies magic links, issues session JWTs
  - `checkout.js` — creates Stripe Checkout sessions for Gold Ticket
  - `checkout-success.js` — marks user as Gold after successful payment
  - `stripe-webhook.js` — keeps subscription tier in sync
  - `_jwt.js` — shared HMAC-SHA256 JWT helpers

## Tiers

- **Visitor** — no account. Can browse dashboard and see matchups.
- **Free** — email signup via magic link. Adds community access, saved favorites, weekly free pick.
- **Gold Ticket** — $29/mo via Stripe. All picks, sizing, analysis.

## Deploy

Auto-deploys from `main` to Netlify. See [SETUP.md](./SETUP.md) for environment variables needed for auth + payments.

## Tech

Pure HTML/CSS/JS on the frontend. Netlify Functions (Node 20) on the backend. Netlify Blobs for user storage. No framework, no build step for the static pages.
