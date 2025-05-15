import { API_BASENAME, api } from './routes/api';
import { bunAdapter } from '@/server/adapter/bun';
import { nodeAdapter } from '@/server/adapter/node';
import { Hono } from 'hono';
import { compress } from 'hono-compress';
import { logger } from 'hono/logger';
import { NONCE, secureHeaders, SecureHeadersVariables } from 'hono/secure-headers';

const MODE = process.env.NODE_ENV ?? 'development';
const IS_PROD = MODE === 'production';
const IS_DEV = MODE === 'development';
const IS_CYPRESS = process.env.CYPRESS === 'true';

// Force Node runtime for Cypress
if (IS_CYPRESS) {
  process.env.RUNTIME = 'node';
}

// Create the Hono app
export const app = new Hono<{ Variables: SecureHeadersVariables }>();

app.use(logger());
app.use(compress());

// Add security headers
app.use(
  '*',
  secureHeaders({
    // Equivalent to xPoweredBy: false - Hono doesn't send x-powered-by by default
    xFrameOptions: 'SAMEORIGIN', // Part of frame-src: self
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'same-origin', // Matches your Helmet config
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      reportTo: IS_DEV ? '/' : undefined,
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", ...(IS_DEV ? ['ws:'] : [])],
      fontSrc: ["'self'"],
      frameSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      scriptSrc: ["'strict-dynamic'", "'self'", NONCE],
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

export default await (async () => {
  // Always use Node for Cypress
  if (IS_CYPRESS || process.env.RUNTIME === 'node') {
    return await nodeAdapter(app);
  }

  // Only try Bun if we're not in Cypress and not explicitly set to Node
  try {
    return await bunAdapter(app);
  } catch {
    return await nodeAdapter(app);
  }
})();
