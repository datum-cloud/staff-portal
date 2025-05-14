import { createContextGenerator } from '../context';
import { Hono } from 'hono';
import {
  createHonoServer as createBunHonoServer,
  createGetLoadContext as createBunGetLoadContext,
} from 'react-router-hono-server/bun';

export const bunAdapter = async (app: Hono) => {
  const getLoadContext = createContextGenerator(createBunGetLoadContext);

  return createBunHonoServer({
    app,
    getLoadContext,
  });
};
