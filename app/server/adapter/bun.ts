import { createContextGenerator } from '../context';
import {
  bindIncomingRequestSocketInfo,
  cleanUpgradeListeners,
  createWebSocket,
  getBuildMode,
  importBuild,
  patchUpgradeListener,
} from '../helper';
import { EnvVariables } from '../iface';
import { cache } from '../middleware';
import { logger } from '@/utils/logger';
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { createMiddleware } from 'hono/factory';
import { BlankEnv, Env } from 'hono/types';
import { createRequestHandler } from 'react-router';
import { createGetLoadContext, HonoServerOptions } from 'react-router-hono-server/bun';

export async function createHonoServer<E extends Env = BlankEnv>(options?: HonoServerOptions<E>) {
  const basename = import.meta.env.REACT_ROUTER_HONO_SERVER_BASENAME;
  const mergedOptions: HonoServerOptions<E> = {
    ...options,
    port:
      options?.port || Number(options?.customBunServer?.port) || Number(process.env.PORT) || 3000,
    defaultLogger: options?.defaultLogger ?? false,
  };
  const mode = getBuildMode();
  const PRODUCTION = mode === 'production';
  const clientBuildPath = `${import.meta.env.REACT_ROUTER_HONO_SERVER_BUILD_DIRECTORY}/client`;
  const app = new Hono<E>(mergedOptions.app);
  const { upgradeWebSocket, injectWebSocket } = await createWebSocket({
    app,
    enabled: mergedOptions.useWebSocket ?? false,
  });

  if (!PRODUCTION) {
    app.use(bindIncomingRequestSocketInfo());
  }

  /**
   * Add optional middleware that runs before any built-in middleware, including assets serving.
   */
  await mergedOptions.beforeAll?.(app);

  /**
   * Serve assets files from build/client/assets
   */
  app.use(
    `/${import.meta.env.REACT_ROUTER_HONO_SERVER_ASSETS_DIR}/*`,
    cache(60 * 60 * 24 * 365), // 1 year
    serveStatic({
      root: clientBuildPath,
      ...mergedOptions.serveStaticOptions?.clientAssets,
    })
  );

  /**
   * Serve public files
   */
  app.use(
    '*',
    cache(60 * 60), // 1 hour
    serveStatic({
      root: PRODUCTION ? clientBuildPath : './public',
      ...mergedOptions.serveStaticOptions?.publicAssets,
    })
  );

  /**
   * Add optional middleware
   */
  if (mergedOptions.useWebSocket) {
    await mergedOptions.configure(app, { upgradeWebSocket });
  } else {
    await mergedOptions.configure?.(app);
  }

  /**
   * Create a React Router Hono app and bind it to the root Hono server using the React Router basename
   */
  const reactRouterApp = new Hono<E>({
    strict: false,
  });

  reactRouterApp.use(async (c, next) => {
    const build = await importBuild();

    return createMiddleware(async (c) => {
      const requestHandler = createRequestHandler(build, mode);
      const loadContext = mergedOptions.getLoadContext?.(c, { build, mode });
      return requestHandler(
        c.req.raw,
        loadContext instanceof Promise ? await loadContext : loadContext
      );
    })(c, next);
  });

  app.route(`${basename}`, reactRouterApp);

  // Patch https://github.com/remix-run/react-router/issues/12295
  if (basename) {
    app.route(`${basename}.data`, reactRouterApp);
  }

  let server = {
    ...mergedOptions.customBunServer,
    fetch: app.fetch,
    port: mergedOptions.port,
    development: !PRODUCTION,
  };

  if (PRODUCTION) {
    server = injectWebSocket(server);
  } else if (globalThis.__viteDevServer?.httpServer) {
    // You wonder why I'm doing this?
    // It is to make the dev server work with `hono/node-ws`
    const httpServer = globalThis.__viteDevServer.httpServer;

    // // Remove all user-defined upgrade listeners except HMR
    cleanUpgradeListeners(httpServer);

    // Bind `hono/node-ws` for you so you don't have to do it manually in `onServe`
    injectWebSocket(httpServer);

    // // Prevent user-defined upgrade listeners from upgrading `vite-hmr`
    patchUpgradeListener(httpServer);

    logger.info('🚧 Running in development mode');
  }

  return server;
}

export const bunAdapter = async (app: Hono<{ Variables: EnvVariables }>) => {
  const getLoadContext = createContextGenerator(createGetLoadContext as any);

  return createHonoServer({
    app,
    getLoadContext,
  });
};
