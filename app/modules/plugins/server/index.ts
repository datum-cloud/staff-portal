/**
 * Server-side plugin registry singleton + wiring.
 *
 * Ported from cloud-portal. Two sources: `static` (dev, `PORTAL_PLUGINS`) and
 * `platform` (production, watches `ProviderPortalPlugin` on milo's control
 * plane). Loaders and routes read the registry through {@link getPlugins} /
 * {@link getPlugin}.
 */
import type { PluginRegistryEntry } from '../types';
import { KubeClient, parseKubeconfig, resolveKubeContext } from './kubeconfig';
import { PlatformSource } from './platform-source';
import { PluginRegistry } from './registry';
import { StaticSource } from './static-source';
import { env } from '@/utils/config/env.server';
import { readFileSync } from 'node:fs';

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

/** Servable plugins whose `spec.serviceRef.name` matches `serviceName`. */
export function getPluginsForService(serviceName: string): PluginRegistryEntry[] {
  return pluginRegistry.getPluginsForService(serviceName);
}

let initialized = false;

/**
 * Wires the registry's sources. Idempotent. `static` is hard-disabled outside
 * development — it is a plugin-loading vector and must never populate the
 * registry in production. `platform` is the opposite: not dev-gated at all,
 * since it's the real production discovery path.
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
  } else {
    void new StaticSource(pluginRegistry).start();
  }

  const platformKubeconfigPath = env.PLATFORM_REGISTRY_KUBECONFIG;
  if (platformKubeconfigPath) {
    try {
      const config = parseKubeconfig(readFileSync(platformKubeconfigPath, 'utf8'));
      const context = resolveKubeContext(config);
      const client = new KubeClient(context);
      new PlatformSource(pluginRegistry, client).start();
      console.info(`[plugins] platform source watching ${context.server}`);
    } catch (err) {
      console.error(`[plugins] failed to start platform source: ${String(err)}`);
    }
  }
}
