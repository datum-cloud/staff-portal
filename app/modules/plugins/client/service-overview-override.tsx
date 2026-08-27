/**
 * Renders a `portal.page/service` extension whose `path === ""` in place of
 * the host's own built-in Overview content — see the `path: ""` convention
 * documented on `PageServiceExtension` in `../types.ts`. Used by the
 * Overview route (`app/routes/admin/service-catalog/detail/index.tsx`)
 * instead of `PluginPageOutlet`: there's exactly one page to render, at the
 * host's own `/admin/service-catalog/:name` URL, not a `<Routes>` subtree
 * under a plugin mount — so this wires the same primitives
 * (`LazyPluginComponent`, `PluginErrorBoundary`, `DevPluginBadge`) directly
 * rather than going through the mount machinery.
 */
import { DevPluginBadge } from './dev-plugin-badge';
import type { PluginRemoteRef } from './federation-host';
import { LazyPluginComponent } from './lazy-plugin-component';
import { PluginErrorBoundary } from './plugin-error-boundary';
import type { PageServiceExtension, PublicPlugin } from '@/modules/plugins/types';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { useMemo } from 'react';

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-40 w-full rounded-lg border" />
    </div>
  );
}

export function ServiceOverviewOverride({
  plugin,
  extension,
}: {
  plugin: PublicPlugin;
  extension: PageServiceExtension;
}) {
  const pluginRef = useMemo<PluginRemoteRef>(
    () => ({
      remoteName: plugin.manifest.name,
      slug: plugin.slug,
      remoteEntry: plugin.manifest.remoteEntry,
    }),
    [plugin.manifest.name, plugin.slug, plugin.manifest.remoteEntry]
  );

  return (
    <div className="relative flex flex-1 flex-col">
      {plugin.devMode && (
        <div className="absolute top-2 right-4 z-10">
          <DevPluginBadge />
        </div>
      )}
      <PluginErrorBoundary slug={plugin.slug} displayName={plugin.displayName}>
        <LazyPluginComponent
          pluginRef={pluginRef}
          codeRef={extension.properties.component.$codeRef}
          fallback={<OverviewSkeleton />}
        />
      </PluginErrorBoundary>
    </div>
  );
}
