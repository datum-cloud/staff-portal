import { initPluginRegistry } from '@/modules/plugins/server';
import { pluginsRoutes } from '@/modules/plugins/server/routes';
import { EnvVariables } from '@/server/iface';
import { assistantRoutes } from '@/server/routes/assistant';
import { chainsawTestsRoutes } from '@/server/routes/chainsaw-tests';
import { clusterRoutes } from '@/server/routes/cluster';
import { graphqlRoutes } from '@/server/routes/graphql';
import { internalRoutes } from '@/server/routes/internal';
import { metricsRoutes } from '@/server/routes/metrics';
import { usageRoutes } from '@/server/routes/usage';
import { Hono } from 'hono';

const API_BASENAME = '/api';

// Create an API Hono app
const api = new Hono<{ Variables: EnvVariables }>();

// Public endpoint (no auth required)
api.get('/', async (c) => {
  return c.json({ message: 'Staff API' });
});

// Feature routes — each owns its auth + handlers in its own file.
api.route('/internal', internalRoutes);
api.route('/metrics', metricsRoutes);
api.route('/assistant', assistantRoutes);
api.route('/chainsaw-tests', chainsawTestsRoutes);
api.route('/cluster', clusterRoutes);
api.route('/graphql', graphqlRoutes);
api.route('/usage', usageRoutes);
api.route('/plugins', pluginsRoutes);

// Start the plugin registry (idempotent) at module load.
initPluginRegistry();

export { api, API_BASENAME };
