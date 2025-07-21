import { createContextGenerator } from '../context';
import { EnvVariables } from '../iface';
import { honoLoggerMiddleware } from '../middleware';
import { Hono } from 'hono';
import {
  createGetLoadContext as createNodeGetLoadContext,
  createHonoServer as createNodeHonoServer,
} from 'react-router-hono-server/node';

export const nodeAdapter = async (app: Hono<{ Variables: EnvVariables }>) => {
  const getLoadContext = createContextGenerator(createNodeGetLoadContext as any);

  return createNodeHonoServer({
    app,
    getLoadContext,
    defaultLogger: false,
    configure: (app) => {
      app.use(honoLoggerMiddleware());
    },
  });
};
