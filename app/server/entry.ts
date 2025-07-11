import { api, API_BASENAME } from './routes/api';
import { bunAdapter } from '@/server/adapter/bun';
import { nodeAdapter } from '@/server/adapter/node';
import { EnvVariables } from '@/server/iface';
import { env } from '@/utils/config/env.server';
import { otel } from '@hono/otel';
import { prometheus } from '@hono/prometheus';
import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import { logger } from 'hono/logger';
import { requestId } from 'hono/request-id';
import { NONCE, secureHeaders } from 'hono/secure-headers';

// Create the Hono app
const app = new Hono<{ Variables: EnvVariables }>();

// Prometheus metrics & OpenTelemetry
if (env.isOtelEnabled) {
  const { printMetrics, registerMetrics } = prometheus({ collectDefaultMetrics: true });
  app.use('*', registerMetrics);
  app.get('/metrics', printMetrics);
  app.use('*', otel());
}

// Custom logger that filters out health check endpoints
const customLogger: MiddlewareHandler = async (c, next) => {
  const path = c.req.path;

  // Skip logging for health check endpoints
  if (path === '/_healthz' || path === '/_readyz' || path === '/metrics') {
    return next();
  }

  // Use the default logger for other endpoints
  return logger()(c, next);
};

app.use(customLogger);
app.use(requestId());
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
      connectSrc: ["'self'", ...(env.isDev ? ['ws:'] : []), env.API_URL],
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
  // Force Node runtime for Cypress
  if (env.isCypress) {
    process.env.RUNTIME = 'node';
  }

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
