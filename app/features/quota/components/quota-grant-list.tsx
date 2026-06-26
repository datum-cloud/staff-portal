import { groupQuotas, type QuotaRow } from '../lib/quotas-grouping';
import { BadgeCondition } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DialogConfirm } from '@/components/dialog';
import { type GqlQuotaGrant, type GqlQuotaGrantList } from '@/modules/graphql/quota';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { ActionItem } from '@datum-cloud/datum-ui/data-table';
import { GroupedTable, type GroupedTableGroup } from '@datum-cloud/datum-ui/grouped-table';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { useLingui } from '@lingui/react/macro';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { InfoIcon, Trash2Icon } from 'lucide-react';
import { useMemo, useState } from 'react';

interface QuotaGrantListProps {
  queryKeyPrefix: string[];
  fetchFn: (params?: Record<string, unknown>) => Promise<GqlQuotaGrantList>;
  deleteGrantFn: (name: string, namespace: string) => Promise<unknown>;
}

interface QuotaGrantRow extends QuotaRow {
  grant: GqlQuotaGrant;
  allocation: number;
}

export function QuotaGrantList({ queryKeyPrefix, fetchFn, deleteGrantFn }: QuotaGrantListProps) {
  const { t } = useLingui();
  const [selectedGrant, setSelectedGrant] = useState<GqlQuotaGrant | null>(null);

  const tableQuery = useQuery({
    queryKey: [...queryKeyPrefix, 'list'],
    queryFn: () => fetchFn({}),
    enabled: queryKeyPrefix.length > 0 && queryKeyPrefix.some(Boolean),
    staleTime: 60 * 1000,
  });

  const rows = useMemo<QuotaGrantRow[]>(() => {
    return (tableQuery.data?.items ?? []).flatMap((grant) =>
      grant.allowances.map((allowance) => ({
        resourceType: allowance.resourceType,
        displayName: allowance.displayName,
        group: allowance.serviceDisplayName,
        percentage: 0,
        allocation: allowance.amount,
        grant,
      }))
    );
  }, [tableQuery.data]);

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
                <InfoIcon className="size-3 shrink-0 text-muted-foreground opacity-60" />
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
          <Text
            size="sm"
            textColor="muted"
            className="truncate"
            title={row.original.grant.name}>
            {row.original.grant.name}
          </Text>
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
      icon: <Trash2Icon className="size-4" />,
      variant: 'destructive' as const,
      onClick: (row) => setSelectedGrant(row.grant),
      disabled: (row) => {
        const isInactive = row.grant.conditions.some(
          (c) => c.type === 'Active' && c.status === 'False'
        );
        if (isInactive) return true;
        return row.grant.autoCreated;
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
          await deleteGrantFn(selectedGrant?.name ?? '', selectedGrant?.namespace ?? '');
          await new Promise((resolve) => setTimeout(() => resolve(tableQuery.refetch()), 1000));
          setSelectedGrant(null);
          toast.success(t`Grant deleted successfully`);
        }}
      />

      <Card className="m-4 py-4 shadow-none">
        <CardContent className="px-4">
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
        </CardContent>
      </Card>
    </>
  );
}
