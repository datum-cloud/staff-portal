import {
  APPLICATION_PHASES,
  getApplicationOrgName,
  getApplicationPhase,
  sortApplicationQueue,
  type ApplicationPhase,
  type BillingArrangementApplication,
} from '../lib/payment-terms-applications';
import { getBillingAccountDisplayName } from '../utils';
import { ApplicationPhaseBadge, useApplicationLabels } from './application-labels';
import { useBillingAccountViews } from './billing-account-views';
import { DateTime } from '@/components/date';
import { DisplayName } from '@/components/display';
import { ListColumnHeader, ListTable } from '@/features/milo';
import {
  useBillingAccountListQuery,
  useBillingArrangementApplicationListQuery,
  useOrgListQuery,
} from '@/resources/request/client';
import { billingAccountRoutes, orgRoutes } from '@/utils/config/routes.config';
import { createColumnHelper } from '@/utils/table';
import { Text } from '@datum-cloud/datum-ui/typography';
import { useLingui } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1BillingAccount } from '@openapi/billing.miloapis.com/v1alpha1';
import { useMemo } from 'react';
import { Link } from 'react-router';

type ApplicationRow = BillingArrangementApplication & {
  orgName: string;
  orgLabel: string;
  accountName: string;
  accountLabel: string;
  currency: string;
  phase: ApplicationPhase;
};

const columnHelper = createColumnHelper<ApplicationRow>();

/** Every organization's payment terms applications, for staff to review. */
export function ApplicationList() {
  const { t } = useLingui();
  const labels = useApplicationLabels();
  const views = useBillingAccountViews();
  const applicationsQuery = useBillingArrangementApplicationListQuery();
  const accountsQuery = useBillingAccountListQuery();
  const orgQuery = useOrgListQuery({ limit: 500 });

  const orgLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const org of orgQuery.data?.items ?? []) {
      map.set(org.name, org.contactInfo?.businessName || org.displayName || org.name);
    }
    return map;
  }, [orgQuery.data?.items]);

  const accounts = useMemo(() => {
    const map = new Map<string, ComMiloapisBillingV1Alpha1BillingAccount>();
    for (const account of accountsQuery.data?.items ?? []) {
      map.set(`${account.metadata?.namespace}/${account.metadata?.name}`, account);
    }
    return map;
  }, [accountsQuery.data?.items]);

  const rows = useMemo(
    () =>
      sortApplicationQueue(
        (applicationsQuery.data?.items ?? []).map((application): ApplicationRow => {
          const orgName = getApplicationOrgName(application);
          const accountName = application.spec?.billingAccountRef?.name ?? '';
          const account = accounts.get(`${application.metadata?.namespace}/${accountName}`);
          return {
            ...application,
            orgName,
            orgLabel: orgLabels.get(orgName) ?? orgName,
            accountName,
            accountLabel: account ? getBillingAccountDisplayName(account) : accountName,
            currency: account?.spec?.currencyCode ?? '',
            phase: getApplicationPhase(application),
          };
        })
      ),
    [applicationsQuery.data?.items, accounts, orgLabels]
  );

  const columns = [
    columnHelper.accessor((row) => row.spec?.organization?.legalName ?? '', {
      id: 'legalName',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Applicant`} />,
      cell: ({ row }) => (
        <DisplayName
          displayName={
            row.original.spec?.organization?.legalName || row.original.metadata?.name || ''
          }
          name={row.original.spec?.applicant?.username}
          to={billingAccountRoutes.applications.detail(
            row.original.orgName,
            row.original.metadata?.name ?? ''
          )}
        />
      ),
    }),
    columnHelper.accessor('orgLabel', {
      id: 'organization',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Organization`} />,
      cell: ({ row }) =>
        row.original.orgName ? (
          <Link to={orgRoutes.detail(row.original.orgName)} className="block truncate">
            {row.original.orgLabel}
          </Link>
        ) : (
          <Text>—</Text>
        ),
    }),
    columnHelper.accessor('accountLabel', {
      id: 'billingAccount',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Billing account`} />,
      cell: ({ row }) =>
        row.original.accountName ? (
          <Link
            to={billingAccountRoutes.detail(row.original.orgName, row.original.accountName)}
            className="block truncate">
            {row.original.accountLabel}
          </Link>
        ) : (
          <Text>—</Text>
        ),
    }),
    columnHelper.accessor((row) => row.spec?.paymentOption, {
      id: 'paymentOption',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Asked for`} />,
      cell: ({ getValue }) => {
        const option = getValue();
        return <Text>{option ? labels.paymentOption[option] : '—'}</Text>;
      },
    }),
    columnHelper.display({
      id: 'estimatedSpend',
      header: ({ column }) => (
        <ListColumnHeader column={column} title={t`Estimated monthly spend`} />
      ),
      cell: ({ row }) => {
        const band = row.original.spec?.invoice?.estimatedMonthlySpend;
        return <Text>{band ? labels.spend(band, row.original.currency) : '—'}</Text>;
      },
    }),
    columnHelper.accessor('phase', {
      id: 'phase',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Status`} />,
      cell: ({ row }) => <ApplicationPhaseBadge application={row.original} />,
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      id: 'submitted',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Submitted`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
  ];

  return (
    <ListTable
      loading={applicationsQuery.isLoading}
      data={rows}
      columns={columns}
      pageSize={20}
      layout="flush"
      views={views}
      getRowId={(row) => `${row.metadata?.namespace}/${row.metadata?.name}`}
      searchPlaceholder={t`Search applications...`}
      emptyMessage={t`No payment terms applications yet`}
      filterFields={[
        {
          id: 'status',
          label: t`Status`,
          type: 'enum',
          accessor: 'phase',
          options: APPLICATION_PHASES.map((phase) => ({
            value: phase,
            label: labels.phase[phase],
          })),
        },
        {
          id: 'paymentOption',
          label: t`Asked for`,
          type: 'enum',
          accessor: (row) => row.spec?.paymentOption ?? '',
          options: (['Invoice', 'NotSure'] as const).map((option) => ({
            value: option,
            label: labels.paymentOption[option],
          })),
        },
        {
          id: 'submitted',
          label: t`Submitted`,
          type: 'date',
          accessor: 'metadata.creationTimestamp',
        },
      ]}
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [
          row.spec?.organization?.legalName,
          row.spec?.organization?.website,
          row.spec?.applicant?.username,
          row.spec?.invoice?.accountsPayableEmail,
          row.orgName,
          row.orgLabel,
          row.accountLabel,
          row.metadata?.name,
        ].some((value) => value?.toLowerCase().includes(q));
      }}
    />
  );
}
