import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { useSubprocessorListQuery, type Subprocessor } from '@/resources/request/client';
import { complianceRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Subprocessors`);
};

const columnHelper = createColumnHelper<Subprocessor>();

export default function Page() {
  const tableQuery = useSubprocessorListQuery();

  const columns = [
    columnHelper.accessor('metadata.name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
      cell: ({ row }) => {
        const name = row.original.metadata?.name ?? '';
        return (
          <Link
            to={complianceRoutes.subprocessors.detail(name)}
            className="font-medium hover:underline">
            {name}
          </Link>
        );
      },
    }),
    columnHelper.accessor('status.disclosure.displayName', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Display Name`} />,
      cell: ({ getValue }) => <Text size="sm">{getValue() ?? '-'}</Text>,
    }),
    columnHelper.accessor('status.disclosure.legalEntity', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Legal Entity`} />,
      cell: ({ getValue }) => (
        <Text size="sm" textColor="muted">
          {getValue() ?? '-'}
        </Text>
      ),
    }),
    columnHelper.accessor('status.disclosure.countryOfIncorporation', {
      id: 'country',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Country`} />,
      cell: ({ getValue }) => <Text size="sm">{getValue() ?? '-'}</Text>,
    }),
    columnHelper.accessor('status.disclosure.transferMechanism', {
      header: ({ column }) => (
        <DataTable.ColumnHeader column={column} title={t`Transfer Mechanism`} />
      ),
      cell: ({ getValue }) => <Text size="sm">{getValue() ?? '-'}</Text>,
    }),
    columnHelper.accessor('status.disclosure.phase', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Phase`} />,
      cell: ({ getValue }) => {
        const phase = getValue();
        if (!phase) return null;
        return <BadgeState state={phase === 'Active' ? 'active' : 'info'} message={phase} />;
      },
    }),
    columnHelper.accessor('status.disclosure.effectiveDate', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Effective`} />,
      cell: ({ getValue }) => {
        const date = getValue();
        return date ? (
          <DateTime date={date} format="d MMM, yyyy" />
        ) : (
          <Text size="sm" textColor="muted">
            -
          </Text>
        );
      },
    }),
  ];

  return (
    <DataTable.Client
      loading={tableQuery.isLoading}
      data={tableQuery.data?.items ?? []}
      columns={columns}
      pageSize={20}
      getRowId={(row) => row.metadata?.name ?? ''}>
      <Card className="m-4 py-4 shadow-none">
        <CardContent className="flex flex-col gap-2 px-4">
          <Text size="sm" textColor="muted">
            <Trans>
              Subprocessor records are derived automatically from active vendor compliance profiles.
              Edit a vendor to change what&apos;s published here.
            </Trans>
          </Text>
          <DataTable.Content
            headerClassName="bg-muted/50"
            className="border-t border-b border-solid"
            emptyMessage={t`No subprocessors published.`}
          />
          <DataTable.Pagination className="pb-0" />
        </CardContent>
      </Card>
    </DataTable.Client>
  );
}
