# JoeBets

Sports betting picks platform. Live at [joebets.com](https://joebets.com).

## What's here

- **`index.html`** — landing page (hero, how it works, pricing)
- **`app.html`** — dashboard with live upcoming events
- **`community.html`** — community reads (Gold members can post, everyone can read)
- **`logo.png`** — the JoeBets logo (transparent background)
- **`assets/styles.css`** — shared dark-gold design system
- **`netlify/functions/`** — serverless backend:
  - `events.js` — aggregates upcoming UFC/boxing/NBA/NFL from ESPN public API
  - `checkout.js` — creates Stripe Checkout sessions for Gold Ticket
  - `checkout-success.js` — marks user as Gold after successful payment, issues session JWT
  - `stripe-webhook.js` — keeps subscription tier in sync
  - `_jwt.js` — shared HMAC-SHA256 JWT helpers

## Tiers

- **Visitor** — no account. Can browse the dashboard, see matchups, read community.
- **Gold Ticket** — $29/mo via Stripe. All picks, sizing, analysis, community posting.

## Deploy

Auto-deploys from `main` to Netlify. See [SETUP.md](./SETUP.md) for Stripe environment variables.

## Tech

Pure HTML/CSS/JS on the frontend. Netlify Functions (Node 20) on the backend. Netlify Blobs for user storage. No framework, no build step.
