import type { Route } from './+types/index';
import { CustomerStatus } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DisplayId } from '@/components/display';
import {
  DATE_RANGE_OPTIONS,
  ListGrowthChart,
  ListPage,
  ListTable,
  ListColumnHeader,
} from '@/features/milo';
import { type GqlOrganization, useAllOrganizationsQuery } from '@/resources/request/client';
import { orgRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { AvatarStack } from '@datum-cloud/datum-ui/avatar-stack';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { Building2, User } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Organizations`);
};

const columnHelper = createColumnHelper<GqlOrganization>();

const getOrgCreatedAt = (org: GqlOrganization) => org.createdAt;

export default function Page() {
  const tableQuery = useAllOrganizationsQuery();
  const orgs = useMemo(() => tableQuery.data?.items ?? [], [tableQuery.data]);
  const activeOrgs = useMemo(() => orgs.filter((org) => org.onboardingComplete), [orgs]);

  const columns = [
    columnHelper.accessor((row) => row.contactInfo?.businessName ?? '', {
      id: 'company',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Company`} />,
      cell: ({ getValue, row }) => {
        const company = getValue();
        return company ? (
          <Link to={`./${row.original.name}`} className="truncate block">
            {company}
          </Link>
        ) : (
          <span className="text-muted-foreground">——</span>
        );
      },
    }),
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
    columnHelper.accessor('createdAt', {
      id: 'createdAt',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue() ?? undefined} />,
    }),
    columnHelper.accessor('projectCount', {
      id: 'projectCount',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Projects`} />,
      cell: ({ row }) => {
        const count = row.original.projectCount;
        const label = row.original.hasMoreProjects ? `${count}+` : String(count);
        return (
          <Link to={orgRoutes.project(row.original.name)} className="tabular-nums">
            {label}
          </Link>
        );
      },
    }),
    columnHelper.accessor('memberCount', {
      id: 'memberCount',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Members`} />,
      cell: ({ row }) => {
        const avatars = row.original.memberAvatars;
        if (avatars.length === 0) {
          return <span className="text-muted-foreground">——</span>;
        }
        return (
          <Link to={orgRoutes.member(row.original.name)} className="inline-flex">
            <AvatarStack
              avatars={avatars}
              maxAvatarsAmount={4}
              spacing="md"
              avatarClassName="size-6 text-[10px] rounded-xl"
            />
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
  ];

  return (
    <ListPage>
      <ListTable
        loading={tableQuery.isPending}
        data={orgs}
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
            (row.contactInfo?.name?.toLowerCase().includes(q) ?? false)
          );
        }}
      />
    </ListPage>
  );
}
