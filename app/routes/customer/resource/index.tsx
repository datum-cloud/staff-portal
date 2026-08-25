import type { Route } from './+types/index';
import { DateTime } from '@/components/date';
import { DnsHostChips } from '@/features/dns';
import { DomainDnsProviders } from '@/features/domain';
import { DATE_RANGE_OPTIONS, ListPage, ListTable, ListColumnHeader } from '@/features/milo';
import { resolvePluginIcon } from '@/modules/plugins/client/icon-map';
import { getResourceExtensions } from '@/modules/plugins/client/match-extension';
import { usePlugins } from '@/modules/plugins/client/use-plugins';
import { WORKLOAD_RESOURCE_TYPE } from '@/modules/plugins/client/workload-plugin';
import type { ResourcePlatformExtension } from '@/modules/plugins/types';
import {
  searchDnsZonesListQuery,
  searchDomainsListQuery,
  searchEdgesListQuery,
  searchResourceList,
  useAllProjectsQuery,
} from '@/resources/request/client';
import { ENTITY_ICONS } from '@/utils/config/icons.config';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { createColumnHelper } from '@/utils/table';
import { t } from '@lingui/core/macro';
import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = () => metaObject(t`Resources`);

/**
 * Open-ended: `edge`/`dns`/`domain` are native, everything else can be
 * contributed at runtime by a `portal.resource/platform` plugin extension
 * (see `app/modules/plugins/`) — there's no fixed set to enumerate here.
 */
type ResourceType = string;

interface ResourceRow {
  type: ResourceType;
  uid: string;
  name: string;
  projectName: string;
  projectDisplayName: string;
  createdAt: string | null;
  detail: ReactNode;
  to: string | null;
}

/** Shape every K8s-style resource shares, regardless of kind. */
interface RawK8sResource {
  metadata?: { uid?: string; name?: string; namespace?: string; creationTimestamp?: string };
  [key: string]: unknown;
}

// `tenant.name` carries the project name when `tenant.type` is "project"
// (case has been observed as both lowercase and capitalized).
function getProjectName(tenant?: { name?: string; type?: string }): string {
  return tenant?.type?.toLowerCase() === 'project' ? (tenant?.name ?? '') : '';
}

/** Dot-path lookup for a plugin-declared `nameField` (e.g. "spec.domainName"). */
function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

const SEARCH_DEBOUNCE_MS = 300;
const columnHelper = createColumnHelper<ResourceRow>();

