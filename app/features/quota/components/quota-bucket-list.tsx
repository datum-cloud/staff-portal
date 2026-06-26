import { groupQuotas, type QuotaRow } from '../lib/quotas-grouping';
import { DialogForm } from '@/components/dialog';
import { type GqlQuotaBucket, type GqlQuotaBucketList } from '@/modules/graphql/quota';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { ActionItem } from '@datum-cloud/datum-ui/data-table';
import { Form } from '@datum-cloud/datum-ui/form';
import { GroupedTable, type GroupedTableGroup } from '@datum-cloud/datum-ui/grouped-table';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { useLingui } from '@lingui/react/macro';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { ComMiloapisQuotaV1Alpha1ResourceGrant } from '@openapi/quota.miloapis.com/v1alpha1';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { InfoIcon, PencilIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import z from 'zod';

interface QuotaBucketListProps {
  queryKeyPrefix: string[];
  fetchFn: (params?: Record<string, unknown>) => Promise<GqlQuotaBucketList>;
  createGrantFn: (
    namespace: string,
    payload: ComMiloapisQuotaV1Alpha1ResourceGrant['spec']
  ) => Promise<ComMiloapisQuotaV1Alpha1ResourceGrant>;
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
  if (total === 0) return 'bg-gray-400';
  if (percentage <= 70) return 'bg-green-500';
  if (percentage <= 90) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function QuotaBucketList({ queryKeyPrefix, fetchFn, createGrantFn }: QuotaBucketListProps) {
  const { t } = useLingui();
  const [selected, setSelected] = useState<GqlQuotaBucket | null>(null);

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
                  <InfoIcon className="size-3 shrink-0 text-muted-foreground opacity-60" />
                </Tooltip>
              )}
            </div>
            {row.original.description && (
              <Text size="xs" textColor="muted" className="mt-0.5 block line-clamp-2">
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
      icon: <PencilIcon className="size-4" />,
      onClick: (row) => setSelected(row.bucket),
    },
  ];

  const currentLimit = selected?.limit ?? 0;
  const increaseSchema = z.object({
    newLimit: z.coerce
      .number()
      .int()
      .min(currentLimit + 1, `New limit must be > ${currentLimit}`),
  });

  return (
    <>
      <DialogForm
        open={!!selected}
        onOpenChange={() => setSelected(null)}
        title={t`Edit Quota`}
        submitText={t`Update`}
        cancelText={t`Cancel`}
        onSubmit={async (formData) => {
          const amount = Math.max(0, formData.newLimit - currentLimit);
          await createGrantFn(selected?.namespace ?? '', {
            consumerRef: {
              apiGroup: selected?.consumerApiGroup ?? '',
              kind: selected?.consumerKind as 'Organization' | 'Project',
              name: selected?.consumerName ?? '',
            },
            allowances: [
              { resourceType: selected?.resourceType ?? '', buckets: [{ amount }] },
            ],
          });
          await new Promise((r) => setTimeout(() => r(tableQuery.refetch()), 1000));
          toast.success(t`Quota updated successfully`);
        }}
        schema={increaseSchema}
        defaultValues={{ newLimit: 0 }}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Text className="text-muted-foreground">{t`Resource Type:`}</Text>
            <Text>{selected?.resourceType}</Text>
          </div>
          <div className="flex items-center gap-2">
            <Text className="text-muted-foreground">{t`Limit:`}</Text>
            <Text>{currentLimit}</Text>
          </div>
        </div>
        <Form.Field name="newLimit" label={t`New Limit`} required>
          <Form.Input />
        </Form.Field>
      </DialogForm>

      <Card className="m-4 py-4 shadow-none">
        <CardContent className="px-4">
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
        </CardContent>
      </Card>
    </>
  );
}
