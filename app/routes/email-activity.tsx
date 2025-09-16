import type { Route } from './+types/email-activity';
import { BadgeCondition } from '@/components/badge';
import { DateFormatter } from '@/components/date';
import { DataTable, DataTableProvider, useDataTableQuery } from '@/modules/datum-ui/data-table';
import { emailListQuery } from '@/resources/request/client';
import { Email, EmailListResponse } from '@/resources/schemas';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';

export const meta: Route.MetaFunction = ({ matches }) => {
  return metaObject('Email Activity');
};

export const handle = {
  breadcrumb: () => <Trans>Email Activity</Trans>,
};

const columnHelper = createColumnHelper<Email>();
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
      return <DateFormatter date={getValue()} withTime />;
    },
  }),
];

export default function Page() {
  const tableState = useDataTableQuery<EmailListResponse>({
    queryKeyPrefix: 'emails',
    fetchFn: emailListQuery,
    useSorting: true,
  });

  return (
    <DataTableProvider<Email, EmailListResponse>
      columns={columns}
      transform={(data) => ({
        rows: data?.data?.items || [],
        cursor: data?.data?.metadata?.continue,
      })}
      {...tableState}>
      <div className="m-4 flex flex-col gap-2">
        <DataTable<Email> />
      </div>
    </DataTableProvider>
  );
}
