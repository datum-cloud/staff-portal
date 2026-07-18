import { getProjectDetailMetadata, useProjectDetailData } from '../shared';
import type { Route } from './+types/secret';
import { ListColumnHeader, ListTable } from '@/features/milo';
import { useProjectSecretMetricsQuery } from '@/resources/request/client';
import { Secret } from '@/resources/schemas';
import { metaObject } from '@/utils/helpers';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';

export const handle = {
  breadcrumb: () => <Trans>Secrets</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { projectName } = getProjectDetailMetadata(matches);
  return metaObject(`Secret - ${projectName}`);
};

const columnHelper = createColumnHelper<Secret>();

const columns = [
  columnHelper.accessor('metric.resource_name', {
    header: ({ column }) => <ListColumnHeader column={column} title={t`Name`} />,
  }),
  columnHelper.accessor('metric.resource_namespace', {
    header: ({ column }) => <ListColumnHeader column={column} title={t`Namespace`} />,
  }),
  columnHelper.accessor('metric.resource_version', {
    header: ({ column }) => <ListColumnHeader column={column} title={t`Version`} />,
  }),
];

export default function Page() {
  const { project } = useProjectDetailData();
  const projectName = project?.metadata?.name ?? '';

  const tableQuery = useProjectSecretMetricsQuery(projectName);

  const rows = tableQuery.data?.data?.data?.result ?? [];

  return (
    <ListTable
      loading={tableQuery.isLoading}
      data={rows}
      columns={columns}
      pageSize={50}
      getRowId={(row) =>
        `${row.metric.resource_namespace}/${row.metric.resource_name}/${row.metric.resource_version}/${row.value[1]}`
      }
      searchPlaceholder={t`Search secrets...`}
      emptyMessage={t`No secrets found.`}
      inset="tab"
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [
          row.metric.resource_name,
          row.metric.resource_namespace,
          row.metric.resource_version,
        ]
          .map((v) => v.toLowerCase())
          .some((v) => v.includes(q));
      }}
    />
  );
}
