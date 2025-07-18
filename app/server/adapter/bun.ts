import { createContextGenerator } from '../context';
import { EnvVariables } from '../iface';
import { honoLoggerMiddleware } from '../middleware';
import { Hono } from 'hono';
import { createGetLoadContext, createHonoServer } from 'react-router-hono-server/bun';

export const bunAdapter = async (app: Hono<{ Variables: EnvVariables }>) => {
  const getLoadContext = createContextGenerator(createGetLoadContext as any);

  return createHonoServer({
    app,
    getLoadContext,
    defaultLogger: false,
    configure: (app) => {
      app.use(honoLoggerMiddleware());
    },
  });
};
