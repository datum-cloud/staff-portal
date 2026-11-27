import {
  useConsumerQuotaGrantMutations,
  useConsumerQuotaGrants,
  type QuotaConsumer,
} from '../hooks/use-quota-grants';
import { grantOwner, type GrantOwner } from '../lib/quota-grants';
import { groupQuotas, type QuotaRow } from '../lib/quotas-grouping';
import { GrantOwnerLabel } from './grant-owner-label';
import { BadgeCondition } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DialogConfirm } from '@/components/dialog';
import { TableCard } from '@/features/milo';
import { type GqlQuotaGrant, type GqlQuotaGrantList } from '@/resources/gql/quota.gql';
import { ACTION_ICONS, STATUS_ICONS } from '@/utils/config/icons.config';
import { type ColumnDef } from '@/utils/table';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { ActionItem } from '@datum-cloud/datum-ui/data-table';
import { GroupedTable, type GroupedTableGroup } from '@datum-cloud/datum-ui/grouped-table';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { useLingui } from '@lingui/react/macro';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

interface QuotaGrantListProps {
  /** Start it with the consumer's `quotaQueryKeys…grants.all` so grant changes refresh the table. */
  queryKeyPrefix: readonly string[];
  fetchFn: (params?: Record<string, unknown>) => Promise<GqlQuotaGrantList>;
  consumer: QuotaConsumer;
}

interface QuotaGrantRow extends QuotaRow {
  grant: GqlQuotaGrant;
  allocation: number;
  owner?: GrantOwner;
}

/** Grants a controller owns: deleting them here would just be undone. */
const isLocked = (owner?: GrantOwner): boolean => owner === 'platform' || owner === 'gitops';

const grantKey = (namespace: string, name: string): string => `${namespace}/${name}`;

export function QuotaGrantList({ queryKeyPrefix, fetchFn, consumer }: QuotaGrantListProps) {
  const { t } = useLingui();
  const [selectedGrant, setSelectedGrant] = useState<GqlQuotaGrant | null>(null);

  const tableQuery = useQuery({
    queryKey: [...queryKeyPrefix, 'list'],
    queryFn: () => fetchFn({}),
    enabled: queryKeyPrefix.length > 0 && queryKeyPrefix.some(Boolean),
    staleTime: 60 * 1000,
  });

  // The same grants from the API, whose managedFields tell who owns each (#343).
  const ownersQuery = useConsumerQuotaGrants(consumer);
  const { deleteGrant } = useConsumerQuotaGrantMutations(consumer);

  const owners = useMemo(
    () =>
      new Map(
        (ownersQuery.data?.items ?? []).map((grant) => [
          grantKey(grant.metadata?.namespace ?? '', grant.metadata?.name ?? ''),
          grantOwner(grant),
        ])
      ),
    [ownersQuery.data]
  );

  const rows = useMemo<QuotaGrantRow[]>(() => {
    return (tableQuery.data?.items ?? []).flatMap((grant) =>
      grant.allowances.map((allowance) => ({
        resourceType: allowance.resourceType,
        displayName: allowance.displayName,
        group: allowance.serviceDisplayName,
        percentage: 0,
        allocation: allowance.amount,
        grant,
        owner: owners.get(grantKey(grant.namespace, grant.name)),
      }))
    );
  }, [tableQuery.data, owners]);

  const groups = useMemo<GroupedTableGroup<QuotaGrantRow>[]>(
    () =>
      groupQuotas(rows).map((g) => ({
        id: g.group,
        title: g.group,
        meta: <Badge type="secondary">{g.items.length}</Badge>,
        rows: g.items,
      })),
    [rows]
  );

  const columns = useMemo<ColumnDef<QuotaGrantRow, unknown>[]>(
    () => [
      {
        id: 'resource',
        header: t`Resource`,
        accessorFn: (row) => row.displayName,
        size: 300,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <Text size="xs" className="font-medium">
              {row.original.displayName}
            </Text>
            {row.original.resourceType !== row.original.displayName && (
              <Tooltip message={row.original.resourceType}>
                <STATUS_ICONS.info className="text-muted-foreground size-3 shrink-0 opacity-60" />
              </Tooltip>
            )}
          </div>
        ),
      },
      {
        id: 'grant',
        header: t`Grant`,
        accessorFn: (row) => row.grant.name,
        size: 220,
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <Text size="sm" textColor="muted" className="truncate" title={row.original.grant.name}>
              {row.original.grant.name}
            </Text>
            {row.original.owner && (
              <Text size="xs" textColor="muted" className="opacity-80">
                <GrantOwnerLabel owner={row.original.owner} />
              </Text>
            )}
          </div>
        ),
      },
      {
        id: 'allocation',
        header: t`Allocation`,
        accessorFn: (row) => row.allocation,
        size: 120,
        cell: ({ row }) => (
          <Text size="sm" className="font-mono whitespace-nowrap">
            {row.original.allocation}
          </Text>
        ),
      },
      {
        id: 'status',
        header: t`Status`,
        accessorFn: (row) => row.grant.conditions,
        size: 160,
        cell: ({ row }) => (
          <BadgeCondition
            status={{
              conditions: row.original.grant.conditions.map((c) => ({
                type: c.type,
                status: c.status,
                message: c.message ?? undefined,
              })),
            }}
            multiple={false}
            showMessage
            className="text-xs"
          />
        ),
      },
      {
        id: 'created',
        header: t`Created`,
        accessorFn: (row) => row.grant.createdAt,
        size: 160,
        cell: ({ row }) => <DateTime date={row.original.grant.createdAt ?? undefined} />,
      },
    ],
    [t]
  );

  const rowActions = (): ActionItem<QuotaGrantRow>[] => [
    {
      label: t`Delete`,
      icon: <ACTION_ICONS.delete className="size-4" />,
      variant: 'destructive' as const,
      onClick: (row) => setSelectedGrant(row.grant),
      disabled: (row) => {
        const isInactive = row.grant.conditions.some(
          (c) => c.type === 'Active' && c.status === 'False'
        );
        if (isInactive) return true;
        return row.grant.autoCreated || isLocked(row.owner);
      },
    },
  ];

  return (
    <>
      <DialogConfirm
        open={!!selectedGrant}
        onOpenChange={() => setSelectedGrant(null)}
        title={t`Delete Grant`}
        description={t`Are you sure you want to delete grant "${selectedGrant?.name}"? This action cannot be undone.`}
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        requireConfirmation
        onConfirm={async () => {
          // The mutation hook waits for the quota controller, then refreshes both tables.
          await deleteGrant(selectedGrant?.name ?? '', selectedGrant?.namespace ?? '');
          setSelectedGrant(null);
          toast.success(t`Grant deleted successfully`);
        }}
      />

      <TableCard className="m-4" framed={false} contentClassName="px-0">
        <GroupedTable<QuotaGrantRow>
          columns={columns}
          groups={groups}
          isLoading={tableQuery.isLoading}
          defaultExpanded="all"
          enableSorting
          enableSearch
          searchPlaceholder={t`Search grants...`}
          toolbarClassName="w-full md:w-64"
          searchFn={(row, query) => {
            const q = query.toLowerCase();
            return (
              row.displayName.toLowerCase().includes(q) ||
              row.resourceType.toLowerCase().includes(q) ||
              row.grant.name.toLowerCase().includes(q)
            );
          }}
          getRowId={(row) => `${row.grant.namespace}/${row.grant.name}/${row.resourceType}`}
          rowActions={rowActions}
          empty={t`No grants found.`}
        />
      </TableCard>
    </>
  );
}
