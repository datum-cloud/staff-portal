import { createContextGenerator } from '../context';
import { EnvVariables } from '../iface';
import { honoLoggerMiddleware } from '../middleware';
import { Hono } from 'hono';
import type { Server } from 'node:http';
import { createGetLoadContext, createHonoServer } from 'react-router-hono-server/node';

/**
 * Upper bound on draining in-flight requests after SIGTERM. `server.close()`
 * waits for every open response, including assistant streams, so exit anyway
 * once this passes. Keep it under the pod's terminationGracePeriodSeconds (30s).
 */
const SHUTDOWN_TIMEOUT_MS = 25_000;

const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM'] as const;

for (const signal of SHUTDOWN_SIGNALS) {
  process.once(signal, () => {
    setTimeout(() => {
      console.warn('⚠️ Shutdown timeout reached with requests still in-flight');
      process.exit(0);
    }, SHUTDOWN_TIMEOUT_MS).unref();
  });
}

function drainOnShutdown(server: Server) {
  let draining = false;
  const drain = () => {
    if (draining) return;
    draining = true;
    server.close(() => process.exit(0));
    server.closeIdleConnections();
    setInterval(() => server.closeIdleConnections(), 1_000).unref();
  };
  for (const signal of SHUTDOWN_SIGNALS) process.once(signal, drain);
}

function keepAliveBeyondGateway(server: Server) {
  // Must stay above the gateway's upstream connectionIdleTimeout (60s, in
  // config/base/backend-traffic-policy.yaml) so Envoy, not the portal, closes
  // idle keep-alive connections. A shorter timeout lets Envoy reuse a
  // connection the portal is closing, failing the request before headers.
  server.keepAliveTimeout = 75_000;
  server.headersTimeout = 76_000;
}

export const nodeAdapter = async (app: Hono<{ Variables: EnvVariables }>) => {
  const getLoadContext = createContextGenerator(createGetLoadContext as any);

  return createHonoServer({
    app,
    getLoadContext,
    defaultLogger: false,
    onServe: (server) => {
      if (!import.meta.env.PROD) return;
      keepAliveBeyondGateway(server as Server);
      drainOnShutdown(server as Server);
    },
    configure: (app) => {
      app.use(honoLoggerMiddleware());
    },
  });
};
