import type { Route } from './+types/index';
import { DomainList, type DomainRow } from '@/features/domain';
import { searchDomainsListQuery } from '@/resources/request/client';
import { domainRoutes, projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { t } from '@lingui/core/macro';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export const meta: Route.MetaFunction = () => metaObject(t`Domains`);

// `tenant.name` carries the project name when `tenant.type` is "project"
// (case has been observed as both lowercase and capitalized).
function getProjectName(tenant?: { name?: string; type?: string }): string {
  return tenant?.type?.toLowerCase() === 'project' ? (tenant?.name ?? '') : '';
}

export default function Page() {
  const { data, isLoading } = useQuery({
    queryKey: ['domains', 'search-list'],
    queryFn: () => searchDomainsListQuery(''),
    staleTime: 30_000,
  });

  const rows: DomainRow[] = useMemo(
    () =>
      (data ?? []).map((item) => ({
        domain: item.resource,
        projectName: getProjectName(item.tenant),
      })),
    [data]
  );

  return (
    <DomainList
      data={rows}
      loading={isLoading}
      showProjectColumn
      linkBuilder={(row) => {
        // Prefer jumping into the existing project domain detail page when we
        // know the project — falls back to the dummy global detail otherwise.
        const namespace = row.domain.metadata?.namespace ?? '';
        const name = row.domain.metadata?.name ?? '';
        if (row.projectName) {
          return projectRoutes.domain.detail(row.projectName, namespace, name);
        }
        return domainRoutes.detail(namespace, name);
      }}
    />
  );
}
