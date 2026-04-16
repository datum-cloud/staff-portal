import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateTime } from '@/components/date';
import { DialogForm } from '@/components/dialog';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { ActionItem, DataTable } from '@datum-cloud/datum-ui/data-table';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { useLingui } from '@lingui/react/macro';
import {
  ComMiloapisQuotaV1Alpha1AllowanceBucket,
  ComMiloapisQuotaV1Alpha1AllowanceBucketList,
  ComMiloapisQuotaV1Alpha1ResourceGrant,
} from '@openapi/quota.miloapis.com/v1alpha1';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { PencilIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import z from 'zod';

interface QuotaBucketListProps {
  queryKeyPrefix: string[];
  fetchFn: (
    params?: Record<string, unknown>
  ) => Promise<ComMiloapisQuotaV1Alpha1AllowanceBucketList>;
  createGrantFn: (
    namespace: string,
    payload: ComMiloapisQuotaV1Alpha1ResourceGrant['spec']
  ) => Promise<ComMiloapisQuotaV1Alpha1ResourceGrant>;
}

const columnHelper = createColumnHelper<ComMiloapisQuotaV1Alpha1AllowanceBucket>();

export function QuotaBucketList({ queryKeyPrefix, fetchFn, createGrantFn }: QuotaBucketListProps) {
  const { t } = useLingui();
  const [selected, setSelected] = useState<ComMiloapisQuotaV1Alpha1AllowanceBucket | null>(null);

  const tableQuery = useQuery({
    queryKey: [...queryKeyPrefix, 'list'],
    queryFn: () => fetchFn({}),
    enabled: queryKeyPrefix.length > 0 && queryKeyPrefix.some(Boolean),
    staleTime: 60 * 1000,
  });

  const actions: ActionItem<ComMiloapisQuotaV1Alpha1AllowanceBucket>[] = [
    {
      label: t`Edit Quota`,
      icon: PencilIcon,
      onClick: (row) => setSelected(row),
    },
  ];

  const columns = useMemo(
    () => [
      columnHelper.accessor('spec.resourceType', {
        header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Resource Type`} />,
        cell: ({ getValue }) => getValue(),
      }),
      columnHelper.accessor('status', {
        id: 'usage',
        header: () => t`Usage`,
        cell: ({ getValue }) => {
          const status = getValue();
          if (!status) return <Text className="text-muted-foreground">-</Text>;
          const { allocated = 0, limit: lim = 0 } = status;
          const used = allocated;
          const total = lim;
          const pct = total > 0 ? Math.round((used / total) * 100) : 0;
          const bar =
            total === 0
              ? 'bg-gray-400'
              : pct <= 70
                ? 'bg-green-500'
                : pct <= 90
                  ? 'bg-yellow-500'
                  : 'bg-red-500';
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Text className="text-sm font-medium">
                  {used} / {total}
                </Text>
                <Text className="text-muted-foreground text-xs">({pct}%)</Text>
              </div>
              <div className="bg-muted h-2 w-full rounded-full">
                <div
                  className={`${bar} h-2 rounded-full transition-all`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        },
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
    [actions, t]
  );

  const currentLimit = selected?.status?.limit ?? 0;
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
          try {
            const amount = Math.max(0, formData.newLimit - currentLimit);
            await createGrantFn(selected?.metadata?.namespace ?? '', {
              consumerRef: {
                apiGroup: selected?.spec.consumerRef.apiGroup ?? '',
                kind: selected?.spec.consumerRef.kind as 'Organization' | 'Project',
                name: selected?.spec.consumerRef.name ?? '',
              },
              allowances: [
                { resourceType: selected?.spec.resourceType ?? '', buckets: [{ amount }] },
              ],
            });
            await new Promise((r) => setTimeout(() => r(tableQuery.refetch()), 1000));
            toast.success(t`Quota updated successfully`);
          } catch (e) {
            throw e;
          }
        }}
        schema={increaseSchema}
        defaultValues={{ newLimit: 0 }}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Text className="text-muted-foreground">{t`Resource Type:`}</Text>
            <Text>{selected?.spec.resourceType}</Text>
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
          return (row.spec?.resourceType ?? '').toLowerCase().includes(q);
        }}>
        <Card className="m-4 py-4 shadow-none">
          <CardContent className="flex flex-col gap-2 px-4">
            <DataTableToolbar
              search={
                <DataTable.Search
                  placeholder={t`Search by resource type...`}
                  className="w-full md:w-64"
                />
              }
            />
            <DataTable.Content
              headerClassName="bg-muted/50"
              className="border-t border-b border-solid"
              emptyMessage={t`No quota buckets found.`}
            />
            <DataTable.Pagination className="pb-0" />
          </CardContent>
        </Card>
      </DataTable.Client>
    </>
  );
}
