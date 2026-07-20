import { getBillingAccountDisplayName } from '../utils';
import { BadgeState } from '@/components/badge';
import { DisplayId, DisplayName } from '@/components/display';
import {
  EMBEDDED_TABLE_BODY_CLASS,
  EMBEDDED_TABLE_CELL_CLASS,
  EMBEDDED_TABLE_HEADER_CELL_CLASS,
  LIST_TABLE_HEADER_CLASS,
  LIST_TABLE_HEADER_ROW_CLASS,
  LIST_TABLE_ROW_CLASS,
  ListColumnHeader,
  TableCard,
} from '@/features/milo';
import { useBillingAccountListForOrgQuery } from '@/resources/request/client';
import { billingAccountRoutes } from '@/utils/config/routes.config';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1BillingAccount } from '@openapi/billing.miloapis.com/v1alpha1';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router';

const columnHelper = createColumnHelper<ComMiloapisBillingV1Alpha1BillingAccount>();

interface OrgBillingAccountsCardProps {
  orgName: string;
  className?: string;
}

export function OrgBillingAccountsCard({ orgName, className }: OrgBillingAccountsCardProps) {
  const { data, isLoading } = useBillingAccountListForOrgQuery(orgName);
  const accounts = data?.items ?? [];

  const columns = [
    columnHelper.display({
      id: 'displayName',
      enableSorting: false,
      header: ({ column }) => <ListColumnHeader column={column} title={t`Name`} />,
      cell: ({ row }) => {
        const accountName = row.original.metadata?.name ?? '';
        return (
          <DisplayName
            displayName={getBillingAccountDisplayName(row.original)}
            to={billingAccountRoutes.detail(orgName, accountName)}
          />
        );
      },
    }),
    columnHelper.accessor((row) => row.metadata?.name ?? '', {
      id: 'id',
      enableSorting: false,
      header: ({ column }) => <ListColumnHeader column={column} title={t`ID`} />,
      cell: ({ getValue }) => <DisplayId value={getValue()} />,
    }),
    columnHelper.accessor('status.phase', {
      id: 'phase',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Status`} />,
      cell: ({ getValue }) => <BadgeState state={getValue() ?? 'Unknown'} />,
    }),
    columnHelper.accessor('status.linkedProjectsCount', {
      id: 'linkedProjectsCount',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Linked projects`} />,
      cell: ({ getValue }) => <Text>{getValue() ?? 0}</Text>,
    }),
  ];

  return (
    <TableCard
      className={cn('mt-4', className)}
      title={<Trans>Billing Accounts</Trans>}
      action={
        <Link
          to={billingAccountRoutes.list()}
          className="text-muted-foreground hover:text-foreground text-sm">
          <Trans>View all</Trans>
        </Link>
      }>
      {isLoading ? (
        <Text className="text-muted-foreground px-4 py-6">
          <Trans>Loading billing accounts...</Trans>
        </Text>
      ) : accounts.length === 0 ? (
        <Text className="text-muted-foreground px-4 py-6">
          <Trans>No billing accounts</Trans>
        </Text>
      ) : (
        <DataTable.Client
          data={accounts}
          columns={columns as ColumnDef<ComMiloapisBillingV1Alpha1BillingAccount, unknown>[]}
          pageSize={5}
          getRowId={(row) => row.metadata?.name ?? ''}>
          <DataTable.Content
            headerClassName={LIST_TABLE_HEADER_CLASS}
            headerRowClassName={LIST_TABLE_HEADER_ROW_CLASS}
            headerCellClassName={EMBEDDED_TABLE_HEADER_CELL_CLASS}
            bodyClassName={EMBEDDED_TABLE_BODY_CLASS}
            rowClassName={LIST_TABLE_ROW_CLASS}
            cellClassName={EMBEDDED_TABLE_CELL_CLASS}
            emptyMessage={t`No billing accounts`}
          />
        </DataTable.Client>
      )}
    </TableCard>
  );
}
