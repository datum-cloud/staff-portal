import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DisplayId } from '@/components/display';
import {
  DATE_RANGE_OPTIONS,
  ListGrowthChart,
  ListPage,
  ListTable,
  ListColumnHeader,
} from '@/features/milo';
import {
  ProjectCleanupMessage,
  ProjectDeletingFor,
  ProjectPhaseBadge,
  projectPhaseFilter,
} from '@/features/project';
import { type ProjectPhase, withProjectPhase } from '@/features/project/lib/project-deletion';
import { useOrganizationSearch } from '@/hooks/use-search';
import { type GqlProject, useAllProjectsQuery } from '@/resources/request/client';
import { billingAccountRoutes, orgRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { t } from '@lingui/core/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Projects`);
};

type ProjectListRow = GqlProject & { phase: ProjectPhase };

const columnHelper = createColumnHelper<ProjectListRow>();

const getProjectCreatedAt = (project: GqlProject) => project.createdAt;

export default function Page() {
  const tableQuery = useAllProjectsQuery();
  const projects = useMemo(
    () => (tableQuery.data?.items ?? []).map(withProjectPhase),
    [tableQuery.data]
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
    columnHelper.accessor('name', {
      id: 'id',
      header: ({ column }) => <ListColumnHeader column={column} title={t`ID`} />,
      cell: ({ getValue }) => <DisplayId value={getValue() ?? ''} />,
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
        return <Link to={orgRoutes.detail(orgName)}>{displayName}</Link>;
      },
    }),
    columnHelper.accessor('hasActiveBillingAccount', {
      id: 'hasActiveBillingAccount',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Billing`} />,
      cell: ({ getValue, row }) => {
        const hasBilling = getValue();
        const orgName = row.original.organizationName;
        const accountName = row.original.billingAccountName;
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
        getRowId={(row) => row.name}
        defaultSort={[{ id: 'createdAt', desc: true }]}
        searchPlaceholder={t`Search projects...`}
        emptyMessage={t`No projects found.`}
        hasMore={tableQuery.data?.hasMore ?? false}
        hasMoreMessage={t`Limited to 10,000 projects. Refine your search to surface others.`}
        toolbar={
          <ListGrowthChart
            items={projects}
            getCreatedAt={getProjectCreatedAt}
            title={t`Total projects`}
            loading={tableQuery.isLoading}
          />
        }
        filters={[
          {
            type: 'searchable',
            column: 'organizationName',
            label: t`Organization`,
            options: organizationOptions,
            searchPlaceholder: t`Search organizations…`,
            emptyHint: t`Type at least 2 characters to search all organizations.`,
            pageSize: 8,
            onSearchChange: orgSearch.setSearch,
            isSearching: orgSearch.isLoading,
          },
          {
            column: 'hasActiveBillingAccount',
            label: t`Billing`,
            options: [
              { value: 'true', label: <BadgeState state="yes" /> },
              { value: 'false', label: <BadgeState state="no" /> },
            ],
          },
          projectPhaseFilter(t`Status`),
          {
            column: 'createdAt',
            label: t`Created`,
            type: 'dateRange' as const,
            options: DATE_RANGE_OPTIONS,
          },
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
