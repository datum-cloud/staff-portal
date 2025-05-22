import { API_BASENAME, api } from './routes/api';
import { bunAdapter } from '@/server/adapter/bun';
import { nodeAdapter } from '@/server/adapter/node';
import { env } from '@/utils/config';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { NONCE, secureHeaders, SecureHeadersVariables } from 'hono/secure-headers';

// Force Node runtime for Cypress
if (env.isCypress) {
  process.env.RUNTIME = 'node';
}

// Create the Hono app
export const app = new Hono<{ Variables: SecureHeadersVariables }>();

app.use(logger());
app.use(
  '*',
  secureHeaders({
    // Equivalent to xPoweredBy: false - Hono doesn't send x-powered-by by default
    xFrameOptions: 'SAMEORIGIN', // Part of frame-src: self
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'same-origin', // Matches your Helmet config
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      reportTo: env.isDev ? '/' : undefined,
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", ...(env.isDev ? ['ws:'] : [])],
      fontSrc: ["'self'"],
      frameSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      // Allow all script types with nonce
      scriptSrc: ["'strict-dynamic'", "'self'", NONCE],
      // Allow inline scripts with nonce
      scriptSrcElem: ["'strict-dynamic'", "'self'", NONCE],
      // Allow inline event handlers with nonce
      scriptSrcAttr: [NONCE],
      upgradeInsecureRequests: [],
    },
  })
);

app.route(API_BASENAME, api);

app.get('/_healthz', (c) => {
  return c.json({ status: 'healthy' });
});

app.get('/_readyz', (c) => {
  return c.json({ status: 'ready' });
});

app.get('/.well-known/appspecific/com.chrome.devtools.json', (c) => {
  return c.json({ message: 'DevTools configuration served!' });
});

export default await (async () => {
  // Always use Node for Cypress
  if (env.isCypress || process.env.RUNTIME === 'node') {
    return await nodeAdapter(app);
  }

  // Only try Bun if we're not in Cypress and not explicitly set to Node
  try {
    return await bunAdapter(app);
  } catch {
    return await nodeAdapter(app);
  }
})();
