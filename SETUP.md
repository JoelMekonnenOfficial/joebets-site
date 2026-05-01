# JoeBets - post-deploy setup

The site deploys and runs on Cloudflare Pages. Stripe checkout needs a few environment variables before it will process payments. Until you set them, the static pages work fine.

## Required environment variables

Set these in **Cloudflare Pages -> joebets-site -> Settings -> Environment variables**:

| Variable | What it is | Where to get it |
| --- | --- | --- |
| `JWT_SECRET` | Random 32+ char secret for signing session tokens | Generate: `openssl rand -hex 32` or any long random string |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_...` or `sk_test_...`) | Stripe dashboard -> Developers -> API keys |
| `STRIPE_PRICE_ID_GOLD` | Price ID for the monthly Gold Ticket subscription | Stripe -> Products -> Gold Ticket -> copy price ID `price_...` |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the Stripe webhook | Stripe -> Developers -> Webhooks -> Add endpoint (see below) |
| `SITE_URL` | Optional canonical site URL for Stripe redirects | Usually `https://joebets.com`; otherwise the current request origin is used |

Optional: bind a Cloudflare KV namespace as `USERS` to persist Gold/free tier state from checkout success and webhook events.

## Step by step

### 1. `JWT_SECRET`
Already set if you followed the autonomous setup. Otherwise: `openssl rand -hex 32`, paste into Cloudflare Pages.

### 2. Stripe product + price
1. Sign in at [stripe.com](https://stripe.com).
2. Products -> **+ Add product**. Name: `Gold Ticket`. Recurring, `$29 USD / month`.
3. Save. Copy the **Price ID** (`price_...`) -> paste into `STRIPE_PRICE_ID_GOLD` in Cloudflare Pages.
4. Developers -> API keys -> copy **Secret key** (`sk_test_...` for testing, `sk_live_...` for real money) -> paste into `STRIPE_SECRET_KEY`.

### 3. Stripe webhook
1. Stripe -> Developers -> Webhooks -> **+ Add endpoint**.
2. Endpoint URL: `https://joebets.com/api/stripe-webhook`
3. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. After save, click the endpoint -> **Signing secret** -> reveal -> copy (`whsec_...`) -> paste into `STRIPE_WEBHOOK_SECRET`.

### 4. Redeploy
Cloudflare Pages auto-deploys on the next git push. Or use **Deployments -> Retry deployment** to pick up new env vars immediately.

## How checkout works

**Gold signup:** user enters email -> `/api/checkout` creates a Stripe Checkout session -> user pays -> Stripe redirects to `/api/checkout-success` -> we verify the payment, optionally store the user as Gold in Cloudflare KV, issue a 30-day session JWT, redirect to `/app.html?token=...`.

**Ongoing:** `stripe-webhook` keeps tier in sync — downgrades to Free on cancellation.

**Returning user:** session JWT persists 30 days in `localStorage`. After expiry, user re-enters email at checkout; Stripe recognizes the existing customer by email and won't double-charge.

## User data storage

If a Cloudflare KV namespace is bound as `USERS`, users are stored at key `user:<email>`. Value: `{ email, tier, stripeCustomerId, subscriptionId, updatedAt }`.

## What's still stubbed

- **Picks pipeline:** `events.js` attaches demo picks to the top event of each league. Real picks come from you.
- **Tapology scraping:** not wired yet. ESPN events carry matchups; a `fighter-stats` function that scrapes Tapology on demand is next.
- **Community posting:** `community.html` shows pinned demo threads. Full threaded forum is a later build.
