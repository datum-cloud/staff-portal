import { API_BASENAME, api } from './routes/api';
import { bunAdapter } from '@/server/adapter/bun';
import { nodeAdapter } from '@/server/adapter/node';
import { Hono } from 'hono';

// Create the Hono app
export const app = new Hono();
app.route(API_BASENAME, api);

const isCypress = process.env.CYPRESS === 'true';

// Force Node runtime for Cypress
if (isCypress) {
  process.env.RUNTIME = 'node';
}

export default await (async () => {
  // Always use Node for Cypress
  if (isCypress || process.env.RUNTIME === 'node') {
    return await nodeAdapter(app);
  }

  // Only try Bun if we're not in Cypress and not explicitly set to Node
  try {
    return await bunAdapter(app);
  } catch {
    return await nodeAdapter(app);
  }
})();
