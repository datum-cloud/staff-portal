/**
 * Pure extension selection + path matching — CLIENT-SAFE, no React, no side
 * effects. Ported from cloud-portal, adapted for the platform-scoped
 * extension types (`portal.nav/platform` / `portal.page/platform` /
 * `portal.resource/platform` — see `types.ts`); no card extension exists yet.
 *
 * A plugin mount receives a splat (`*`) path relative to its mount root and
 * must decide which `portal.page/platform` extension renders. Matching, param
 * extraction, and specificity ranking are delegated to react-router's own
 * matcher (`matchRoutes`) so plugin paths resolve with exactly the same
 * semantics as host routes — `:params` and nested segments included.
 *
 * `portal.resource/platform` extensions don't need path matching at all — the
 * host reads the flat list directly (see `getResourceExtensions`, used by
 * `app/routes/customer/resource/index.tsx`) since there's no plugin-rendered
 * page for them to match into.
 */
import {
  EXTENSION_NAV_PLATFORM,
  EXTENSION_PAGE_PLATFORM,
  EXTENSION_RESOURCE_PLATFORM,
  type NavPlatformExtension,
  type PagePlatformExtension,
  type PluginExtension,
  type PublicPlugin,
  type ResourcePlatformExtension,
} from '@/modules/plugins/types';
import { matchRoutes, type RouteObject } from 'react-router';

/**
 * The browser-safe manifest projection served on `PublicPlugin` — the same
 * shape the mount loader and `GET /api/plugins` return. Omits `sdk` (host-side
 * concern) but carries everything the client runtime renders from:
 * `remoteEntry`, `exposedModules`, and `extensions`.
 */
export type ClientPluginManifest = PublicPlugin['manifest'];

/** Result of matching a splat path against the plugin's page extensions. */
export interface PageMatch {
  page: PagePlatformExtension;
  params: Record<string, string | undefined>;
}

// The manifest is schema-validated server-side before it reaches the browser
// (see app/modules/plugins/manifest.schema.ts), so these guards only narrow the
// discriminated union — they are not defending against malformed data.
function isPageExtension(ext: PluginExtension): ext is PagePlatformExtension {
  return ext.type === EXTENSION_PAGE_PLATFORM;
}
function isNavExtension(ext: PluginExtension): ext is NavPlatformExtension {
  return ext.type === EXTENSION_NAV_PLATFORM;
}
function isResourceExtension(ext: PluginExtension): ext is ResourcePlatformExtension {
  return ext.type === EXTENSION_RESOURCE_PLATFORM;
}

/** Extract the `portal.page/platform` extensions from a manifest. */
export function getPageExtensions(manifest: ClientPluginManifest): PagePlatformExtension[] {
  return manifest.extensions.filter(isPageExtension);
}

/** Extract the `portal.nav/platform` extensions, sorted by `order` then title. */
export function getNavExtensions(manifest: ClientPluginManifest): NavPlatformExtension[] {
  return manifest.extensions.filter(isNavExtension).sort(byOrderThenTitle);
}

/** Extract the `portal.resource/platform` extensions, sorted by label. */
export function getResourceExtensions(manifest: ClientPluginManifest): ResourcePlatformExtension[] {
  return manifest.extensions
    .filter(isResourceExtension)
    .sort((a, b) => a.properties.label.localeCompare(b.properties.label));
}

function byOrderThenTitle(
  a: { properties: { order?: number; title: string } },
  b: { properties: { order?: number; title: string } }
): number {
  const orderA = a.properties.order ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.properties.order ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return a.properties.title.localeCompare(b.properties.title);
}

/**
 * Normalize a plugin-declared page path into a react-router route path.
 * Plugin paths are relative to the mount, so leading/trailing slashes are
 * stripped; an empty path (the plugin's index page) becomes the mount root.
 */
export function normalizePagePath(path: string): string {
  return path.replace(/^\/+/, '').replace(/\/+$/, '');
}

/** Normalize the incoming splat into an absolute pathname for matching. */
function normalizeSplat(splat: string): string {
  const trimmed = splat.replace(/^\/+/, '').replace(/\/+$/, '');
  return `/${trimmed}`;
}

/**
 * Match a splat path (the `*` segment under the mount) against a plugin's page
 * extensions. Returns the most-specific matching page plus its extracted
 * params, or `null` when nothing matches (the mount then renders in-app 404).
 *
 * Ranking, param extraction, and `:param` / nested-segment semantics are all
 * react-router's — we build a flat route list keyed by index and let
 * `matchRoutes` pick the winner, then map the winning route id back to the
 * originating extension.
 */
export function matchPluginPage(pages: PagePlatformExtension[], splat: string): PageMatch | null {
  if (pages.length === 0) return null;

  const routes: RouteObject[] = pages.map((page, index) => ({
    id: String(index),
    path: normalizePagePath(page.properties.path),
  }));

  const matches = matchRoutes(routes, normalizeSplat(splat));
  if (!matches || matches.length === 0) return null;

  // Flat routes yield a single match; take the deepest to be safe.
  const winner = matches[matches.length - 1];
  const index = Number(winner.route.id);
  const page = pages[index];
  if (!page) return null;

  return { page, params: winner.params };
}
