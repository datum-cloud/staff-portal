import type { Route } from './+types/email-activity';
import { BadgeCondition } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DataTable, DataTableProvider, useDataTableQuery } from '@/modules/datum-ui/data-table';
import { emailListQuery } from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import {
  ComMiloapisNotificationV1Alpha1Email,
  ComMiloapisNotificationV1Alpha1EmailList,
} from '@openapi/notification.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';

export const meta: Route.MetaFunction = ({ matches }) => {
  return metaObject('Email Activity');
};

export const handle = {
  breadcrumb: () => <Trans>Email Activity</Trans>,
};

const columnHelper = createColumnHelper<ComMiloapisNotificationV1Alpha1Email>();
const columns = [
  columnHelper.accessor('metadata.name', {
    header: () => <Trans>Name</Trans>,
  }),
  // columnHelper.accessor('spec.ownerRef.name', {
  //   header: () => <Trans>Organization</Trans>,
  //   cell: ({ getValue }) => {
  //     return <Link to={orgRoutes.detail(getValue())}>{getValue()}</Link>;
  //   },
  // }),
  columnHelper.accessor('status', {
    header: () => <Trans>Status</Trans>,
    cell: ({ getValue }) => (
      <BadgeCondition status={getValue()} multiple={false} showMessage className="text-xs" />
    ),
  }),
  columnHelper.accessor('metadata.creationTimestamp', {
    header: () => <Trans>Created</Trans>,
    cell: ({ getValue }) => {
      return <DateTime date={getValue()} />;
    },
  }),
];

export default function Page() {
  const tableState = useDataTableQuery<ComMiloapisNotificationV1Alpha1EmailList>({
    queryKeyPrefix: 'emails',
    fetchFn: (params) => emailListQuery('milo-system', params),
    useSorting: true,
  });

  return (
    <DataTableProvider<
      ComMiloapisNotificationV1Alpha1Email,
      ComMiloapisNotificationV1Alpha1EmailList
    >
      columns={columns}
      transform={(data) => ({
        rows: data?.items || [],
        cursor: data?.metadata?.continue,
      })}
      {...tableState}>
      <div className="m-4 flex flex-col gap-2">
        <DataTable />
      </div>
    </DataTableProvider>
  );
}
