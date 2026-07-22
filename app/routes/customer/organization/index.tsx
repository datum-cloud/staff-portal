import type { Route } from './+types/index';
import { CustomerStatus } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DisplayId } from '@/components/display';
import { orgNameFromNamespace } from '@/features/billing/utils';
import {
  DATE_RANGE_OPTIONS,
  ListGrowthChart,
  ListPage,
  ListTable,
  ListColumnHeader,
} from '@/features/milo';
import {
  type GqlOrganization,
  useAllOrganizationsQuery,
  useBillingAccountListQuery,
} from '@/resources/request/client';
import { billingAccountRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { t } from '@lingui/core/macro';
import type { ComMiloapisBillingV1Alpha1BillingAccount } from '@openapi/billing.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { Building2, User } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Organizations`);
};

type BillingContact = {
  name: string;
  email: string;
  accountName: string;
};

type OrgRow = GqlOrganization & {
  billingContacts: BillingContact[];
};

const columnHelper = createColumnHelper<OrgRow>();

const getOrgCreatedAt = (org: GqlOrganization) => org.createdAt;

function contactFromAccount(
  account: ComMiloapisBillingV1Alpha1BillingAccount
): BillingContact | null {
  const accountName = account.metadata?.name ?? '';
  const email = account.spec?.contactInfo?.email?.trim() ?? '';
  const name = account.spec?.contactInfo?.name?.trim() || email || accountName;
  if (!accountName || (!email && !name)) return null;
  return { name, email, accountName };
}

export default function Page() {
  const tableQuery = useAllOrganizationsQuery();
  const billingQuery = useBillingAccountListQuery({ limit: 500 });
  const orgs = useMemo(() => tableQuery.data?.items ?? [], [tableQuery.data]);
  const activeOrgs = useMemo(() => orgs.filter((org) => org.onboardingComplete), [orgs]);

  const contactsByOrg = useMemo(() => {
    const map = new Map<string, BillingContact[]>();
    const accounts = [...(billingQuery.data?.items ?? [])].sort((a, b) => {
      const readyA = a.status?.phase === 'Ready' ? 0 : 1;
      const readyB = b.status?.phase === 'Ready' ? 0 : 1;
      return readyA - readyB;
    });

    for (const account of accounts) {
      const orgName = orgNameFromNamespace(account.metadata?.namespace);
      const contact = contactFromAccount(account);
      if (!orgName || !contact) continue;

      const existing = map.get(orgName) ?? [];
      const dedupeKey = contact.email.toLowerCase() || contact.accountName;
      if (existing.some((c) => (c.email.toLowerCase() || c.accountName) === dedupeKey)) {
        continue;
      }
      existing.push(contact);
      map.set(orgName, existing);
    }
    return map;
  }, [billingQuery.data?.items]);

  const rows = useMemo<OrgRow[]>(
    () =>
      orgs.map((org) => ({
        ...org,
        billingContacts: contactsByOrg.get(org.name) ?? [],
      })),
    [orgs, contactsByOrg]
  );

  const columns = [
    columnHelper.accessor('name', {
      id: 'id',
      header: ({ column }) => <ListColumnHeader column={column} title={t`ID`} />,
      cell: ({ getValue }) => <DisplayId value={getValue() ?? ''} />,
    }),
    columnHelper.accessor('name', {
      id: 'organizationName',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Organization Name`} />,
      cell: ({ row }) => (
        <Link to={`./${row.original.name}`}>{row.original.displayName || row.original.name}</Link>
      ),
    }),
    columnHelper.accessor((row) => row.contactInfo?.businessName ?? '', {
      id: 'company',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Company Name`} />,
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
    columnHelper.accessor((row) => row.billingContacts.length, {
      id: 'billingContact',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Billing Contact`} />,
      cell: ({ row }) => {
        const contacts = row.original.billingContacts;
        if (contacts.length === 0) {
          return <span className="text-muted-foreground">——</span>;
        }
        const emails = contacts
          .map((contact) => contact.email)
          .filter(Boolean)
          .join(', ');
        const primary = contacts[0];
        const href = billingAccountRoutes.detail(row.original.name, primary.accountName);
        const label = emails || primary.name;
        return (
          <Link to={href} className="block truncate text-sm">
            {label}
          </Link>
        );
      },
    }),
    columnHelper.accessor('onboardingStatus', {
      id: 'onboardingStatus',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Status`} />,
      cell: ({ row }) => (
        <CustomerStatus
          status={row.original.onboardingStatus}
          tooltip={
            row.original.onboardingComplete
              ? t`Fully onboarded`
              : (row.original.onboardingMessage ??
                row.original.onboardingReason ??
                t`Onboarding incomplete`)
          }
        />
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
        loading={tableQuery.isPending || billingQuery.isPending}
        data={rows}
        columns={columns}
        pageSize={100}
        resourceLabel={t`organizations`}
        getRowId={(row) => row.name}
        defaultSort={[{ id: 'createdAt', desc: true }]}
        searchPlaceholder={t`Search organizations...`}
        emptyMessage={t`No organizations found.`}
        hasMore={tableQuery.data?.hasMore ?? false}
        hasMoreMessage={t`Limited to 10,000 organizations. Refine your search to surface others.`}
        toolbar={
          <ListGrowthChart
            items={activeOrgs}
            getCreatedAt={getOrgCreatedAt}
            title={t`Active organizations`}
            loading={tableQuery.isPending}
          />
        }
        filters={[
          {
            column: 'entityType',
            label: t`Type`,
            options: [
              { value: 'Company', label: t`Company`, icon: <Building2 /> },
              { value: 'Individual', label: t`Individual`, icon: <User /> },
            ],
          },
          {
            column: 'onboardingStatus',
            label: t`Status`,
            options: [
              { value: 'Active', label: <CustomerStatus status="active" /> },
              { value: 'Inactive', label: <CustomerStatus status="inactive" /> },
            ],
          },
          {
            column: 'createdAt',
            label: t`Created`,
            type: 'dateRange',
            options: DATE_RANGE_OPTIONS,
          },
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
            (row.contactInfo?.name?.toLowerCase().includes(q) ?? false) ||
            row.billingContacts.some(
              (contact) =>
                contact.email.toLowerCase().includes(q) || contact.name.toLowerCase().includes(q)
            )
          );
        }}
      />
    </ListPage>
  );
}
