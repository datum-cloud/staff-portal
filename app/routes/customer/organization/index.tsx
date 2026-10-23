import type { Route } from './+types/index';
import { CustomerStatus } from '@/components/badge';
import { DateTime } from '@/components/date';
import {
  billingAccountHasCriticalPaymentFailure,
  formatPaymentMethodFailureTooltip,
  getCriticalFailedPaymentMethod,
  orgNameFromNamespace,
} from '@/features/billing/utils';
import { ListPage, ListTable, ListColumnHeader } from '@/features/milo';
import type { GqlOrganization } from '@/resources/gql/organization.gql';
import {
  useAllOrganizationsQuery,
  useBillingAccountListQuery,
  usePaymentMethodListQuery,
} from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { createColumnHelper } from '@/utils/table';
import { t } from '@lingui/core/macro';
import type {
  ComMiloapisBillingV1Alpha1BillingAccount,
  ComMiloapisBillingV1Alpha1PaymentMethod,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { Building2, User } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Organizations`);
};

type OrgDisplayStatus = 'Active' | 'Inactive' | 'Failed';

type OrgRow = GqlOrganization & {
  displayStatus: OrgDisplayStatus;
  statusTooltip: string;
};

const columnHelper = createColumnHelper<OrgRow>();

function orgPaymentFailureTooltip(
  accounts: ComMiloapisBillingV1Alpha1BillingAccount[],
  paymentMethods: ComMiloapisBillingV1Alpha1PaymentMethod[]
): string {
  for (const account of accounts) {
    const failed = getCriticalFailedPaymentMethod(account, paymentMethods);
    if (failed) return formatPaymentMethodFailureTooltip(failed);
  }
  return t`Provider error`;
}

export default function Page() {
  const tableQuery = useAllOrganizationsQuery();
  const billingQuery = useBillingAccountListQuery({ limit: 500 });
  const paymentMethodsQuery = usePaymentMethodListQuery();
  const orgs = useMemo(() => tableQuery.data?.items ?? [], [tableQuery.data]);
  const paymentMethods = useMemo(
    () => paymentMethodsQuery.data?.items ?? [],
    [paymentMethodsQuery.data?.items]
  );

  const accountsByOrg = useMemo(() => {
    const map = new Map<string, ComMiloapisBillingV1Alpha1BillingAccount[]>();
    for (const account of billingQuery.data?.items ?? []) {
      const orgName = orgNameFromNamespace(account.metadata?.namespace);
      if (!orgName) continue;
      const existing = map.get(orgName) ?? [];
      existing.push(account);
      map.set(orgName, existing);
    }
    return map;
  }, [billingQuery.data?.items]);

  const rows = useMemo<OrgRow[]>(
    () =>
      orgs.map((org) => {
        const orgAccounts = accountsByOrg.get(org.name) ?? [];
        const hasPaymentFailure = orgAccounts.some((account) =>
          billingAccountHasCriticalPaymentFailure(account, paymentMethods)
        );
        const onboardingTooltip = org.onboardingComplete
          ? t`Fully onboarded`
          : (org.onboardingMessage ?? org.onboardingReason ?? t`Onboarding incomplete`);

        return {
          ...org,
          displayStatus: hasPaymentFailure
            ? 'Failed'
            : ((org.onboardingStatus as OrgDisplayStatus) ?? 'Inactive'),
          statusTooltip: hasPaymentFailure
            ? orgPaymentFailureTooltip(orgAccounts, paymentMethods)
            : onboardingTooltip,
        };
      }),
    [orgs, accountsByOrg, paymentMethods]
  );

  const columns = [
    columnHelper.accessor('name', {
      id: 'organizationName',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Name`} />,
      cell: ({ row }) => (
        <Link to={`./${row.original.name}`}>{row.original.displayName || row.original.name}</Link>
      ),
    }),
    columnHelper.accessor((row) => row.contactInfo?.businessName ?? '', {
      id: 'company',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Company`} />,
      cell: ({ getValue, row }) => {
        const company = getValue();
        return company ? (
          <Link to={`./${row.original.name}`} className="block truncate">
            {company}
          </Link>
        ) : (
          <span className="text-muted-foreground">——</span>
        );
      },
    }),
    columnHelper.accessor('displayStatus', {
      id: 'displayStatus',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Status`} />,
      cell: ({ row }) => (
        <CustomerStatus status={row.original.displayStatus} tooltip={row.original.statusTooltip} />
      ),
    }),
    columnHelper.accessor('createdAt', {
      id: 'createdAt',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue() ?? undefined} />,
    }),
  ];

  return (
    <ListPage>
      <ListTable
        loading={tableQuery.isPending || billingQuery.isPending || paymentMethodsQuery.isPending}
        data={rows}
        columns={columns}
        pageSize={100}
        layout="flush"
        resourceLabel={t`organizations`}
        getRowId={(row) => row.name}
        defaultSort={[{ id: 'createdAt', desc: true }]}
        searchPlaceholder={t`Search organizations...`}
        emptyMessage={t`No organizations found.`}
        hasMore={tableQuery.data?.hasMore ?? false}
        hasMoreMessage={t`Limited to 10,000 organizations. Refine your search to surface others.`}
        filterFields={[
          {
            id: 'name',
            label: t`Name`,
            type: 'text',
            accessor: (row) => `${row.displayName} ${row.name}`,
          },
          {
            id: 'company',
            label: t`Company`,
            type: 'text',
            accessor: 'contactInfo.businessName',
          },
          {
            id: 'entityType',
            label: t`Type`,
            type: 'enum',
            accessor: 'entityType',
            options: [
              { value: 'Company', label: t`Company`, icon: <Building2 /> },
              { value: 'Individual', label: t`Individual`, icon: <User /> },
            ],
          },
          {
            id: 'displayStatus',
            label: t`Status`,
            type: 'enum',
            accessor: 'displayStatus',
            options: [
              { value: 'Active', label: <CustomerStatus status="active" /> },
              { value: 'Inactive', label: <CustomerStatus status="inactive" /> },
              {
                value: 'Failed',
                label: (
                  <CustomerStatus
                    status="failed"
                    label="Payment Failed"
                    className="w-auto px-1.5"
                  />
                ),
              },
            ],
          },
          { id: 'createdAt', label: t`Created`, type: 'date', accessor: 'createdAt' },
        ]}
        searchFn={(row, search) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return (
            row.name.toLowerCase().includes(q) ||
            row.displayName.toLowerCase().includes(q) ||
            row.type.toLowerCase().includes(q) ||
            (row.contactInfo?.businessName?.toLowerCase().includes(q) ?? false) ||
            (row.contactInfo?.email?.toLowerCase().includes(q) ?? false) ||
            (row.contactInfo?.name?.toLowerCase().includes(q) ?? false)
          );
        }}
      />
    </ListPage>
  );
}
