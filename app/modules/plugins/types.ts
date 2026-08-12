/**
 * Portal Plugin System — shared contract types.
 *
 * Ported from cloud-portal's `app/modules/plugins/types.ts`. This module is
 * the single source of truth for the plugin contract shared between the
 * server registry (this module) and the client runtime. Pure types +
 * string-literal constants: no runtime logic and no server-only imports, so
 * it is safe to import from anywhere.
 *
 * Differences from cloud-portal's version (see the plan for why):
 * - Extensions are `portal.nav/platform` / `portal.page/platform`, not
 *   `.../project` — staff-portal's first plugin (Workloads) has no
 *   project/org resource-context param to nest under; it's a flat,
 *   platform-wide mount. Add a `.../project`-equivalent pair later if a
 *   staff-portal plugin ever needs one.
 * - No `portal.card/*` extension type yet — no home-page-card use case here.
 * - No `PortalPlugin` CRD / `portal.miloapis.com` constants, and
 *   `PluginRegistrySource` only has `'static'` — staff-portal has no
 *   production (CRD-watched) discovery path in v1. See `server/index.ts`.
 */

/** Default manifest path appended to `assets.baseURL` when none is declared. */
export const DEFAULT_MANIFEST_PATH = '/plugin-manifest.json';

/**
 * Host SDK the portal advertises to plugins. A manifest whose `sdk.range` does
 * not match this version is loaded as `Compatible=False` (never served).
 */
export const HOST_SDK_NAME = '@datum-cloud/portal-plugin-sdk';
export const HOST_SDK_VERSION = '1.0.0';

// ═══════════════════════════════════════════════════════════
// Registry sources
// ═══════════════════════════════════════════════════════════

/**
 * Where a registry entry originated. Only `static` exists today (synthesized
 * from `PORTAL_PLUGINS`, dev only). A CRD-watched or otherwise dynamically
 * discovered production source would add a variant here, following
 * cloud-portal's `'kubeconfig' | 'platform'` precedent.
 */
export type PluginRegistrySource = 'static';

// ═══════════════════════════════════════════════════════════
// PortalPlugin spec
// ═══════════════════════════════════════════════════════════

/** Whether the plugin requires an Active ServiceEntitlement to be visible. */
export type PluginEntitlementRequirement = 'Required' | 'None';

export interface PluginAssets {
  /** HTTPS origin (service-team-operated) serving the built plugin. */
  baseURL: string;
  /** Path to the manifest under `baseURL`. Defaults to {@link DEFAULT_MANIFEST_PATH}. */
  manifestPath: string;
  /** Optional PEM bundle for an internal CA fronting `baseURL`. Server-only. */
  caBundle?: string;
}

export interface PluginVisibility {
  entitlement: PluginEntitlementRequirement;
  /** Optional OpenFeature flag key gating visibility. */
  featureFlag?: string;
}

/**
 * The `spec` of a plugin entry. In dev, the static source synthesizes
 * equivalent specs so the downstream pipeline is identical to a future
 * production source.
 */
export interface PortalPluginSpec {
  /** Unique DNS label; the URL + asset-proxy segment. */
  slug: string;
  displayName: string;
  /** True when the winning plugin build is Deprecated. */
  deprecated: boolean;
  /** Platform-operator kill switch; suspended plugins are never served. */
  suspend: boolean;
  assets: PluginAssets;
  visibility: PluginVisibility;
  /** Rarely needed; assets are same-origin proxied. */
  contentSecurityPolicy?: string[];
}

// ═══════════════════════════════════════════════════════════
// plugin-manifest.json
// ═══════════════════════════════════════════════════════════

export const EXTENSION_NAV_PLATFORM = 'portal.nav/platform';
export const EXTENSION_PAGE_PLATFORM = 'portal.page/platform';
export const EXTENSION_RESOURCE_PLATFORM = 'portal.resource/platform';

/** The v1 extension types the host recognizes and renders. */
export const KNOWN_EXTENSION_TYPES = [
  EXTENSION_NAV_PLATFORM,
  EXTENSION_PAGE_PLATFORM,
  EXTENSION_RESOURCE_PLATFORM,
] as const;

export type KnownExtensionType = (typeof KNOWN_EXTENSION_TYPES)[number];

/** A single RBAC check that must pass for an extension to render. */
export interface PluginPermissionRequirement {
  group: string;
  resource: string;
  verb: string;
}

export interface PluginExtensionRequirements {
  permissions?: PluginPermissionRequirement[];
}

/**
 * A lazy reference into a manifest's `exposedModules`: `"ModuleName"` or
 * `"ModuleName.exportName"`. No plugin code loads until the extension renders.
 */
export interface CodeRef {
  $codeRef: string;
}

/** `portal.nav/platform` — top-level nav entry. */
export interface NavPlatformProperties {
  id: string;
  title: string;
  /** A lucide icon name, resolved by the host. Never plugin code. */
  icon: string;
  /** Path relative to the plugin's mount point. */
  path: string;
  order?: number;
}

export interface NavPlatformExtension {
  type: typeof EXTENSION_NAV_PLATFORM;
  properties: NavPlatformProperties;
  requirements?: PluginExtensionRequirements;
}

