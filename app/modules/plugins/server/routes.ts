/**
 * Plugin HTTP routes (same-origin mediation). Ported from cloud-portal's
 * `app/modules/plugins/server/routes.ts`, adapted to staff-portal's Hono
 * sub-router convention (`app/server/routes/cluster.ts` etc. — a router
 * exported from its own file, mounted with one `api.route(...)` line in
 * `app/server/routes/api.ts`) and its own `authMiddleware()`.
 *
 * Mounted at `/api/plugins`. The asset proxy can serve plugin bundles without
 * a session (the browser only ever talks to the staff-portal origin) — it's
 * gated by "known plugin slug", not user identity, same as cloud-portal.
 * Trust-sensitive routes (the list endpoint) gate themselves.
 *
 * - `GET /api/plugins`         → sanitized plugin list (session-gated)
 * - `ALL /api/plugins/:slug/*` → asset proxy
 *
 * Plugin API calls are NOT mediated here — every call a plugin issues goes
 * through staff-portal's existing `/api/internal/*` proxy, unchanged by this
 * module.
 */
import { toPublicPlugin } from '../sanitize';
import type { PublicPlugin } from '../types';
import { getPlugin, getPlugins } from './index';
import { withCaBundle } from './plugin-fetch';
import { EnvVariables } from '@/server/iface';
import { authMiddleware } from '@/server/middleware';
import { Hono } from 'hono';

/** Strips a known prefix from a pathname; returns the remaining sub-path. */
function subPathAfter(pathname: string, prefix: string): string {
  return pathname.startsWith(prefix) ? pathname.slice(prefix.length) : '';
}

/**
 * Safely resolves an asset sub-path against a plugin's base URL. Returns null
 * if the resolved URL would escape the base origin or path prefix (traversal).
 */
function resolveAssetUrl(baseURL: string, assetPath: string, search: string): string | null {
  // Reject traversal in both raw and percent-decoded forms.
  let decoded = assetPath;
  try {
    decoded = decodeURIComponent(assetPath);
  } catch {
    return null; // malformed percent-encoding
  }
  if ([assetPath, decoded].some((p) => p.split('/').some((seg) => seg === '..'))) return null;

  const base = new URL(baseURL.endsWith('/') ? baseURL : `${baseURL}/`);
  const target = new URL(assetPath, base);
  if (target.origin !== base.origin) return null;
  if (!target.pathname.startsWith(base.pathname)) return null;

  return `${target.origin}${target.pathname}${search}`;
}

export const pluginsRoutes = new Hono<{ Variables: EnvVariables }>();

// ── Sanitized list ───────────────────────────────────────────────────────
pluginsRoutes.get('/', authMiddleware(), (c) => {
  const plugins = getPlugins()
    .map(toPublicPlugin)
    .filter((p): p is PublicPlugin => p !== null);
  return c.json(plugins);
});

// ── Asset proxy (no auth; only known slugs) ────────────────────────────────
pluginsRoutes.all('/:slug/*', async (c) => {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    return c.json({ error: 'Method not allowed' }, 405);
  }

  const slug = c.req.param('slug');
  const plugin = getPlugin(slug);
  if (!plugin) return c.json({ error: 'Unknown plugin' }, 404);

  const url = new URL(c.req.url);
  const assetPath = subPathAfter(url.pathname, `/api/plugins/${slug}/`);
  const target = resolveAssetUrl(plugin.spec.assets.baseURL, assetPath, url.search);
  if (!target) return c.json({ error: 'Invalid asset path' }, 400);

  const controller = new AbortController();
  c.req.raw.signal?.addEventListener('abort', () => controller.abort());

  // Forward only cache/range validators — never cookies or authorization.
  const forwardHeaders: Record<string, string> = {};
  for (const name of ['range', 'if-none-match', 'if-modified-since', 'accept', 'accept-encoding']) {
    const value = c.req.header(name);
    if (value) forwardHeaders[name] = value;
  }

  try {
    const upstream = await fetch(
      target,
      withCaBundle(
        { method: c.req.method, headers: forwardHeaders, signal: controller.signal },
        plugin.spec.assets.caBundle
      )
    );

    const headers = new Headers();
    // Preserve content type + conditional-request validators from upstream.
    for (const name of [
      'content-type',
      'content-length',
      'etag',
      'last-modified',
      'accept-ranges',
      'content-range',
    ]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set('X-Content-Type-Options', 'nosniff');
    // Dev-sourced bundles change under the same URL; never cache them.
    headers.set(
      'Cache-Control',
      plugin.devMode ? 'no-store' : 'public, max-age=31536000, immutable'
    );

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(null, { status: 499 });
    }
    return c.json({ error: error instanceof Error ? error.message : 'Asset proxy error' }, 502);
  }
});
