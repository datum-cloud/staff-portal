/**
 * Module Federation host runtime — CLIENT-ONLY. Ported from cloud-portal's
 * `app/modules/plugins/client/federation-host.ts`.
 *
 * Owns the single host federation instance and loads plugin components through
 * it. The host pins `react`, `react-dom`, `react-router`, and
 * `@tanstack/react-query` as shared singletons backed by the host's own module
 * instances (`lib` getters), so every plugin renders with the host's design
 * system, router, and query client — a plugin can never ship a divergent React
 * or a second Router (`useParams`, `Link`, `useNavigate` behave identically
 * inside plugin pages).
 *
 * Assets load exclusively through the same-origin proxy: a plugin's remote
 * entry is `/api/plugins/<slug>/<remoteEntry>` and its chunks resolve relative
 * to `/api/plugins/<slug>/`. Plugin origins are never exposed to the browser.
 */
import { parseCodeRef, pickCodeRefExport } from './code-ref';
import * as DatumUiBadge from '@datum-cloud/datum-ui/badge';
import * as DatumUiButton from '@datum-cloud/datum-ui/button';
import * as DatumUiCard from '@datum-cloud/datum-ui/card';
import * as DatumUiIcons from '@datum-cloud/datum-ui/icons';
import * as DatumUiSkeleton from '@datum-cloud/datum-ui/skeleton';
import { init, loadRemote, registerRemotes } from '@module-federation/runtime';
import * as ReactQuery from '@tanstack/react-query';
import reactQueryPkg from '@tanstack/react-query/package.json';
import type { ComponentType } from 'react';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import * as ReactRouter from 'react-router';
import reactRouterPkg from 'react-router/package.json';

// Distinct from cloud-portal's `datum-portal-host` so the two hosts' MF
// instances never collide if code is ever shared/co-loaded.
const HOST_NAME = 'datum-staff-portal-host';

/**
 * Curated `@datum-cloud/datum-ui` subpaths shared with plugins. Each is a
 * host-backed singleton keyed by its full import specifier, so a plugin's
 * `import { Badge } from '@datum-cloud/datum-ui/badge'` resolves to the host's
 * copy — identical styling, zero duplication. Grow this list additively as
 * new plugins need more of the design system; start minimal.
 *
 * datum-ui does not export its package.json, and version negotiation is
 * deliberately disabled (`requiredVersion: false` — the host copy always wins),
 * so the advertised version is nominal.
 */
const DATUM_UI_SHARED: Record<string, unknown> = {
  '@datum-cloud/datum-ui/badge': DatumUiBadge,
  '@datum-cloud/datum-ui/button': DatumUiButton,
  '@datum-cloud/datum-ui/card': DatumUiCard,
  '@datum-cloud/datum-ui/icons': DatumUiIcons,
  '@datum-cloud/datum-ui/skeleton': DatumUiSkeleton,
};

/**
 * Host-provided shared singletons. `singleton: true` guarantees one instance
 * across host + all plugins; `requiredVersion: false` means the host does not
 * reject a plugin over a version delta — the host's `lib` instance always wins,
 * which is the entire point (plugins consume the host's React/router/query).
 */
function hostShared() {
  return {
    react: {
      version: React.version,
      lib: () => React,
      shareConfig: { singleton: true, requiredVersion: false as const, eager: true },
    },
    'react-dom': {
      version: ReactDOM.version,
      lib: () => ReactDOM,
      shareConfig: { singleton: true, requiredVersion: false as const, eager: true },
    },
    // React 19 splits `createRoot`/`hydrateRoot` into this subpath. A plugin
    // whose remote entry references `react-dom/client` (even only from its own
    // standalone preview harness — MF's build-time scan doesn't distinguish)
    // needs the host to bridge it explicitly; without an entry here, MF has
    // nothing to bridge the plugin's `react-dom/client` import against and
    // fails at container load, before any exposed component renders.
    'react-dom/client': {
      version: ReactDOM.version,
      lib: () => ReactDOMClient,
      shareConfig: { singleton: true, requiredVersion: false as const, eager: true },
    },
    'react-router': {
      version: reactRouterPkg.version,
      lib: () => ReactRouter,
      shareConfig: { singleton: true, requiredVersion: false as const, eager: true },
    },
    '@tanstack/react-query': {
      version: reactQueryPkg.version,
      lib: () => ReactQuery,
      shareConfig: { singleton: true, requiredVersion: false as const, eager: true },
    },
    ...Object.fromEntries(
      Object.entries(DATUM_UI_SHARED).map(([specifier, mod]) => [
        specifier,
        {
          version: '1.0.0',
          lib: () => mod,
          shareConfig: { singleton: true, requiredVersion: false as const, eager: true },
        },
      ])
    ),
  };
}

