import type { Route } from './+types/index';
import { DateTime } from '@/components/date';
import { DnsHostChips } from '@/features/dns';
import { DomainDnsProviders } from '@/features/domain';
import { DATE_RANGE_OPTIONS, ListPage, ListTable, ListColumnHeader } from '@/features/milo';
import {
  searchDnsZonesListQuery,
  searchDomainsListQuery,
  searchEdgesListQuery,
} from '@/resources/request/client';
import { ENTITY_ICONS } from '@/utils/config/icons.config';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
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
  }, [edgeQuery.data, dnsQuery.data, domainQuery.data]);

  // Backend gives no fixed list for any of these — offer whatever actually
  // shows up in the current result set, same pattern as Projects' Organization filter.
  const projectOptions = useMemo(() => {
    const names = new Set(rows.map((r) => r.projectName).filter(Boolean));
    return Array.from(names)
      .sort()
      .map((value) => ({ value, label: value }));
  }, [rows]);

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
    columnHelper.accessor('projectName', {
      id: 'projectName',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Project`} />,
      cell: ({ getValue }) => {
        const project = getValue();
        return project ? <Link to={projectRoutes.detail(project)}>{project}</Link> : '—';
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
          { column: 'projectName', label: t`Project`, options: projectOptions },
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
