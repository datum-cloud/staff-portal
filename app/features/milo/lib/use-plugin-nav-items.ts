/**
 * Resolves `portal.nav/platform` plugin extensions into nav sub-items for the
 * Operations section — `NAV_SECTIONS` (nav-config.ts) is a static,
 * compile-time array, but plugin nav entries only exist at runtime, discovered
 * via `usePlugins()`. Every platform-wide plugin lands under Operations
 * rather than minting its own top-level section — keeps the navbar bounded
 * regardless of how many plugins get installed.
 */
import type { NavSubItem } from './nav-config';
import { resolvePluginIcon } from '@/modules/plugins/client/icon-map';
import { getNavExtensions } from '@/modules/plugins/client/match-extension';
import { usePlugins } from '@/modules/plugins/client/use-plugins';
import type { PublicPlugin } from '@/modules/plugins/types';
import { pluginRoutes } from '@/utils/config/routes.config';
import { useMemo } from 'react';

function toNavItems(plugin: PublicPlugin): NavSubItem[] {
  return getNavExtensions(plugin.manifest).map((ext) => {
    const path = ext.properties.path.replace(/^\/+/, '').replace(/\/+$/, '');
    const href =
      path === '' ? pluginRoutes.mount(plugin.slug) : pluginRoutes.page(plugin.slug, path);

    return {
      label: ext.properties.title,
      href,
      icon: resolvePluginIcon(ext.properties.icon),
    };
  });
}

/** Plugin-contributed Operations nav items, discovery best-effort (empty on failure). */
export function usePluginNavItems(): NavSubItem[] {
  const { data: plugins = [] } = usePlugins();

  return useMemo(() => plugins.flatMap(toNavItems), [plugins]);
}
