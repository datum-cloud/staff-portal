import { getProjectDetailMetadata, useProjectDetailData } from '../../shared';
import type { Route } from './+types/index';
import { DomainList, type DomainRow } from '@/features/domain';
import { useProjectDomainListQuery } from '@/resources/request/client';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { useMemo } from 'react';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { projectName } = getProjectDetailMetadata(matches);
  return metaObject(`Domain - ${projectName}`);
};

export default function Page() {
  const { project } = useProjectDetailData();
  const projectName = project.metadata?.name ?? '';
  const tableQuery = useProjectDomainListQuery(projectName);

  const rows: DomainRow[] = useMemo(
    () =>
      (tableQuery.data?.items ?? []).map((domain) => ({
        domain,
        projectName,
      })),
    [tableQuery.data?.items, projectName]
  );

  return (
    <DomainList
      data={rows}
      loading={tableQuery.isLoading}
      linkBuilder={(row) =>
        projectRoutes.domain.detail(
          projectName,
          row.domain.metadata?.namespace ?? '',
          row.domain.metadata?.name ?? ''
        )
      }
    />
  );
}
