import { getBillingAccountDisplayName } from '../utils';
import { BadgeState } from '@/components/badge';
import { DisplayName } from '@/components/display';
import { useBillingAccountListForOrgQuery } from '@/resources/request/client';
import { financeRoutes } from '@/utils/config/routes.config';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1BillingAccount } from '@openapi/billing.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router';

const columnHelper = createColumnHelper<ComMiloapisBillingV1Alpha1BillingAccount>();

interface OrgBillingAccountsCardProps {
  orgName: string;
}

export function OrgBillingAccountsCard({ orgName }: OrgBillingAccountsCardProps) {
  const { data, isLoading } = useBillingAccountListForOrgQuery(orgName);
  const accounts = data?.items ?? [];

  const columns = [
    columnHelper.display({
      id: 'displayName',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Display name`} />,
      cell: ({ row }) => {
        const accountName = row.original.metadata?.name ?? '';
        return (
          <DisplayName
            displayName={getBillingAccountDisplayName(row.original)}
            name={accountName}
            to={financeRoutes.billingAccounts.detail(orgName, accountName)}
          />
        );
      },
    }),
    columnHelper.accessor('status.phase', {
      id: 'phase',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Phase`} />,
      cell: ({ getValue }) => <BadgeState state={getValue() ?? 'Unknown'} />,
    }),
    columnHelper.accessor('status.linkedProjectsCount', {
      id: 'linkedProjectsCount',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Linked projects`} />,
      cell: ({ getValue }) => <Text>{getValue() ?? 0}</Text>,
    }),
  ];

  return (
    <Card className="mt-4 shadow-none">
      <CardHeader>
        <CardTitle>
          <Trans>Billing Accounts</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Text>
            <Trans>Loading billing accounts...</Trans>
          </Text>
        ) : accounts.length === 0 ? (
          <Text>
            <Trans>No billing accounts</Trans>
          </Text>
        ) : (
          <DataTable.Client
            data={accounts}
            columns={columns}
            pageSize={5}
            getRowId={(row) => row.metadata?.name ?? ''}>
            <DataTable.Content
              headerClassName="bg-muted/50"
              className="border-t border-b border-solid"
              emptyMessage={t`No billing accounts`}
            />
          </DataTable.Client>
        )}
      </CardContent>
      <CardFooter className="justify-end">
        <Link
          to={financeRoutes.billingAccounts.list()}
          className="text-primary text-sm hover:underline">
          <Trans>View all billing accounts</Trans>
        </Link>
      </CardFooter>
    </Card>
  );
}
