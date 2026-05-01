import { onRequest as events } from './functions/api/events.js';
import { onRequest as checkout } from './functions/api/checkout.js';
import { onRequest as checkoutSuccess } from './functions/api/checkout-success.js';
import { onRequest as stripeWebhook } from './functions/api/stripe-webhook.js';

const API_ROUTES = {
  '/api/events': events,
  '/api/checkout': checkout,
  '/api/checkout-success': checkoutSuccess,
  '/api/stripe-webhook': stripeWebhook,
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const handler = API_ROUTES[url.pathname];

    if (handler) {
      return handler({
        request,
        env,
        waitUntil: typeof ctx.waitUntil === 'function' ? ctx.waitUntil.bind(ctx) : () => {},
        passThroughOnException: typeof ctx.passThroughOnException === 'function'
          ? ctx.passThroughOnException.bind(ctx)
          : () => {},
        params: {},
        data: {},
      });
    }

    if (url.pathname === '/dashboard' || url.pathname === '/members') {
      return serveAsset(request, env, '/app.html');
    }

    return serveAsset(request, env, url.pathname);
  },
};

async function serveAsset(request, env, pathname) {
  const assetUrl = new URL(request.url);
  assetUrl.pathname = pathname;
  const response = await env.SITE_ASSETS.fetch(new Request(assetUrl.toString(), request));
  return withStaticHeaders(response, pathname);
}

function withStaticHeaders(response, pathname) {
  const headers = new Headers(response.headers);
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (pathname.startsWith('/assets/')) {
    headers.set('Cache-Control', 'public, max-age=86400');
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
