import { BadgeCondition } from '@/components/badge';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateTime } from '@/components/date';
import { DialogConfirm } from '@/components/dialog';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { ActionItem, DataTable } from '@datum-cloud/datum-ui/data-table';
import { toast } from '@datum-cloud/datum-ui/toast';
import { t } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import {
  ComMiloapisQuotaV1Alpha1ResourceGrant,
  ComMiloapisQuotaV1Alpha1ResourceGrantList,
} from '@openapi/quota.miloapis.com/v1alpha1';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { Trash2Icon } from 'lucide-react';
import { useMemo, useState } from 'react';

interface QuotaGrantListProps {
  queryKeyPrefix: string[];
  fetchFn: (params?: Record<string, unknown>) => Promise<ComMiloapisQuotaV1Alpha1ResourceGrantList>;
  deleteGrantFn: (name: string, namespace: string) => Promise<unknown>;
}

const columnHelper = createColumnHelper<ComMiloapisQuotaV1Alpha1ResourceGrant>();

function computeAllocationByResourceType(
  allowances: ComMiloapisQuotaV1Alpha1ResourceGrant['spec']['allowances'] | undefined
) {
  const allocationByResourceType = new Map<string, number>();
  const list = allowances || [];
  for (const allowance of list) {
    const sumForAllowance = (allowance.buckets || []).reduce((acc, b) => acc + (b?.amount || 0), 0);
    const prev = allocationByResourceType.get(allowance.resourceType) || 0;
    allocationByResourceType.set(allowance.resourceType, prev + sumForAllowance);
  }
  return Array.from(allocationByResourceType.entries());
}

export function QuotaGrantList({ queryKeyPrefix, fetchFn, deleteGrantFn }: QuotaGrantListProps) {
  const { t: tMacro } = useLingui();
  const [selectedGrant, setSelectedGrant] = useState<ComMiloapisQuotaV1Alpha1ResourceGrant | null>(
    null
  );

  const tableQuery = useQuery({
    queryKey: [...queryKeyPrefix, 'list'],
    queryFn: () => fetchFn({}),
    enabled: queryKeyPrefix.length > 0 && queryKeyPrefix.some(Boolean),
    staleTime: 60 * 1000,
  });

  const actions: ActionItem<ComMiloapisQuotaV1Alpha1ResourceGrant>[] = useMemo(
    () => [
      {
        label: tMacro`Delete`,
        icon: Trash2Icon,
        variant: 'destructive' as const,
        onClick: (row) => setSelectedGrant(row),
        disabled: (row) => {
          const isInactive = row.status?.conditions?.some(
            (c) => c.type === 'Active' && c.status === 'False'
          );
          if (isInactive) return true;
          return row.metadata?.labels?.['quota.miloapis.com/auto-created'] === 'true';
        },
      },
    ],
    [tMacro]
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('metadata.name', {
        header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
        cell: ({ getValue }) => getValue(),
      }),
      columnHelper.accessor((row) => row.spec.allowances, {
        id: 'resourceTypes',
        header: () => t`Resource Type`,
        cell: ({ getValue }) => {
          const entries = computeAllocationByResourceType(getValue());
          return (
            <div className="flex flex-col gap-1">
              {entries.map(([type]) => (
                <div key={type}>{type}</div>
              ))}
            </div>
          );
        },
      }),
      columnHelper.accessor((row) => row.spec.allowances, {
        id: 'allocations',
        header: () => t`Allocation`,
        cell: ({ getValue }) => {
          const entries = computeAllocationByResourceType(getValue());
          return (
            <div className="flex flex-col gap-1">
              {entries.map(([type, total]) => (
                <div key={type}>{total}</div>
              ))}
            </div>
          );
        },
      }),
      columnHelper.accessor('status', {
        header: () => t`Status`,
        cell: ({ getValue }) => (
          <BadgeCondition status={getValue()} multiple={false} showMessage className="text-xs" />
        ),
      }),
      columnHelper.accessor('metadata.creationTimestamp', {
        id: 'metadata.creationTimestamp',
        header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Created`} />,
        cell: ({ getValue }) => <DateTime date={getValue()} />,
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <div className="text-right" />,
        cell: ({ row }) => (
          <div className="flex w-full justify-end">
            <DataTable.RowActions row={row} actions={actions} />
          </div>
        ),
      }),
    ],
    [actions]
  );

  return (
    <>
      <DialogConfirm
        open={!!selectedGrant}
        onOpenChange={() => setSelectedGrant(null)}
        title={tMacro`Delete Grant`}
        description={tMacro`Are you sure you want to delete grant "${selectedGrant?.metadata?.name}"? This action cannot be undone.`}
        confirmText={tMacro`Delete`}
        cancelText={tMacro`Cancel`}
        variant="destructive"
        requireConfirmation
        onConfirm={async () => {
          await deleteGrantFn(
            selectedGrant?.metadata?.name ?? '',
            selectedGrant?.metadata?.namespace ?? ''
          );
          await new Promise((resolve) => setTimeout(() => resolve(tableQuery.refetch()), 1000));
          setSelectedGrant(null);
          toast.success(tMacro`Grant deleted successfully`);
        }}
      />

      <DataTable.Client
        loading={tableQuery.isLoading}
        data={tableQuery.data?.items ?? []}
        columns={columns}
        pageSize={20}
        getRowId={(row) => `${row.metadata?.namespace ?? ''}/${row.metadata?.name ?? ''}`}
        defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
        searchFn={(row, search) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          const name = (row.metadata?.name ?? '').toLowerCase();
          const types = computeAllocationByResourceType(row.spec?.allowances)
            .map(([type]) => type.toLowerCase())
            .join(' ');
          return name.includes(q) || types.includes(q);
        }}>
        <Card className="m-4 py-4 shadow-none">
          <CardContent className="flex flex-col gap-2 px-4">
            <DataTableToolbar
              search={
                <DataTable.Search placeholder={t`Search grants...`} className="w-full md:w-64" />
              }
            />
            <DataTable.Content
              headerClassName="bg-muted/50"
              className="border-t border-b border-solid"
              emptyMessage={t`No grants found.`}
            />
            <DataTable.Pagination className="pb-0" />
          </CardContent>
        </Card>
      </DataTable.Client>
    </>
  );
}
