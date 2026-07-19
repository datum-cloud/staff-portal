import { BadgeState } from '@/components/badge';
import { DisplayName } from '@/components/display';
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
import type { GqlOrgMember } from '@/modules/graphql/organizations';
import { orgRoutes, userRoutes } from '@/utils/config/routes.config';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router';

const PREVIEW_LIMIT = 8;
const columnHelper = createColumnHelper<GqlOrgMember>();

type Props = {
  orgName: string;
  members: GqlOrgMember[];
  isLoading?: boolean;
  className?: string;
};

export function OrgMembersPreviewCard({ orgName, members, isLoading, className }: Props) {
  const preview = members.slice(0, PREVIEW_LIMIT);

  const columns = [
    columnHelper.accessor('givenName', {
      id: 'name',
      enableSorting: false,
      header: ({ column }) => <ListColumnHeader column={column} title={t`Name`} />,
      cell: ({ row }) => {
        const displayName =
          `${row.original.givenName ?? ''} ${row.original.familyName ?? ''}`.trim() ||
          row.original.email ||
          row.original.name;
        return (
          <DisplayName
            displayName={displayName}
            name={row.original.email || undefined}
            to={row.original.userName ? userRoutes.detail(row.original.userName) : undefined}
          />
        );
      },
    }),
    columnHelper.accessor('invitationState', {
      id: 'status',
      enableSorting: false,
      header: ({ column }) => <ListColumnHeader column={column} title={t`Status`} />,
      cell: ({ getValue, row }) => (
        <BadgeState state={getValue() || (row.original.type === 'member' ? 'Active' : 'Pending')} />
      ),
    }),
    columnHelper.accessor('roles', {
      id: 'role',
      enableSorting: false,
      header: ({ column }) => <ListColumnHeader column={column} title={t`Role`} />,
      cell: ({ getValue }) => <BadgeState state={getValue()?.[0] ?? '—'} />,
    }),
  ];

  return (
    <TableCard
      className={cn(className)}
      title={<Trans>Members</Trans>}
      action={
        <Link
          to={orgRoutes.member(orgName)}
          className="text-muted-foreground hover:text-foreground text-sm">
          <Trans>View all</Trans>
        </Link>
      }>
      {isLoading ? (
        <Text className="text-muted-foreground px-4 py-6" size="sm">
          <Trans>Loading members…</Trans>
        </Text>
      ) : preview.length === 0 ? (
        <Text className="text-muted-foreground px-4 py-6" size="sm">
          <Trans>No members</Trans>
        </Text>
      ) : (
        <DataTable.Client
          data={preview}
          columns={columns as ColumnDef<GqlOrgMember, unknown>[]}
          pageSize={PREVIEW_LIMIT}
          getRowId={(row) => row.name}>
          <DataTable.Content
            headerClassName={LIST_TABLE_HEADER_CLASS}
            headerRowClassName={LIST_TABLE_HEADER_ROW_CLASS}
            headerCellClassName={EMBEDDED_TABLE_HEADER_CELL_CLASS}
            bodyClassName={EMBEDDED_TABLE_BODY_CLASS}
            rowClassName={LIST_TABLE_ROW_CLASS}
            cellClassName={EMBEDDED_TABLE_CELL_CLASS}
            emptyMessage={t`No members`}
          />
        </DataTable.Client>
      )}
    </TableCard>
  );
}
