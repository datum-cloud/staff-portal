import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DisplayName } from '@/components/display';
import {
  ResourceTable,
  type ResourceListFn,
  type ResourceTarget,
} from '@/components/resource-table';
import { orgListQuery } from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { t } from '@lingui/core/macro';
import type { ComMiloapisResourcemanagerV1Alpha1Organization } from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Organizations`);
};

const columnHelper = createColumnHelper<ComMiloapisResourcemanagerV1Alpha1Organization>();

const ORGANIZATION_RESOURCE: ResourceTarget = {
  group: 'resourcemanager.miloapis.com',
  version: 'v1alpha1',
  kind: 'Organization',
};

const listOrganizations: ResourceListFn<ComMiloapisResourcemanagerV1Alpha1Organization> = async ({
  limit,
  cursor,
}) => {
  const data = await orgListQuery({ limit, cursor });
  return { items: data.items ?? [], continue: data.metadata?.continue };
};

export default function Page() {
  const columns = useMemo(
    () => [
      columnHelper.accessor('metadata.name', {
        header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
        cell: ({ row }) => {
          const orgName = row.original.metadata?.name ?? '';
          const displayName =
            row.original.metadata?.annotations?.['kubernetes.io/display-name'] ?? '';
          return (
            <DisplayName displayName={displayName || orgName} name={orgName} to={`./${orgName}`} />
          );
        },
      }),
      columnHelper.accessor('spec.type', {
        id: 'type',
        header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Type`} />,
        cell: ({ getValue }) => <BadgeState state={getValue() ?? 'Organization'} />,
      }),
      columnHelper.accessor('metadata.creationTimestamp', {
        id: 'metadata.creationTimestamp',
        header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Created`} />,
        cell: ({ getValue }) => <DateTime date={getValue()} />,
      }),
    ],
    []
  );

  return (
    <ResourceTable<ComMiloapisResourcemanagerV1Alpha1Organization>
      resource={ORGANIZATION_RESOURCE}
      list={listOrganizations}
      columns={columns}
      getRowId={(row) => row.metadata?.name ?? ''}
      searchPlaceholder={t`Search organizations...`}
      emptyMessage={t`No organizations found.`}
    />
  );
}
