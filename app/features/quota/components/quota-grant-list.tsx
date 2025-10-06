import { BadgeCondition } from '@/components/badge';
import { DateFormatter } from '@/components/date';
import { DialogConfirm } from '@/components/dialog';
import {
  ActionItem,
  DataTable,
  DataTableProvider,
  useDataTableQuery,
} from '@/modules/datum-ui/data-table';
import { toast } from '@/modules/datum-ui/toast';
import { quotaGrantDeleteMutation } from '@/resources/request/client';
import { ResourceGrant, ResourceGrantListResponse } from '@/resources/schemas';
import { Trans, useLingui } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { Trash2Icon } from 'lucide-react';
import { useState } from 'react';

interface QuotaGrantListProps {
  queryKeyPrefix: string[];
  fetchFn: (params: any) => Promise<ResourceGrantListResponse>;
}

const columnHelper = createColumnHelper<ResourceGrant>();

function computeAllocationByResourceType(
  allowances: ResourceGrant['spec']['allowances'] | undefined
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

const columns = [
  columnHelper.accessor('metadata.name', {
    header: () => <Trans>Name</Trans>,
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((row) => row.spec.allowances, {
    id: 'resourceTypes',
    header: () => <Trans>Resource Type</Trans>,
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
    header: () => <Trans>Allocation</Trans>,
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
    header: () => <Trans>Status</Trans>,
    cell: ({ getValue }) => (
      <BadgeCondition status={getValue()} multiple={false} showMessage className="text-xs" />
    ),
  }),
  columnHelper.accessor('metadata.creationTimestamp', {
    header: () => <Trans>Created</Trans>,
    cell: ({ getValue }) => {
      return <DateFormatter date={getValue()} withTime />;
    },
  }),
];

export function QuotaGrantList({ queryKeyPrefix, fetchFn }: QuotaGrantListProps) {
  const { t } = useLingui();
  const [selectedGrant, setSelectedGrant] = useState<ResourceGrant | null>(null);
  const tableState = useDataTableQuery<ResourceGrantListResponse>({
    queryKeyPrefix,
    fetchFn,
    useSorting: true,
  });

  const actions: ActionItem<ResourceGrant>[] = [
    {
      label: 'Delete',
      icon: Trash2Icon,
      variant: 'destructive' as const,
      onClick: (row) => setSelectedGrant(row),
      disabled: (row) => {
        // Disable if grant is not active
        const isInactive = row.status?.conditions?.some(
          (c) => c.type === 'Active' && c.status === 'False'
        );
        if (isInactive) return true;

        // Disable if grant is auto-created by policy
        const isAutoCreated = row.metadata.labels?.['quota.miloapis.com/auto-created'] === 'true';
        return isAutoCreated;
      },
      tooltip: (row) => {
        // Show tooltip for inactive grants
        const isInactive = row.status?.conditions?.some(
          (c) => c.type === 'Active' && c.status === 'False'
        );
        if (isInactive) {
          return t`Cannot delete inactive grant`;
        }

        // Show tooltip for auto-created grants
        const isAutoCreated = row.metadata.labels?.['quota.miloapis.com/auto-created'] === 'true';
        if (isAutoCreated) {
          const policyName = row.metadata.labels?.['quota.miloapis.com/policy'];
          return policyName
            ? t`Auto-managed by policy "${policyName}". Cannot be deleted.`
            : t`Auto-managed by grant creation policy. Cannot be deleted.`;
        }

        return '';
      },
    },
  ];

  return (
    <>
      <DialogConfirm
        open={!!selectedGrant}
        onOpenChange={() => setSelectedGrant(null)}
        title={t`Delete Grant`}
        description={t`Are you sure you want to delete grant "${selectedGrant?.metadata.name}"? This action cannot be undone.`}
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        requireConfirmation
        onConfirm={async () => {
          try {
            await quotaGrantDeleteMutation(
              selectedGrant?.metadata.name ?? '',
              selectedGrant?.metadata.namespace ?? ''
            );
            await new Promise((resolve) =>
              setTimeout(() => resolve(tableState.query.refetch()), 1000)
            );
            setSelectedGrant(null);
            toast.success(t`Grant deleted successfully`);
          } catch (error) {
            toast.error(t`Failed to delete grant`);
          }
        }}
      />

      <DataTableProvider<ResourceGrant, ResourceGrantListResponse>
        columns={columns}
        actions={actions}
        transform={(resp) => ({
          rows: resp?.data?.items || [],
          cursor: resp?.data?.metadata?.continue,
        })}
        {...tableState}>
        <div className="m-4 flex flex-col gap-2">
          <DataTable<ResourceGrant> />
        </div>
      </DataTableProvider>
    </>
  );
}
