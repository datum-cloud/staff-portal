import { createContextGenerator } from '../context';
import { EnvVariables } from '@/server/iface';
import { Hono } from 'hono';
import { createGetLoadContext, createHonoServer } from 'react-router-hono-server/bun';

export const bunAdapter = async (app: Hono<{ Variables: EnvVariables }>) => {
  const getLoadContext = createContextGenerator(createGetLoadContext as any);

  return createHonoServer({
    app,
    getLoadContext,
  });
};
