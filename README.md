# JoeBets

Sports betting picks platform. Live at [joebets.com](https://joebets.com).

## What's here

- **`index.html`** — landing page (hero, how it works, pricing)
- **`app.html`** — dashboard with live upcoming events
- **`community.html`** — community reads (Gold members can post, everyone can read)
- **`logo.png`** — the JoeBets logo (transparent background)
- **`assets/styles.css`** — shared dark-gold design system
- **`functions/api/`** — Cloudflare Pages Functions backend:
  - `events.js` — aggregates upcoming UFC/boxing/NBA/NFL from ESPN public API
  - `checkout.js` — creates Stripe Checkout sessions for Gold Ticket
  - `checkout-success.js` — marks user as Gold after successful payment, issues session JWT
  - `stripe-webhook.js` — keeps subscription tier in sync
- **`functions/_lib/`** — shared Worker-safe helpers

## Tiers

- **Visitor** — no account. Can browse the dashboard, see matchups, read community.
- **Gold Ticket** — $29/mo via Stripe. All picks, sizing, analysis, community posting.

## Deploy

Deploys from `main` to Cloudflare Pages. Build output directory is `public`; Functions directory is `functions`. See [SETUP.md](./SETUP.md) for Stripe environment variables.

## Tech

Pure HTML/CSS/JS on the frontend. Cloudflare Pages Functions on the backend. Optional Cloudflare KV user storage via a `USERS` binding. No framework, no build step.
