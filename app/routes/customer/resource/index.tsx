import type { Route } from './+types/index';
import { DateTime } from '@/components/date';
import { DnsHostChips } from '@/features/dns';
import { DomainDnsProviders } from '@/features/domain';
import { DATE_RANGE_OPTIONS, ListPage, ListTable, ListColumnHeader } from '@/features/milo';
import {
  searchDnsZonesListQuery,
  searchDomainsListQuery,
  searchEdgesListQuery,
  useAllProjectsQuery,
} from '@/resources/request/client';
import { ENTITY_ICONS } from '@/utils/config/icons.config';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { t } from '@lingui/core/macro';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = () => metaObject(t`Resources`);

type ResourceType = 'edge' | 'dns' | 'domain';

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

// `tenant.name` carries the project name when `tenant.type` is "project"
// (case has been observed as both lowercase and capitalized).
function getProjectName(tenant?: { name?: string; type?: string }): string {
  return tenant?.type?.toLowerCase() === 'project' ? (tenant?.name ?? '') : '';
}

const SEARCH_DEBOUNCE_MS = 300;
const columnHelper = createColumnHelper<ResourceRow>();

export default function Page() {
  // Computed at render time, not module scope — the `t` macro needs a locale
  // already active, which isn't guaranteed yet at import time (SSR especially).
  const typeLabel: Record<ResourceType, string> = {
    edge: t`AI Edge`,
    dns: t`DNS`,
    domain: t`Domain`,
  };

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

    // The search index has occasionally returned the same resource twice
    // (e.g. a DNS zone re-indexed under a stale doc) — dedupe by uid so a
    // backend duplicate can't produce two React rows with the same key.
    const seen = new Set<string>();
    return [...edgeRows, ...dnsRows, ...domainRows].filter((row) => {
      const key = `${row.type}/${row.uid}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [edgeQuery.data, dnsQuery.data, domainQuery.data, projectLabels]);

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
        const Icon = ENTITY_ICONS[type];
        return (
          <div className="flex items-center gap-1.5">
            <Icon className="text-muted-foreground size-4" />
            {typeLabel[type]}
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

  const isLoading = edgeQuery.isLoading || dnsQuery.isLoading || domainQuery.isLoading;
  const hasMore = Boolean(
    edgeQuery.data?.hasMore || dnsQuery.data?.hasMore || domainQuery.data?.hasMore
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
              { value: 'edge', label: t`AI Edge`, icon: <ENTITY_ICONS.edge /> },
              { value: 'dns', label: t`DNS`, icon: <ENTITY_ICONS.dns /> },
              { value: 'domain', label: t`Domain`, icon: <ENTITY_ICONS.domain /> },
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
