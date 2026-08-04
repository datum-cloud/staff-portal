/**
 * Server-side plugin registry singleton + wiring.
 *
 * Ported from cloud-portal, trimmed: only the `static` (dev, `PORTAL_PLUGINS`)
 * source is wired up. cloud-portal's `kubeconfig` source and its production
 * `platform` (CRD-watched) source are intentionally out of scope — staff-portal
 * has no `PortalPlugin` CRD / `ServiceConfiguration.spec.userInterface`
 * equivalent today. Loaders and routes read the registry through
 * {@link getPlugins} / {@link getPlugin}.
 */
import type { PluginRegistryEntry } from '../types';
import { PluginRegistry } from './registry';
import { StaticSource } from './static-source';
import { env } from '@/utils/config/env.server';

// Re-export the sanitizer on the server accessor surface (alongside
// getPlugin/getPlugins) so a server loader can project a getPlugin(slug) result
// into the browser-safe PublicPlugin from one shared definition — no drift.
export { toPublicPlugin } from '../sanitize';

/** The process-wide plugin registry. */
export const pluginRegistry = new PluginRegistry();

/** Servable plugins (Ready, precedence-merged). For loaders and the API list. */
export function getPlugins(): PluginRegistryEntry[] {
  return pluginRegistry.getPlugins();
}

/** A single servable plugin by slug, or undefined if unknown/not servable. */
export function getPlugin(slug: string): PluginRegistryEntry | undefined {
  return pluginRegistry.getPlugin(slug);
}

let initialized = false;

/**
 * Wires the registry's static source. Idempotent. Hard-disabled outside
 * development — it is a plugin-loading vector and must never populate the
 * registry in production.
 */
export function initPluginRegistry(): void {
  if (initialized) return;
  initialized = true;

  if (!env.isDev) {
    if (process.env.PORTAL_PLUGINS || process.env.PORTAL_PLUGINS_JSON) {
      console.warn(
        '[plugins] PORTAL_PLUGINS / PORTAL_PLUGINS_JSON are a dev-only registry source and are ' +
          'ignored outside NODE_ENV=development'
      );
    }
    return;
  }

  void new StaticSource(pluginRegistry).start();
}
