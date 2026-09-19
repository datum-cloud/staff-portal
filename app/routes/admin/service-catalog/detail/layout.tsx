import type { Route } from './+types/layout';
import { DetailShell, type EntityNav } from '@/features/milo';
import { PendingApprovalsBadge } from '@/features/service-catalog';
import { authenticator } from '@/modules/auth';
import {
  getServicePageExtensions,
  isOverviewOverrideExtension,
} from '@/modules/plugins/client/match-extension';
import { getPluginsForService, toPublicPlugin } from '@/modules/plugins/server';
import { type PublicPlugin } from '@/modules/plugins/types';
import { serviceDetailQuery } from '@/resources/request/server';
import { ENTITY_ICONS, TAB_ICONS } from '@/utils/config/icons.config';
import { serviceCatalogRoutes } from '@/utils/config/routes.config';
import { ComMiloapisServicesV1Alpha1Service } from '@openapi/services.miloapis.com/v1alpha1';
import { Blocks, CheckSquare, Users } from 'lucide-react';
import { useLoaderData } from 'react-router';

type LoaderData = { service: ComMiloapisServicesV1Alpha1Service; plugins: PublicPlugin[] };

export const handle = {
  breadcrumb: (data: ComMiloapisServicesV1Alpha1Service) => {
    const displayName = data?.spec?.displayName || data?.metadata?.name;
    return <span>{displayName}</span>;
  },
  // `handle` is module scope (no hooks, no `useLingui` macro — see
  // entity-scoped-left-nav.md's i18n gap, tracked as a follow-up), so these
  // labels are plain strings, same as `NAV_SECTIONS`. Approvals' badge and
  // the plugin-contributed items are fine here — the badge is JSX (same as
  // `breadcrumb`, no hook fires until React renders it), and the plugin list
  // is already resolved in the loader, not a hook.
  entityNav: (data: LoaderData, params: { name?: string }): EntityNav => {
    const serviceName = params.name ?? data.service?.metadata?.name ?? '';
    const canonicalName = data.service?.spec?.serviceName ?? serviceName;
    const ownerProject = data.service?.spec?.owner?.producerProjectRef?.name;
    const isGated = data.service?.spec?.enablementPolicy?.mode === 'GatedByProvider';
    const displayName = data.service?.spec?.displayName || serviceName;

    // `path: ""` extensions replace the built-in Overview instead of adding a
    // tab (see types.ts) — everything else becomes a nav item as before.
    const servicePlugins = (data.plugins ?? []).flatMap((plugin) =>
      getServicePageExtensions(plugin.manifest)
        .filter((ext) => !isOverviewOverrideExtension(ext))
        .map((ext) => ({
          slug: plugin.slug,
          label: ext.properties.label,
          path: ext.properties.path,
        }))
    );

    return {
      backTo: { label: 'Service Catalog', href: serviceCatalogRoutes.list() },
      title: displayName,
      icon: ENTITY_ICONS.serviceCatalog,
      groups: [
        {
          items: [
            {
              label: 'Overview',
              href: serviceCatalogRoutes.detail(serviceName),
              icon: TAB_ICONS.overview,
            },
            { label: 'Consumers', href: serviceCatalogRoutes.consumers(serviceName), icon: Users },
            ...(isGated
              ? [
                  {
                    label: 'Approvals',
                    href: serviceCatalogRoutes.approvals(serviceName),
                    icon: CheckSquare,
                    badge: (
                      <PendingApprovalsBadge
                        producerProject={ownerProject}
                        serviceName={serviceName}
                        canonicalName={canonicalName}
                      />
                    ),
                  },
                ]
              : []),
            ...servicePlugins.map((sp) => ({
              label: sp.label,
              href: serviceCatalogRoutes.plugin.page(serviceName, sp.slug, sp.path),
              icon: Blocks,
            })),
          ],
        },
      ],
    };
  },
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const service = await serviceDetailQuery(session?.accessToken ?? '', params?.name ?? '');

  // Every Ready plugin whose `spec.serviceRef.name` matches this Service —
  // see app/modules/plugins/server/registry.ts's `getPluginsForService`.
  // Resolved here (not in `plugins.tsx`) so both the tab strip and the
  // Overview route's override check can use it without a second round trip
  // (the Overview route reads it back via `usePlugins()`, see `../shared.ts`).
  const serviceName = service.metadata?.name ?? '';
  const plugins = getPluginsForService(serviceName)
    .map(toPublicPlugin)
    .filter((plugin) => plugin !== null);

  return { service, plugins };
};

export default function ServiceDetailLayout() {
  const { service } = useLoaderData<typeof loader>();

  const serviceName = service.metadata?.name ?? '';
  const canonicalName = service.spec?.serviceName ?? serviceName;

  return (
    <DetailShell
      icon={
        <div className="bg-muted flex size-10 items-center justify-center rounded-md">
          <ENTITY_ICONS.serviceCatalog className="size-5" />
        </div>
      }
      name={service.spec?.displayName || serviceName}
      subtitle={canonicalName}
    />
  );
}
