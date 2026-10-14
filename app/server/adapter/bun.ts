import { createContextGenerator } from '../context';
import { EnvVariables } from '../iface';
import { honoLoggerMiddleware } from '../middleware';
import { Hono } from 'hono';
import { createGetLoadContext, createHonoServer } from 'react-router-hono-server/bun';

/**
 * Upper bound on draining in-flight requests after SIGTERM. The adapter's
 * `server.stop()` waits for every open response, including assistant streams,
 * so exit anyway once this passes. Keep it under the pod's
 * terminationGracePeriodSeconds (30s).
 */
const SHUTDOWN_TIMEOUT_MS = 25_000;

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    setTimeout(() => {
      console.warn('⚠️ Shutdown timeout reached with requests still in-flight');
      process.exit(0);
    }, SHUTDOWN_TIMEOUT_MS).unref();
  });
}

export const bunAdapter = async (app: Hono<{ Variables: EnvVariables }>) => {
  const getLoadContext = createContextGenerator(createGetLoadContext as any);

  return createHonoServer({
    app,
    getLoadContext,
    defaultLogger: false,
    customBunServer: {
      // Must stay above the gateway's upstream connectionIdleTimeout (60s, in
      // config/base/backend-traffic-policy.yaml) so Envoy, not Bun, closes idle
      // keep-alive connections. Bun's 10s default let Envoy reuse a connection
      // Bun was closing, failing the request before headers.
      idleTimeout: 75,
    },
    // Passing this makes the adapter handle SIGTERM in production: it stops
    // accepting connections, waits for in-flight requests, runs this, then
    // exits. Observability flushes from its own signal listener
    // (observability/index.ts), since start.js initializes it outside this
    // bundle.
    onGracefulShutdown: () => {},
    configure: (app) => {
      app.use(honoLoggerMiddleware());
    },
  });
};
