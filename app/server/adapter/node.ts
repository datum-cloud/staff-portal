import { createContextGenerator } from '../context';
import { Hono } from 'hono';
import {
  createHonoServer as createNodeHonoServer,
  createGetLoadContext as createNodeGetLoadContext,
} from 'react-router-hono-server/node';

export const nodeAdapter = async (app: Hono) => {
  const getLoadContext = createContextGenerator(createNodeGetLoadContext);

  return createNodeHonoServer({
    app,
    getLoadContext,
  });
};
