import { getBillingAccountDisplayName, orgNameFromNamespace } from '../utils';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DisplayName } from '@/components/display';
import { ListTable } from '@/features/milo';
import { useBillingAccountListQuery, useOrgListQuery } from '@/resources/request/client';
import { financeRoutes, orgRoutes } from '@/utils/config/routes.config';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import type { ComMiloapisBillingV1Alpha1BillingAccount } from '@openapi/billing.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';

const columnHelper = createColumnHelper<ComMiloapisBillingV1Alpha1BillingAccount>();

export function BillingAccountList() {
  const tableQuery = useBillingAccountListQuery();
  const orgQuery = useOrgListQuery({ limit: 500 });

  const orgDisplayNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const org of orgQuery.data?.items ?? []) {
      map.set(org.name, org.displayName || org.name);
    }
    return map;
  }, [orgQuery.data?.items]);

  const columns = [
    columnHelper.display({
      id: 'displayName',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Display name`} />,
      cell: ({ row }) => {
        const orgName = orgNameFromNamespace(row.original.metadata?.namespace);
        const accountName = row.original.metadata?.name ?? '';
        const displayName = getBillingAccountDisplayName(row.original);

        return (
          <DisplayName
            displayName={displayName}
            name={accountName}
            to={financeRoutes.billingAccounts.detail(orgName, accountName)}
          />
        );
      },
    }),
    columnHelper.accessor('metadata.name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
      cell: ({ getValue }) => <Text>{getValue()}</Text>,
    }),
    columnHelper.display({
      id: 'organization',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Organization`} />,
      cell: ({ row }) => {
        const orgName = orgNameFromNamespace(row.original.metadata?.namespace);
        if (!orgName) return <Text>—</Text>;
        const orgDisplayName = orgDisplayNames.get(orgName) ?? orgName;
        return (
          <DisplayName displayName={orgDisplayName} name={orgName} to={orgRoutes.detail(orgName)} />
        );
      },
    }),
    columnHelper.accessor('status.phase', {
      id: 'phase',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Phase`} />,
      cell: ({ getValue }) => <BadgeState state={getValue() ?? 'Unknown'} />,
    }),
    columnHelper.accessor('spec.currencyCode', {
      id: 'currencyCode',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Currency`} />,
      cell: ({ getValue }) => <Text>{getValue() ?? '—'}</Text>,
    }),
    columnHelper.accessor('status.linkedProjectsCount', {
      id: 'linkedProjectsCount',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Linked projects`} />,
      cell: ({ getValue }) => <Text>{getValue() ?? 0}</Text>,
    }),
    columnHelper.accessor('spec.contactInfo.email', {
      id: 'contactEmail',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Contact email`} />,
      cell: ({ getValue }) => <Text>{getValue() ?? '—'}</Text>,
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      id: 'created',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
  ];

  const items = tableQuery.data?.items ?? [];

  return (
    <ListTable
      loading={tableQuery.isLoading}
      data={items}
      columns={columns}
      pageSize={20}
      getRowId={(row) => `${row.metadata?.namespace ?? ''}/${row.metadata?.name ?? ''}`}
      defaultSort={[{ id: 'created', desc: true }]}
      searchPlaceholder={t`Search billing accounts...`}
      emptyMessage={t`No billing accounts found`}
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const displayName = getBillingAccountDisplayName(row).toLowerCase();
        const name = (row.metadata?.name ?? '').toLowerCase();
        const orgName = orgNameFromNamespace(row.metadata?.namespace);
        const orgDisplayName = (orgDisplayNames.get(orgName) ?? '').toLowerCase();
        const email = (row.spec?.contactInfo?.email ?? '').toLowerCase();
        return (
          displayName.includes(q) ||
          name.includes(q) ||
          orgName.toLowerCase().includes(q) ||
          orgDisplayName.includes(q) ||
          email.includes(q)
        );
      }}
    />
  );
}
