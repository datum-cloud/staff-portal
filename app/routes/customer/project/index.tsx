import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { ListPage, ListTable, ListColumnHeader } from '@/features/milo';
import {
  PROJECT_PHASE_OPTIONS,
  ProjectCleanupMessage,
  ProjectDeletingFor,
  ProjectPhaseBadge,
} from '@/features/project';
import {
  type ProjectPhase,
  type WithProjectPhase,
  withProjectPhase,
} from '@/features/project/lib/project-phase';
import { useOrganizationSearch } from '@/hooks/use-search';
import type { GqlProject } from '@/resources/gql/project.gql';
import { useAllProjectsQuery, useAllProjectSuspensionsQuery } from '@/resources/request/client';
import { billingAccountRoutes, orgRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { createColumnHelper } from '@/utils/table';
import { t } from '@lingui/core/macro';
import { useMemo } from 'react';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Projects`);
};

type ProjectListRow = WithProjectPhase<GqlProject>;

const columnHelper = createColumnHelper<ProjectListRow>();

export default function Page() {
  const tableQuery = useAllProjectsQuery();

  // Suspension lives on a separate resource; join by project name so a suspended
  // project surfaces as a `Suspended` status (see withProjectPhase precedence).
  const suspensionsQuery = useAllProjectSuspensionsQuery();
  const suspendedProjectNames = useMemo(() => {
    const set = new Set<string>();
    for (const suspension of suspensionsQuery.data ?? []) {
      const name = suspension.spec?.projectRef?.name;
      if (name) set.add(name);
    }
    return set;
  }, [suspensionsQuery.data]);

  const projects = useMemo(
    () =>
      (tableQuery.data?.items ?? []).map((project) =>
        withProjectPhase(project, { suspended: suspendedProjectNames.has(project.name) })
      ),
    [tableQuery.data, suspendedProjectNames]
  );
  const orgSearch = useOrganizationSearch();

  // Seed from orgs present on loaded projects (sorted by count). When the user
  // types 2+ chars, merge in GraphQL search hits so orgs outside the current
  // project page are still findable — never *replace* the local list, or a
  // slow/empty remote search hides rows that were already on screen.
  const projectOrgOptions = useMemo(() => {
    const counts = new Map<string, number>();
    const labels = new Map<string, string>();
    for (const project of projects) {
      const name = project.organizationName;
      if (!name) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
      if (!labels.has(name)) {
        labels.set(
          name,
          project.organizationBusinessName ||
            project.organizationDisplayName ||
            project.organizationName
        );
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || (labels.get(a[0]) ?? '').localeCompare(labels.get(b[0]) ?? ''))
      .map(([value]) => {
        const label = labels.get(value) ?? value;
        return { value, label, searchText: `${label} ${value}` };
      });
  }, [projects]);

  const organizationOptions = useMemo(() => {
    const byValue = new Map(projectOrgOptions.map((option) => [option.value, option]));
    for (const option of orgSearch.options) {
      if (!byValue.has(option.value)) byValue.set(option.value, option);
    }
    return Array.from(byValue.values());
  }, [projectOrgOptions, orgSearch.options]);

  const columns = [
    columnHelper.accessor('name', {
      header: ({ column }) => <ListColumnHeader column={column} title={t`Name`} />,
      cell: ({ row }) => (
        <Link to={`./${row.original.name}`}>{row.original.displayName || row.original.name}</Link>
      ),
    }),
    columnHelper.accessor('phase', {
      header: ({ column }) => <ListColumnHeader column={column} title={t`Status`} />,
      cell: ({ getValue }) => <ProjectPhaseBadge phase={getValue()} />,
    }),
    columnHelper.accessor('deletionTimestamp', {
      id: 'deletingFor',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Deleting for`} />,
      cell: ({ getValue }) => <ProjectDeletingFor deletionTimestamp={getValue()} />,
    }),
    columnHelper.accessor('resourceCleanupMessage', {
      header: ({ column }) => <ListColumnHeader column={column} title={t`Waiting on`} />,
      cell: ({ getValue }) => <ProjectCleanupMessage message={getValue()} />,
    }),
    columnHelper.accessor('organizationBusinessName', {
      id: 'organizationBusinessName',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Company`} />,
      cell: ({ getValue, row }) => {
        const company = getValue();
        const orgName = row.original.organizationName;
        return company ? (
          <Link to={orgRoutes.detail(orgName)} className="block truncate">
            {company}
          </Link>
        ) : (
          <span className="text-muted-foreground">——</span>
        );
      },
    }),
    columnHelper.accessor('organizationDisplayName', {
      id: 'organizationDisplayName',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Organization`} />,
      cell: ({ getValue, row }) => {
        const displayName = getValue();
        const orgName = row.original.organizationName;
        return <Link to={orgRoutes.detail(orgName)}>{displayName ?? orgName}</Link>;
      },
    }),
    columnHelper.accessor('hasActiveBillingAccount', {
      id: 'hasActiveBillingAccount',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Billing`} />,
      cell: ({ getValue, row }) => {
        const hasBilling = getValue();
        const orgName = row.original.organizationName;
        const accountName = row.original.billingAccountName;
        // Null means the gateway could not read billing for this row.
        if (hasBilling == null) {
          return <BadgeState state="unknown" tooltip={t`Billing could not be read`} />;
        }
        const badge = (
          <BadgeState
            state={hasBilling ? 'yes' : 'no'}
            tooltip={
              hasBilling
                ? t`Active billing account with a payment method`
                : t`No active billing account with a payment method`
            }
          />
        );
        if (hasBilling && orgName && accountName) {
          return (
            <Link to={billingAccountRoutes.detail(orgName, accountName)} className="inline-flex">
              {badge}
            </Link>
          );
        }
        return badge;
      },
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
        loading={tableQuery.isLoading}
        data={projects}
        columns={columns}
        pageSize={50}
        layout="flush"
        getRowId={(row) => row.name}
        defaultSort={[{ id: 'createdAt', desc: true }]}
        searchPlaceholder={t`Search projects...`}
        emptyMessage={t`No projects found.`}
        hasMore={tableQuery.data?.hasMore ?? false}
        hasMoreMessage={t`Limited to 10,000 projects. Refine your search to surface others.`}
        filterFields={[
          {
            id: 'name',
            label: t`Name`,
            type: 'text',
            accessor: (row) => `${row.displayName} ${row.name}`,
          },
          {
            id: 'phase',
            label: t`Status`,
            type: 'enum',
            accessor: 'phase',
            options: PROJECT_PHASE_OPTIONS,
          },
          {
            id: 'deletingSince',
            label: t`Deleting since`,
            type: 'date',
            accessor: 'deletionTimestamp',
          },
          {
            id: 'waitingOn',
            label: t`Waiting on`,
            type: 'text',
            accessor: 'resourceCleanupMessage',
          },
          {
            id: 'company',
            label: t`Company`,
            type: 'text',
            accessor: 'organizationBusinessName',
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
            id: 'billing',
            label: t`Billing`,
            type: 'enum',
            accessor: 'hasActiveBillingAccount',
            options: [
              { value: 'true', label: <BadgeState state="yes" /> },
              { value: 'false', label: <BadgeState state="no" /> },
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
            (row.organizationName ?? '').toLowerCase().includes(q) ||
            (row.organizationDisplayName ?? '').toLowerCase().includes(q) ||
            (row.organizationBusinessName?.toLowerCase().includes(q) ?? false) ||
            (row.billingAccountName?.toLowerCase().includes(q) ?? false) ||
            (row.resourceCleanupMessage?.toLowerCase().includes(q) ?? false)
          );
        }}
      />
    </ListPage>
  );
}
