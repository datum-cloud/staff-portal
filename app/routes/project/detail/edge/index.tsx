import { getProjectDetailMetadata, useProjectDetailData } from '../../shared';
import type { Route } from './+types/index';
import { EdgeList, type EdgeRow } from '@/features/edge';
import { useProjectEdgeListQuery } from '@/resources/request/client';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { useMemo } from 'react';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { projectName } = getProjectDetailMetadata(matches);
  return metaObject(`AI Edge - ${projectName}`);
};

export default function Page() {
  const { project } = useProjectDetailData();
  const projectName = project?.metadata?.name ?? '';
  const tableQuery = useProjectEdgeListQuery(projectName);

  const rows: EdgeRow[] = useMemo(
    () =>
      (tableQuery.data?.items ?? []).map((edge) => ({
        edge,
        projectName,
      })),
    [tableQuery.data?.items, projectName]
  );

  return (
    <EdgeList
      data={rows}
      loading={tableQuery.isLoading}
      linkBuilder={(row) => projectRoutes.edge.detail(projectName, row.edge.metadata?.name ?? '')}
    />
  );
}
