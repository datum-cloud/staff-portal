import {
  QuotaChangeError,
  useQuotaLimitChange,
  type QuotaConsumer,
} from '../hooks/use-quota-grants';
import { type GrantOwner, type QuotaBreakdown } from '../lib/quota-grants';
import { groupQuotas, type QuotaRow } from '../lib/quotas-grouping';
import { GrantOwnerLabel } from './grant-owner-label';
import { DialogForm } from '@/components/dialog';
import { TableCard } from '@/features/milo';
import { type GqlQuotaBucket, type GqlQuotaBucketList } from '@/resources/gql/quota.gql';
import { ACTION_ICONS, STATUS_ICONS } from '@/utils/config/icons.config';
import { type ColumnDef } from '@/utils/table';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { ActionItem } from '@datum-cloud/datum-ui/data-table';
import { Form } from '@datum-cloud/datum-ui/form';
import { GroupedTable, type GroupedTableGroup } from '@datum-cloud/datum-ui/grouped-table';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { useLingui } from '@lingui/react/macro';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import z from 'zod';

interface QuotaBucketListProps {
  /** Start it with the consumer's `quotaQueryKeys…buckets.all` so grant changes refresh the table. */
  queryKeyPrefix: readonly string[];
  fetchFn: (params?: Record<string, unknown>) => Promise<GqlQuotaBucketList>;
  consumer: QuotaConsumer;
}

/** Each owner's share of the limit, in the order it was added. */
function BreakdownLines({ breakdown }: { breakdown: QuotaBreakdown }) {
  const byOwner = breakdown.shares.reduce(
    (acc, share) => acc.set(share.owner, (acc.get(share.owner) ?? 0) + share.amount),
    new Map<GrantOwner, number>()
  );
  return (
    <div className="flex flex-col gap-0.5">
      {[...byOwner].map(([owner, amount]) => (
        <div key={owner} className="flex items-center justify-between gap-3">
          <Text size="sm" textColor="muted">
            <GrantOwnerLabel owner={owner} />
          </Text>
          <Text size="sm" className="tabular-nums">
            {amount}
          </Text>
        </div>
      ))}
    </div>
  );
}

interface QuotaTableRow extends QuotaRow {
  bucket: GqlQuotaBucket;
  description?: string;
}

function usage(bucket: GqlQuotaBucket) {
  const used = bucket.allocated;
  const total = bucket.limit;
  const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
  return { used, total, percentage };
}

function barColor(percentage: number, total: number) {
  if (total === 0) return 'bg-muted-foreground/40';
  if (percentage <= 70) return 'bg-success';
  if (percentage <= 90) return 'bg-warning';
  return 'bg-destructive';
}

