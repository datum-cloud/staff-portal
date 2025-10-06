import { DateFormatter } from '@/components/date';
import { DialogForm } from '@/components/dialog';
import { quotaGrantCreateMutation } from '@/resources/request/client';
import { AllowanceBucket, AllowanceBucketListResponse } from '@/resources/schemas';
import {
  DataTable,
  DataTableProvider,
  useDataTableQuery,
  type ActionItem,
} from '@datum-ui/data-table';
import { Form } from '@datum-ui/form';
import { toast } from '@datum-ui/toast';
import { Text } from '@datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { getTime } from 'date-fns';
import { PencilIcon } from 'lucide-react';
import { useState } from 'react';
import z from 'zod';

interface QuotaBucketListProps {
  queryKeyPrefix: string[];
  fetchFn: (params: any) => Promise<AllowanceBucketListResponse>;
}

const columnHelper = createColumnHelper<AllowanceBucket>();

const columns = [
  columnHelper.accessor('spec.resourceType', {
    header: () => <Trans>Resource Type</Trans>,
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor('status', {
    id: 'usage',
    header: () => <Trans>Usage</Trans>,
    cell: ({ getValue }) => {
      const status = getValue();
      if (!status) {
        return <Text textColor="muted">-</Text>;
      }

      const { allocated = 0, available = 0, limit = 0 } = status;
      const used = allocated;
      const total = limit;
      const percentage = total > 0 ? Math.round((used / total) * 100) : 0;

      // Determine progress bar color based on thresholds
      const getProgressBarColor = (percentage: number, limit: number) => {
        if (limit === 0) {
          return 'bg-gray-400'; // Gray for no limit set
        }
        if (percentage <= 70) {
          return 'bg-green-500'; // Green for healthy usage (0-70%)
        }
        if (percentage <= 90) {
          return 'bg-yellow-500'; // Yellow for warning (70-90%)
        }
        return 'bg-red-500'; // Red for critical (90-100%)
      };

      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Text size="sm" weight="medium">
              {used} / {total}
            </Text>
            <Text size="xs" textColor="muted">
              ({percentage}%)
            </Text>
          </div>
          <div className="bg-muted h-2 w-full rounded-full">
            <div
              className={`${getProgressBarColor(percentage, total)} h-2 rounded-full transition-all`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>
      );
    },
  }),
  columnHelper.accessor('metadata.creationTimestamp', {
    header: () => <Trans>Created</Trans>,
    cell: ({ getValue }) => {
      return <DateFormatter date={getValue()} withTime />;
    },
  }),
];

export function QuotaBucketList({ queryKeyPrefix, fetchFn }: QuotaBucketListProps) {
  const { t } = useLingui();
  const [selected, setSelected] = useState<AllowanceBucket | null>(null);

  const tableState = useDataTableQuery<AllowanceBucketListResponse>({
    queryKeyPrefix,
    fetchFn,
    useSorting: true,
  });

  const actions: ActionItem<AllowanceBucket>[] = [
    {
      label: t`Edit Quota`,
      icon: PencilIcon,
      onClick: (row: AllowanceBucket) => {
        setSelected(row);
      },
    },
  ];

  const currentLimit = selected?.status?.limit ?? 0;

  const increaseSchema = z.object({
    newLimit: z.coerce
      .number()
      .int()
      .min(currentLimit + 1, `New limit must be > ${currentLimit}`),
  });

  const handleEditQuota = async (formData: z.infer<typeof increaseSchema>) => {
    try {
      const newLimit = formData.newLimit;
      const amount = Math.max(0, newLimit - currentLimit);

      await quotaGrantCreateMutation({
        apiVersion: 'quota.miloapis.com/v1alpha1',
        kind: 'ResourceGrant',
        metadata: {
          generateName: `${selected?.spec.consumerRef.name ?? ''}-quota-`,
          namespace: selected?.metadata.namespace ?? '',
        },
        spec: {
          consumerRef: {
            apiGroup: selected?.spec.consumerRef.apiGroup ?? '',
            kind: selected?.spec.consumerRef.kind ?? 'Organization',
            name: selected?.spec.consumerRef.name ?? '',
          },
          allowances: [
            {
              resourceType: selected?.spec.resourceType ?? '',
              buckets: [{ amount }],
            },
          ],
        },
      });

      await new Promise((resolve) => setTimeout(() => resolve(tableState.query.refetch()), 1000));
      toast.success(t`Quota updated successfully`);
    } catch (error) {
      throw error; // Re-throw to keep dialog open
    }
  };

  return (
    <>
      <DialogForm
        open={!!selected}
        onOpenChange={() => setSelected(null)}
        title={t`Edit Quota`}
        submitText={t`Update`}
        cancelText={t`Cancel`}
        onSubmit={handleEditQuota}
        schema={increaseSchema}
        defaultValues={{ newLimit: 0 }}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Text textColor="muted">{t`Resource Type:`}</Text>
            <Text>{selected?.spec.resourceType}</Text>
          </div>
          <div className="flex items-center gap-2">
            <Text textColor="muted">{t`Limit:`}</Text>
            <Text>{currentLimit}</Text>
          </div>
        </div>

        <Form.Input field="newLimit" label={t`New Limit`} required />
      </DialogForm>

      <DataTableProvider<AllowanceBucket, AllowanceBucketListResponse>
        columns={columns}
        actions={actions}
        transform={(resp) => ({
          rows: resp?.data?.items || [],
          cursor: resp?.data?.metadata?.continue,
        })}
        {...tableState}>
        <div className="m-4 flex flex-col gap-2">
          <DataTable<AllowanceBucket> />
        </div>
      </DataTableProvider>
    </>
  );
}
