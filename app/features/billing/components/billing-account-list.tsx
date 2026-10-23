import {
  getBillingAccountDisplayName,
  getBillingAccountDisplayStatus,
  orgNameFromNamespace,
} from '../utils';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DisplayName } from '@/components/display';
import { ListTable, ListColumnHeader } from '@/features/milo';
import { useOrganizationSearch, useProjectSearch } from '@/hooks/use-search';
import {
  useBillingAccountBindingListQuery,
  useBillingAccountListQuery,
  useOrgListQuery,
  usePaymentMethodListQuery,
} from '@/resources/request/client';
import { billingAccountRoutes, orgRoutes } from '@/utils/config/routes.config';
import { createColumnHelper } from '@/utils/table';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import type { ComMiloapisBillingV1Alpha1BillingAccount } from '@openapi/billing.miloapis.com/v1alpha1';
import { useMemo } from 'react';
import { Link } from 'react-router';

type BillingAccountRow = ComMiloapisBillingV1Alpha1BillingAccount & {
  organizationName: string;
  projectIds: string[];
};

const columnHelper = createColumnHelper<BillingAccountRow>();

function accountKey(namespace: string | undefined, name: string | undefined): string {
  return `${namespace ?? ''}/${name ?? ''}`;
}

export function BillingAccountList() {
  const tableQuery = useBillingAccountListQuery();
  const bindingsQuery = useBillingAccountBindingListQuery();
  const paymentMethodsQuery = usePaymentMethodListQuery();
  const orgQuery = useOrgListQuery({ limit: 500 });
  const orgSearch = useOrganizationSearch();
  const projectSearch = useProjectSearch();

  const paymentMethods = useMemo(
    () => paymentMethodsQuery.data?.items ?? [],
    [paymentMethodsQuery.data?.items]
  );

  const orgLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const org of orgQuery.data?.items ?? []) {
      map.set(org.name, org.contactInfo?.businessName || org.displayName || org.name);
    }
    for (const option of orgSearch.options) {
      if (!map.has(option.value)) map.set(option.value, option.label);
    }
    return map;
  }, [orgQuery.data?.items, orgSearch.options]);

  // Active bindings → projects per billing account (namespace/name key).
  const projectsByAccount = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const binding of bindingsQuery.data?.items ?? []) {
      if (binding.status?.phase && binding.status.phase !== 'Active') continue;
      const accountName = binding.spec?.billingAccountRef?.name;
      const projectName = binding.spec?.projectRef?.name;
      if (!accountName || !projectName) continue;
      const key = accountKey(binding.metadata?.namespace, accountName);
      const existing = map.get(key);
      if (existing) {
        if (!existing.includes(projectName)) existing.push(projectName);
      } else {
        map.set(key, [projectName]);
      }
    }
    return map;
  }, [bindingsQuery.data?.items]);

  const rows: BillingAccountRow[] = useMemo(() => {
    return (tableQuery.data?.items ?? []).map((account) => {
      const organizationName = orgNameFromNamespace(account.metadata?.namespace);
      const key = accountKey(account.metadata?.namespace, account.metadata?.name);
      return {
        ...account,
        organizationName,
        projectIds: projectsByAccount.get(key) ?? [],
      };
    });
  }, [tableQuery.data?.items, projectsByAccount]);

  const organizationOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (!row.organizationName) continue;
      counts.set(row.organizationName, (counts.get(row.organizationName) ?? 0) + 1);
    }

    const byValue = new Map<string, { value: string; label: string; searchText: string }>();
    for (const [name, count] of counts) {
      if (count === 0) continue;
      const label = orgLabels.get(name) ?? name;
      byValue.set(name, { value: name, label, searchText: `${label} ${name}` });
    }
    for (const option of orgSearch.options) {
      if (!byValue.has(option.value)) {
        byValue.set(option.value, {
          value: option.value,
          label: option.label,
          searchText: option.searchText ?? `${option.label} ${option.value}`,
        });
      }
    }
    return Array.from(byValue.values()).sort(
      (a, b) =>
        (counts.get(b.value) ?? 0) - (counts.get(a.value) ?? 0) || a.label.localeCompare(b.label)
    );
  }, [rows, orgLabels, orgSearch.options]);

  const projectOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      for (const projectId of row.projectIds) {
        counts.set(projectId, (counts.get(projectId) ?? 0) + 1);
      }
    }

    const labels = new Map<string, string>();
    for (const option of projectSearch.options) {
      labels.set(option.value, option.label);
    }

    const byValue = new Map<string, { value: string; label: string; searchText: string }>();
    for (const [name, count] of counts) {
      if (count === 0) continue;
      const label = labels.get(name) ?? name;
      byValue.set(name, { value: name, label, searchText: `${label} ${name}` });
    }
    for (const option of projectSearch.options) {
      if (!byValue.has(option.value)) {
        byValue.set(option.value, {
          value: option.value,
          label: option.label,
          searchText: option.searchText ?? `${option.label} ${option.value}`,
        });
      }
    }
    return Array.from(byValue.values()).sort(
      (a, b) =>
        (counts.get(b.value) ?? 0) - (counts.get(a.value) ?? 0) || a.label.localeCompare(b.label)
    );
  }, [rows, projectSearch.options]);

  const currencyOptions = useMemo(() => {
    const codes = new Set<string>();
    for (const row of rows) {
      const code = row.spec?.currencyCode?.trim();
      if (code) codes.add(code);
    }
    return Array.from(codes)
      .sort()
      .map((value) => ({ value, label: value }));
  }, [rows]);

  // Status is derived (Failed beats the phase), so offer whichever states occur.
  const statusOptions = useMemo(() => {
    const states = new Set(
      rows.map((row) => getBillingAccountDisplayStatus(row, paymentMethods).state)
    );
    return Array.from(states)
      .sort()
      .map((state) => ({ value: state, label: <BadgeState state={state} /> }));
  }, [rows, paymentMethods]);

  const columns = [
    columnHelper.display({
      id: 'displayName',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Name`} />,
      cell: ({ row }) => {
        const orgName = row.original.organizationName;
        const accountName = row.original.metadata?.name ?? '';
        const displayName = getBillingAccountDisplayName(row.original);
        return (
          <DisplayName
            displayName={displayName}
            to={billingAccountRoutes.detail(orgName, accountName)}
          />
        );
      },
    }),
    columnHelper.accessor((row) => row.spec?.contactInfo?.businessName ?? '', {
      id: 'businessName',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Company`} />,
      cell: ({ getValue }) => {
        const company = getValue();
        return company ? <Text>{company}</Text> : <span className="text-muted-foreground">——</span>;
      },
    }),
    columnHelper.accessor('organizationName', {
      id: 'organizationName',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Organization`} />,
      cell: ({ getValue }) => {
        const orgName = getValue();
        if (!orgName) return <Text>—</Text>;
        const label = orgLabels.get(orgName) ?? orgName;
        return (
          <Link to={orgRoutes.detail(orgName)} className="block truncate">
            {label}
          </Link>
        );
      },
    }),
    columnHelper.accessor('status.phase', {
      id: 'phase',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Status`} />,
      cell: ({ row }) => {
        const { state, tooltip } = getBillingAccountDisplayStatus(row.original, paymentMethods);
        return <BadgeState state={state} tooltip={tooltip} />;
      },
    }),
    columnHelper.accessor('spec.currencyCode', {
      id: 'currencyCode',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Currency`} />,
      cell: ({ getValue }) => <Text>{getValue() ?? '—'}</Text>,
    }),
    columnHelper.accessor('status.linkedProjectsCount', {
      id: 'linkedProjectsCount',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Linked projects`} />,
      cell: ({ getValue }) => <Text>{getValue() ?? 0}</Text>,
    }),
    columnHelper.accessor('spec.contactInfo.email', {
      id: 'contactEmail',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Contact email`} />,
      cell: ({ getValue }) => <Text>{getValue() ?? '—'}</Text>,
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      id: 'created',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
  ];

  return (
    <ListTable
      loading={tableQuery.isLoading}
      data={rows}
      columns={columns}
      pageSize={20}
      layout="flush"
      getRowId={(row) => accountKey(row.metadata?.namespace, row.metadata?.name)}
      defaultSort={[{ id: 'created', desc: true }]}
      searchPlaceholder={t`Search billing accounts...`}
      emptyMessage={t`No billing accounts found`}
      filterFields={[
        {
          id: 'name',
          label: t`Name`,
          type: 'text',
          accessor: (row) => `${getBillingAccountDisplayName(row)} ${row.metadata?.name ?? ''}`,
        },
        {
          id: 'company',
          label: t`Company`,
          type: 'text',
          accessor: 'spec.contactInfo.businessName',
        },
        {
          id: 'organization',
          label: t`Organization`,
          type: 'enum',
          accessor: 'organizationName',
          options: organizationOptions,
          emptyHint: t`Type at least 2 characters to search all organizations.`,
          onSearchChange: orgSearch.setSearch,
          isSearching: orgSearch.isLoading,
        },
        {
          id: 'project',
          label: t`Project`,
          type: 'enum',
          accessor: 'projectIds',
          options: projectOptions,
          emptyHint: t`Type at least 2 characters to search all projects.`,
          onSearchChange: projectSearch.setSearch,
          isSearching: projectSearch.isLoading,
        },
        {
          id: 'status',
          label: t`Status`,
          type: 'enum',
          accessor: (row) => getBillingAccountDisplayStatus(row, paymentMethods).state,
          options: statusOptions,
        },
        {
          id: 'currency',
          label: t`Currency`,
          type: 'enum',
          accessor: 'spec.currencyCode',
          options: currencyOptions,
        },
        {
          id: 'linkedProjects',
          label: t`Linked projects`,
          type: 'number',
          accessor: 'status.linkedProjectsCount',
        },
        {
          id: 'contactEmail',
          label: t`Contact email`,
          type: 'text',
          accessor: 'spec.contactInfo.email',
        },
        {
          id: 'created',
          label: t`Created`,
          type: 'date',
          accessor: 'metadata.creationTimestamp',
        },
      ]}
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const displayName = getBillingAccountDisplayName(row).toLowerCase();
        const name = (row.metadata?.name ?? '').toLowerCase();
        const orgLabel = (orgLabels.get(row.organizationName) ?? '').toLowerCase();
        const businessName = (row.spec?.contactInfo?.businessName ?? '').toLowerCase();
        const email = (row.spec?.contactInfo?.email ?? '').toLowerCase();
        const currency = (row.spec?.currencyCode ?? '').toLowerCase();
        return (
          displayName.includes(q) ||
          name.includes(q) ||
          row.organizationName.toLowerCase().includes(q) ||
          orgLabel.includes(q) ||
          businessName.includes(q) ||
          email.includes(q) ||
          currency.includes(q) ||
          row.projectIds.some((id) => id.toLowerCase().includes(q))
        );
      }}
    />
  );
}