export function QuotaBucketList({ queryKeyPrefix, fetchFn, consumer }: QuotaBucketListProps) {
  const { t } = useLingui();
  // Kept after closing so the dialog doesn't re-render empty while it fades out.
  const [selected, setSelected] = useState<GqlQuotaBucket | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  // Grants load with the page, so the breakdown is ready when Edit opens.
  const { grantsQuery, breakdownFor, changeLimit } = useQuotaLimitChange(consumer);

  const tableQuery = useQuery({
    queryKey: [...queryKeyPrefix, 'list'],
    queryFn: () => fetchFn({}),
    enabled: queryKeyPrefix.length > 0 && queryKeyPrefix.some(Boolean),
    staleTime: 60 * 1000,
  });

  const rows = useMemo<QuotaTableRow[]>(() => {
    return (tableQuery.data?.items ?? []).map((bucket) => ({
      resourceType: bucket.resourceType,
      displayName: bucket.displayName,
      description: bucket.description ?? undefined,
      group: bucket.serviceDisplayName,
      percentage: usage(bucket).percentage,
      bucket,
    }));
  }, [tableQuery.data]);

  const groups = useMemo<GroupedTableGroup<QuotaTableRow>[]>(
    () =>
      groupQuotas(rows).map((g) => ({
        id: g.group,
        title: g.group,
        meta: <Badge type="secondary">{g.items.length}</Badge>,
        rows: g.items,
      })),
    [rows]
  );

  const columns = useMemo<ColumnDef<QuotaTableRow, unknown>[]>(
    () => [
      {
        id: 'resource',
        header: t`Resource`,
        accessorFn: (row) => row.displayName,
        size: 320,
        cell: ({ row }) => (
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <Text size="sm" className="font-medium">
                {row.original.displayName}
              </Text>
              {row.original.resourceType !== row.original.displayName && (
                <Tooltip message={row.original.resourceType}>
                  <STATUS_ICONS.info className="text-muted-foreground size-3 shrink-0 opacity-60" />
                </Tooltip>
              )}
            </div>
            {row.original.description && (
              <Text size="xs" textColor="muted" className="mt-0.5 line-clamp-2 block">
                {row.original.description}
              </Text>
            )}
          </div>
        ),
      },
      {
        id: 'usage',
        header: t`Usage`,
        accessorFn: (row) => usage(row.bucket).used,
        size: 120,
        cell: ({ row }) => {
          const { used, total } = usage(row.original.bucket);
          return (
            <Text size="sm" className="font-mono whitespace-nowrap">
              {used} / {total}
            </Text>
          );
        },
      },
      {
        id: 'percent',
        header: t`% Used`,
        accessorFn: (row) => row.percentage,
        size: 220,
        cell: ({ row }) => {
          const { total, percentage } = usage(row.original.bucket);
          return (
            <div className="flex items-center gap-3">
              <div className="bg-muted h-2 flex-1 rounded-full">
                <div
                  className={`${barColor(percentage, total)} h-2 rounded-full transition-all`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <Text size="xs" textColor="muted" className="font-medium whitespace-nowrap">
                {percentage}%
              </Text>
            </div>
          );
        },
      },
    ],
    [t]
  );

  const rowActions = (): ActionItem<QuotaTableRow>[] => [
    {
      label: t`Edit Quota`,
      icon: <ACTION_ICONS.edit className="size-4" />,
      onClick: (row) => {
        setSelected(row.bucket);
        setEditOpen(true);
      },
    },
  ];

  const breakdown = selected ? breakdownFor(selected.resourceType) : undefined;
  // The grants are the source of the limit, and the bucket can lag behind them
  // for a few seconds after a change.
  const currentLimit = breakdown?.total ?? selected?.limit ?? 0;
  // The lowest this dialog can set: only staff-added grants can be removed here.
  const floor = breakdown ? currentLimit - breakdown.staffAdded : currentLimit;
  const editSchema = z.object({
    newLimit: z.coerce
      .number()
      .int()
      .min(0)
      .refine((value) => value !== currentLimit, t`Enter a different limit`)
      .refine(
        (value) => value >= floor,
        floor === currentLimit
          ? t`This quota can only be raised here`
          : t`Can't go below ${floor} here`
      ),
  });

  return (
    <>
      <DialogForm
        open={editOpen}
        onOpenChange={setEditOpen}
        title={t`Edit Quota`}
        submitText={t`Update`}
        cancelText={t`Cancel`}
        onSubmit={async (formData) => {
          if (!selected) return;
          try {
            await changeLimit(selected, formData.newLimit);
          } catch (error) {
            // Failed requests already show the API client's toast.
            if (error instanceof QuotaChangeError) toast.error(error.message);
            throw error;
          }
          toast.success(t`Quota updated successfully`);
        }}
        schema={editSchema}
        defaultValues={{ newLimit: currentLimit }}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Text className="text-muted-foreground">{t`Resource Type:`}</Text>
            <Text>{selected?.resourceType}</Text>
          </div>
          <div className="flex items-center gap-2">
            <Text className="text-muted-foreground">{t`Limit:`}</Text>
            <Text>{currentLimit}</Text>
            <Text size="sm" textColor="muted">
              {t`(${selected?.allocated ?? 0} in use)`}
            </Text>
          </div>
          {breakdown ? (
            <div className="bg-muted/40 flex flex-col gap-1.5 rounded-md p-3">
              <BreakdownLines breakdown={breakdown} />
              <Text size="sm" textColor="muted">
                {breakdown.staffAdded > 0
                  ? t`You can lower this to ${floor}. The rest comes from the platform or GitOps.`
                  : t`This can only be raised. None of it was added by staff.`}
              </Text>
            </div>
          ) : (
            <Text size="sm" textColor="muted">
              {grantsQuery.isError
                ? t`Couldn't load this quota's grants, so it can only be raised.`
                : t`Checking which grants can be lowered…`}
            </Text>
          )}
        </div>
        <Form.Field name="newLimit" label={t`New Limit`} required>
          <Form.Input type="number" min={0} />
        </Form.Field>
      </DialogForm>

      <TableCard className="m-4" framed={false} contentClassName="px-0">
        <GroupedTable<QuotaTableRow>
          columns={columns}
          groups={groups}
          isLoading={tableQuery.isLoading}
          defaultExpanded="all"
          enableSorting
          enableSearch
          searchPlaceholder={t`Search quotas...`}
          toolbarClassName="w-full md:w-64"
          searchFn={(row, query) => {
            const q = query.toLowerCase();
            return (
              row.displayName.toLowerCase().includes(q) ||
              row.resourceType.toLowerCase().includes(q)
            );
          }}
          getRowId={(row) => row.resourceType}
          rowActions={rowActions}
          empty={t`No quota buckets found.`}
        />
      </TableCard>
    </>
  );
}