/** `portal.page/platform` — routed page under the plugin mount. */
export interface PagePlatformProperties {
  /** Path relative to the mount point; supports params and nesting. */
  path: string;
  component: CodeRef;
}

export interface PagePlatformExtension {
  type: typeof EXTENSION_PAGE_PLATFORM;
  properties: PagePlatformProperties;
  requirements?: PluginExtensionRequirements;
}

/**
 * `portal.resource/platform` — registers a resource kind into the
 * `/customers/resources` merged list (see
 * `app/routes/customer/resource/index.tsx`). Unlike nav/page extensions, this
 * declares data, not code: the host runs the search query itself (via its own
 * trusted `search.miloapis.com` client, scoped to the *viewing user's own*
 * credentials) and renders the results in its own trusted table — the plugin
 * never executes to produce this row data. Deliberately no `$codeRef` here;
 * see the extension's design note for why.
 */
export interface ResourcePlatformProperties {
  id: string;
  /**
   * Unique key for this type across the whole registry (e.g. "workload").
   * Used as the Type filter's option value and the row's `type`. Collisions
   * between two plugins declaring the same `type` aren't detected in v1.
   */
  type: string;
  label: string;
  /** A lucide icon name, resolved by the host (client/icon-map.ts). Never plugin code. */
  icon?: string;
  /** GVK the host queries via `search.miloapis.com`. */
  searchTarget: { group: string; version: string; kind: string };
  /** Dot-path into the raw resource for the Name column. Defaults to "metadata.name". */
  nameField?: string;
}

export interface ResourcePlatformExtension {
  type: typeof EXTENSION_RESOURCE_PLATFORM;
  properties: ResourcePlatformProperties;
  requirements?: PluginExtensionRequirements;
}

/**
 * An extension type the host does not recognize. Tolerated, not fatal: the
 * registry records it and excludes it from rendering. The `{type, properties,
 * requirements}` envelope keeps growth additive.
 */
export interface UnknownExtension {
  type: string;
  properties?: Record<string, unknown>;
  requirements?: PluginExtensionRequirements;
}

export type KnownPluginExtension =
  | NavPlatformExtension
  | PagePlatformExtension
  | ResourcePlatformExtension;

export type PluginExtension = KnownPluginExtension | UnknownExtension;

export interface PluginManifest {
  /** Canonical plugin id, e.g. `workloads.staff-portal.datumapis.com`. */
  name: string;
  version: string;
  sdk: {
    name: string;
    range: string;
  };
  /** Module Federation remote entry filename, relative to `assets.baseURL`. */
  remoteEntry: string;
  /** Map of exposed module name → source path. `$codeRef` targets live here. */
  exposedModules: Record<string, string>;
  extensions: PluginExtension[];
}

// ═══════════════════════════════════════════════════════════
// Registry entry (server-held; the resolved runtime view)
// ═══════════════════════════════════════════════════════════

export type PluginConditionType = 'Discovered' | 'Compatible' | 'Ready';
export type PluginConditionStatus = 'True' | 'False' | 'Unknown';

export interface PluginCondition {
  type: PluginConditionType | string;
  status: PluginConditionStatus;
  reason: string;
  message?: string;
}

/** Portal-resolved snapshot of a live manifest. */
export interface PluginManifestSnapshot {
  version: string;
  sdkRange: string;
  digest: string;
  fetchedAt: string;
  /** Extension type → count, e.g. `{ "portal.nav/platform": 1 }`. */
  extensions: Record<string, number>;
}

export interface PluginEntryStatus {
  observedGeneration?: number;
  conditions: PluginCondition[];
  manifest?: PluginManifestSnapshot;
}

/**
 * A single plugin as held in the server's in-memory registry. Carries the
 * spec, its provenance, the resolved manifest (absent when the manifest failed
 * to fetch or validate), and health conditions.
 */
export interface PluginRegistryEntry {
  spec: PortalPluginSpec;
  /** True for dev-sourced plugins (relaxed gating + "dev plugin" badge). */
  devMode: boolean;
  source: PluginRegistrySource;
  /** Resolved + validated manifest. Undefined when discovery failed. */
  manifest?: PluginManifest;
  /** `sha256:…` digest of the fetched manifest bytes. */
  manifestDigest?: string;
  status: PluginEntryStatus;
}

// ═══════════════════════════════════════════════════════════
// Public wire shape (GET /api/plugins) — sanitized for the browser
// ═══════════════════════════════════════════════════════════

/**
 * The browser-safe projection of a registry entry served by `GET /api/plugins`.
 * Deliberately omits `caBundle` and `assets.baseURL` — plugin origins are
 * never exposed to the browser. The client loads assets through
 * `/api/plugins/<slug>/…`; any plugin API calls go through staff-portal's
 * existing `/api/internal/*` proxy, never a plugin-declared backend.
 */
export interface PublicPlugin {
  slug: string;
  displayName: string;
  devMode: boolean;
  deprecated: boolean;
  source: PluginRegistrySource;
  manifest: {
    name: string;
    version: string;
    /** Filename to load via the asset proxy at `/api/plugins/<slug>/<remoteEntry>`. */
    remoteEntry: string;
    exposedModules: Record<string, string>;
    extensions: PluginExtension[];
  };
}