/**
 * Identifies a plugin remote. Two names are deliberately distinct:
 * - `remoteName` is the Module Federation container name (the manifest `name`,
 *   e.g. `workloads.staff-portal.datumapis.com`) — what `loadRemote` keys on
 *   and what the plugin bundle self-identifies as.
 * - `slug` is the URL/asset-proxy segment (e.g. `workloads`) — only the entry
 *   URL uses it.
 */
export interface PluginRemoteRef {
  remoteName: string;
  slug: string;
  remoteEntry: string;
}

let hostInitialized = false;
/** Remote (container) names already registered this session. */
const registeredRemotes = new Set<string>();

/** Same-origin asset-proxy remote entry URL for a plugin. */
export function remoteEntryUrl(slug: string, remoteEntry: string): string {
  return `/api/plugins/${slug}/${remoteEntry.replace(/^\/+/, '')}`;
}

function ensureHost(): void {
  if (hostInitialized) return;
  init({
    name: HOST_NAME,
    remotes: [],
    shared: hostShared(),
  });
  hostInitialized = true;
}

/**
 * Module Federation entry type for plugin remotes. Plugin remote entries are ES
 * modules (that's what `@module-federation/vite` emits), so the runtime must
 * load them via dynamic `import()` — a classic `<script>` throws "Cannot use
 * import statement outside a module". Required for every plugin.
 */
export const PLUGIN_REMOTE_ENTRY_TYPE = 'module' as const;

/**
 * Build the Module Federation remote descriptor for a plugin. Pure — no host
 * init, no registration.
 */
export function buildPluginRemote({ remoteName, slug, remoteEntry }: PluginRemoteRef): {
  name: string;
  entry: string;
  type: typeof PLUGIN_REMOTE_ENTRY_TYPE;
} {
  return {
    name: remoteName,
    entry: remoteEntryUrl(slug, remoteEntry),
    type: PLUGIN_REMOTE_ENTRY_TYPE,
  };
}

/**
 * Register a plugin's remote entry with the host, keyed by container name.
 * Idempotent: re-registering the same remote (e.g. re-navigating into the
 * plugin) is a no-op, and `registerRemotes` itself replaces an existing entry
 * rather than throwing.
 */
export function registerPluginRemote(ref: PluginRemoteRef): void {
  ensureHost();
  if (registeredRemotes.has(ref.remoteName)) return;
  registerRemotes([buildPluginRemote(ref)]);
  registeredRemotes.add(ref.remoteName);
}

/**
 * Load a plugin component by `$codeRef`. Ensures the plugin's remote is
 * registered, resolves the exposed module through Module Federation, and picks
 * the referenced export. Throws when the module or export cannot be resolved so
 * the caller's ErrorBoundary renders a friendly failure instead of a blank
 * page.
 */
export async function loadPluginComponent(
  ref: PluginRemoteRef,
  codeRef: string
): Promise<ComponentType<unknown>> {
  registerPluginRemote(ref);

  const parsed = parseCodeRef(codeRef);
  const loaded = await loadRemote<Record<string, unknown>>(`${ref.remoteName}/${parsed.module}`);

  const component = pickCodeRefExport<ComponentType<unknown>>(loaded, parsed);
  if (typeof component !== 'function') {
    throw new Error(
      `Plugin "${ref.slug}" code ref "${codeRef}" did not resolve to a component ` +
        `(module "${parsed.module}"${parsed.exportName ? `, export "${parsed.exportName}"` : ''}).`
    );
  }
  return component;
}
