import { api, API_BASENAME } from './routes/api';
import { authenticator, initializeAuthenticator } from '@/modules/auth';
import { bunAdapter } from '@/server/adapter/bun';
import { nodeAdapter } from '@/server/adapter/node';
import { EnvVariables } from '@/server/iface';
import { honoLoggerMiddleware, requestContextMiddleware } from '@/server/middleware';
import { env } from '@/utils/config/env.server';
import { logger } from '@/utils/logger';
import { otel } from '@hono/otel';
import { prometheus } from '@hono/prometheus';
import { Hono } from 'hono';
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

app.use(requestId());

app.use(requestContextMiddleware());

app.use(honoLoggerMiddleware());

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
      connectSrc: [
        "'self'",
        ...(env.isDev ? ['ws:'] : []),
        env.API_URL,
        'https://*.marker.io',
        'https://*.sentry.io',
      ],
      fontSrc: ["'self'"],
      frameSrc: ["'self'", 'https://*.marker.io', 'https://*.sentry.io'],
      imgSrc: ["'self'", 'data:'],
      // Allow all script types with nonce
      scriptSrc: ["'strict-dynamic'", "'self'", NONCE],
      // Allow inline scripts with nonce
      scriptSrcElem: ["'strict-dynamic'", "'self'", NONCE],
      // Allow inline event handlers with nonce
      scriptSrcAttr: [NONCE],
      // Allow inline styles for third-party widgets
      styleSrc: ["'self'", "'unsafe-inline'"],
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
  // Initialize authenticator strategies (non-blocking)
  initializeAuthenticator(authenticator).catch((error) => {
    logger.error('Authenticator initialization failed', { error: error.message });
  });

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