export default function Page() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search]);

  const projectsQuery = useAllProjectsQuery();
  const projectLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const project of projectsQuery.data?.items ?? []) {
      map.set(project.name, project.displayName || project.name);
    }
    return map;
  }, [projectsQuery.data]);

  const edgeQuery = useQuery({
    queryKey: ['edges', 'search-list', debouncedSearch],
    queryFn: () => searchEdgesListQuery(debouncedSearch),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
  const dnsQuery = useQuery({
    queryKey: ['dns-zones', 'search-list', debouncedSearch],
    queryFn: () => searchDnsZonesListQuery(debouncedSearch),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
  const domainQuery = useQuery({
    queryKey: ['domains', 'search-list', debouncedSearch],
    queryFn: () => searchDomainsListQuery(debouncedSearch),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  // Resource types contributed by installed plugins (`portal.resource/platform`
  // — see app/modules/plugins/). One dynamic search query per contributed
  // type, since the set isn't known until plugins are loaded (same fan-out
  // shape as useOrgEdgeList's per-project queries).
  //
  // `slug` is carried alongside each extension (not just its `properties`)
  // because it's the plugin's *registered* slug — the one that actually
  // resolves through the plugin mount (`getPlugin(slug)`) — which can differ
  // from any name baked into the manifest. A dev registering the plugin as
  // `PORTAL_PLUGINS=compute=http://localhost:5199` gets slug "compute", not
  // "workloads", even though the manifest's `type`/`id` stay the same.
  const { data: plugins = [] } = usePlugins();
  const resourceExtensions: (ResourcePlatformExtension & { slug: string })[] = useMemo(
    () =>
      plugins.flatMap((p) =>
        getResourceExtensions(p.manifest).map((ext) => ({ ...ext, slug: p.slug }))
      ),
    [plugins]
  );
  const pluginQueries = useQueries({
    queries: resourceExtensions.map((ext) => ({
      queryKey: ['plugin-resource', ext.properties.type, debouncedSearch],
      queryFn: () =>
        searchResourceList<RawK8sResource>(ext.properties.searchTarget, debouncedSearch),
      staleTime: 30_000,
      placeholderData: keepPreviousData,
    })),
  });

  // Type -> {label, icon}, merging the three native types with whatever
  // plugins have contributed. Icons for plugin types are resolved by NAME
  // (never plugin code) via resolvePluginIcon, same rule as nav icons.
  const typeMeta = useMemo(() => {
    const map: Record<string, { label: string; icon: LucideIcon }> = {
      edge: { label: t`Application Load Balancer`, icon: ENTITY_ICONS.edge },
      dns: { label: t`DNS`, icon: ENTITY_ICONS.dns },
      domain: { label: t`Domain`, icon: ENTITY_ICONS.domain },
    };
    for (const ext of resourceExtensions) {
      map[ext.properties.type] = {
        label: ext.properties.label,
        icon: resolvePluginIcon(ext.properties.icon),
      };
    }
    return map;
  }, [resourceExtensions]);

  const rows: ResourceRow[] = useMemo(() => {
    const labelFor = (projectName: string) =>
      projectName ? (projectLabels.get(projectName) ?? projectName) : '';

    const edgeRows: ResourceRow[] = (edgeQuery.data?.items ?? []).map(({ resource, tenant }) => {
      const projectName = getProjectName(tenant);
      const endpoints = (resource.spec?.rules ?? []).flatMap(
        (rule) => rule.backends?.map((b) => b.endpoint ?? '').filter(Boolean) ?? []
      );
      return {
        type: 'edge',
        uid: resource.metadata?.uid ?? `edge/${projectName}/${resource.metadata?.name ?? ''}`,
        name: resource.metadata?.name ?? '',
        projectName,
        projectDisplayName: labelFor(projectName),
        createdAt: resource.metadata?.creationTimestamp ?? null,
        detail: endpoints.length > 0 ? endpoints.join(', ') : '—',
        to: projectName
          ? projectRoutes.edge.detail(projectName, resource.metadata?.name ?? '')
          : null,
      };
    });

    const dnsRows: ResourceRow[] = (dnsQuery.data?.items ?? []).map(({ resource, tenant }) => {
      const projectName = getProjectName(tenant);
      const nameservers = resource.status?.domainRef?.status?.nameservers;
      return {
        type: 'dns',
        uid: resource.metadata?.uid ?? `dns/${projectName}/${resource.metadata?.name ?? ''}`,
        name: resource.spec?.domainName ?? resource.metadata?.name ?? '',
        projectName,
        projectDisplayName: labelFor(projectName),
        createdAt: resource.metadata?.creationTimestamp ?? null,
        detail: <DnsHostChips data={nameservers} maxVisible={2} size="sm" />,
        to: projectName
          ? projectRoutes.dns.detail(
              projectName,
              resource.metadata?.namespace ?? 'default',
              resource.metadata?.name ?? ''
            )
          : null,
      };
    });

    const domainRows: ResourceRow[] = (domainQuery.data?.items ?? []).map(
      ({ resource, tenant }) => {
        const projectName = getProjectName(tenant);
        return {
          type: 'domain',
          uid: resource.metadata?.uid ?? `domain/${projectName}/${resource.metadata?.name ?? ''}`,
          name: resource.spec?.domainName ?? resource.metadata?.name ?? '',
          projectName,
          projectDisplayName: labelFor(projectName),
          createdAt: resource.metadata?.creationTimestamp ?? null,
          detail: (
            <DomainDnsProviders
              nameservers={resource.status?.nameservers}
              maxVisible={2}
              size="sm"
            />
          ),
          to: projectName
            ? projectRoutes.domain.detail(
                projectName,
                resource.metadata?.namespace ?? 'default',
                resource.metadata?.name ?? ''
              )
            : null,
        };
      }
    );

    // Plugin-contributed types: the host runs the search (trusted, scoped to
    // the viewing user's own credentials) and renders the row itself — no
    // plugin code executes to produce this. Detail is intentionally blank; see
    // the ResourcePlatformExtension design note in app/modules/plugins/types.ts.
    const pluginRows: ResourceRow[] = resourceExtensions.flatMap((ext, index) => {
      const items = pluginQueries[index]?.data?.items ?? [];
      return items.map(({ resource, tenant }) => {
        const projectName = getProjectName(tenant);
        const nameField = ext.properties.nameField ?? 'metadata.name';
        const name = String(getByPath(resource, nameField) ?? resource.metadata?.name ?? '');
        return {
          type: ext.properties.type,
          uid: resource.metadata?.uid ?? `${ext.properties.type}/${projectName}/${name}`,
          name,
          projectName,
          projectDisplayName: labelFor(projectName),
          createdAt: resource.metadata?.creationTimestamp ?? null,
          detail: '—',
          // Only "workload" has a real detail page today — compute's own
          // plugin (`ui/provider`), rendered through the project-scoped
          // plugin mount (see routes.config.ts's `projectRoutes.plugin.page`).
          // Every other plugin-contributed type stays a dead end on the Name
          // cell until it declares its own detail page; the Project column
          // link is enough to get an operator to the right place until then.
          // `ext.slug` (not a hardcoded literal) — the mount resolves plugins
          // by their actual registered slug, which is registry config, not a
          // manifest constant. `name` is encoded since it's a plugin-declared
          // `nameField` value (see above) — arbitrary resource data, not
          // guaranteed to be URL-path-safe.
          to:
            projectName && ext.properties.type === WORKLOAD_RESOURCE_TYPE
              ? projectRoutes.plugin.page(projectName, ext.slug, encodeURIComponent(name))
              : null,
        };
      });
    });

    // The search index has occasionally returned the same resource twice
    // (e.g. a DNS zone re-indexed under a stale doc) — dedupe by uid so a
    // backend duplicate can't produce two React rows with the same key.
    const seen = new Set<string>();
    return [...edgeRows, ...dnsRows, ...domainRows, ...pluginRows].filter((row) => {
      const key = `${row.type}/${row.uid}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [
    edgeQuery.data,
    dnsQuery.data,
    domainQuery.data,
    pluginQueries,
    resourceExtensions,
    projectLabels,
  ]);

  // Projects present in the current result set first (by frequency), then the
  // rest of the catalog — searchable so high-cardinality stays usable.
  const projectOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (!row.projectName) continue;
      counts.set(row.projectName, (counts.get(row.projectName) ?? 0) + 1);
    }

    const byValue = new Map<string, { value: string; label: string; searchText: string }>();
    for (const project of projectsQuery.data?.items ?? []) {
      const label = project.displayName || project.name;
      byValue.set(project.name, {
        value: project.name,
        label,
        searchText: `${label} ${project.name}`,
      });
    }
    // Rows can reference a project before the catalog finishes loading.
    for (const name of counts.keys()) {
      if (byValue.has(name)) continue;
      const label = projectLabels.get(name) ?? name;
      byValue.set(name, {
        value: name,
        label,
        searchText: `${label} ${name}`,
      });
    }

    return Array.from(byValue.values()).sort(
      (a, b) =>
        (counts.get(b.value) ?? 0) - (counts.get(a.value) ?? 0) || a.label.localeCompare(b.label)
    );
  }, [rows, projectsQuery.data, projectLabels]);

  const columns = [
    columnHelper.accessor('name', {
      header: ({ column }) => <ListColumnHeader column={column} title={t`Name`} />,
      cell: ({ getValue, row }) =>
        row.original.to ? <Link to={row.original.to}>{getValue()}</Link> : getValue(),
    }),
    columnHelper.accessor('type', {
      id: 'type',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Type`} />,
      cell: ({ getValue }) => {
        const type = getValue();
        const meta = typeMeta[type];
        const Icon = meta?.icon ?? resolvePluginIcon();
        return (
          <div className="flex items-center gap-1.5">
            <Icon className="text-muted-foreground size-4" />
            {meta?.label ?? type}
          </div>
        );
      },
    }),
    // Column id stays `projectName` so the sidebar filter matches the row's
    // project id; the cell shows the friendlier display name.
    columnHelper.accessor('projectName', {
      id: 'projectName',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Project`} />,
      cell: ({ row }) => {
        const project = row.original.projectName;
        const displayName = row.original.projectDisplayName;
        return project ? (
          <Link to={projectRoutes.detail(project)}>{displayName || project}</Link>
        ) : (
          '—'
        );
      },
    }),
    columnHelper.accessor('detail', {
      id: 'detail',
      header: () => t`Detail`,
      cell: ({ getValue }) => getValue(),
    }),
    columnHelper.accessor('createdAt', {
      id: 'createdAt',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue() ?? undefined} />,
    }),
  ];

  const isLoading =
    edgeQuery.isLoading ||
    dnsQuery.isLoading ||
    domainQuery.isLoading ||
    pluginQueries.some((q) => q.isLoading);
  const hasMore = Boolean(
    edgeQuery.data?.hasMore ||
    dnsQuery.data?.hasMore ||
    domainQuery.data?.hasMore ||
    pluginQueries.some((q) => q.data?.hasMore)
  );

  return (
    <ListPage>
      <ListTable
        loading={isLoading}
        data={rows}
        columns={columns}
        pageSize={50}
        getRowId={(row) => `${row.type}/${row.uid}`}
        defaultSort={[{ id: 'createdAt', desc: true }]}
        searchPlaceholder={t`Search resources...`}
        emptyMessage={t`No resources found.`}
        controlledSearch={{ value: search, onChange: setSearch }}
        hasMore={hasMore}
        hasMoreMessage={t`Each resource type is limited to 2,000 results at a time. Refine your search to surface other resources.`}
        filters={[
          {
            column: 'type',
            label: t`Type`,
            options: [
              { value: 'edge', label: t`Application Load Balancer`, icon: <ENTITY_ICONS.edge /> },
              { value: 'dns', label: t`DNS`, icon: <ENTITY_ICONS.dns /> },
              { value: 'domain', label: t`Domain`, icon: <ENTITY_ICONS.domain /> },
              ...resourceExtensions.map((ext) => {
                const Icon = resolvePluginIcon(ext.properties.icon);
                return { value: ext.properties.type, label: ext.properties.label, icon: <Icon /> };
              }),
            ],
          },
          {
            type: 'searchable',
            column: 'projectName',
            label: t`Project`,
            options: projectOptions,
            searchPlaceholder: t`Search projects…`,
            emptyHint: t`Type to filter by project name.`,
            pageSize: 8,
          },
          {
            column: 'createdAt',
            label: t`Created`,
            type: 'dateRange',
            options: DATE_RANGE_OPTIONS,
          },
        ]}
      />
    </ListPage>
  );
}
