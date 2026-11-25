import type { Route } from './+types/index';
import { DateTime } from '@/components/date';
import { DisplayName } from '@/components/display';
import { CreateGroupDialog } from '@/features/group';
import { ListPage, ListTable, ListColumnHeader } from '@/features/milo';
import { STAFF_GROUP_NAMESPACE, useGroupListQuery } from '@/resources/request/client';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { groupRoutes, orgRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { createColumnHelper } from '@/utils/table';
import { Button } from '@datum-cloud/datum-ui/button';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ComMiloapisIamV1Alpha1Group } from '@openapi/iam.miloapis.com/v1alpha1';
import { useState } from 'react';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Groups`);
};

const columnHelper = createColumnHelper<ComMiloapisIamV1Alpha1Group>();

const ORG_NAMESPACE_PREFIX = 'organization-';

/** Who a group belongs to: staff (milo-system) or an organization, from its namespace. */
function GroupOwner({ namespace }: { namespace: string }) {
  if (namespace === STAFF_GROUP_NAMESPACE) {
    return (
      <Text size="sm" textColor="muted">
        <Trans>Staff</Trans>
      </Text>
    );
  }
  if (namespace.startsWith(ORG_NAMESPACE_PREFIX)) {
    const orgName = namespace.slice(ORG_NAMESPACE_PREFIX.length);
    return (
      <Link to={orgRoutes.detail(orgName)} className="text-sm hover:underline">
        {orgName}
      </Link>
    );
  }
  return (
    <Text size="sm" className="font-mono">
      {namespace || '—'}
    </Text>
  );
}

export default function Page() {
  const tableQuery = useGroupListQuery();
  const [createOpen, setCreateOpen] = useState(false);

  const columns = [
    columnHelper.accessor(
      (row) =>
        row.metadata?.annotations?.['kubernetes.io/display-name'] || row.metadata?.name || '',
      {
        id: 'name',
        header: ({ column }) => <ListColumnHeader column={column} title={t`Name`} />,
        cell: ({ getValue, row }) => {
          const { name = '', namespace = '' } = row.original.metadata ?? {};
          return <DisplayName displayName={getValue()} to={groupRoutes.detail(namespace, name)} />;
        },
      }
    ),
    columnHelper.accessor((row) => row.metadata?.namespace ?? '', {
      id: 'namespace',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Owner`} />,
      cell: ({ getValue }) => <GroupOwner namespace={getValue()} />,
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      id: 'metadata.creationTimestamp',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
  ];

  return (
    <ListPage>
      <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ListTable
        loading={tableQuery.isLoading}
        data={tableQuery.data?.items ?? []}
        columns={columns}
        pageSize={50}
        layout="flush"
        actions={
          <Button
            size="xs"
            theme="outline"
            icon={<ACTION_ICONS.add size={14} />}
            onClick={() => setCreateOpen(true)}>
            <Trans>Add Group</Trans>
          </Button>
        }
        getRowId={(row) => `${row.metadata?.namespace ?? ''}/${row.metadata?.name ?? ''}`}
        defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
        searchPlaceholder={t`Search groups...`}
        emptyMessage={t`No groups found.`}
        filterFields={[
          {
            id: 'name',
            label: t`Name`,
            type: 'text',
            accessor: (row) =>
              `${row.metadata?.annotations?.['kubernetes.io/display-name'] ?? ''} ${row.metadata?.name ?? ''}`,
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
          const name = (row.metadata?.name ?? '').toLowerCase();
          const displayName = (
            row.metadata?.annotations?.['kubernetes.io/display-name'] ?? ''
          ).toLowerCase();
          const namespace = (row.metadata?.namespace ?? '').toLowerCase();
          return name.includes(q) || displayName.includes(q) || namespace.includes(q);
        }}
      />
    </ListPage>
  );
}
