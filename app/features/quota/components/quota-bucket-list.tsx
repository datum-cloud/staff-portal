import { groupQuotas, type QuotaRow } from '../lib/quotas-grouping';
import { resolveResourceDisplayName, resolveServiceDisplayName } from '../lib/service-catalog';
import { DialogForm } from '@/components/dialog';
import { useResourceRegistrationListQuery } from '@/resources/request/client';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { ActionItem } from '@datum-cloud/datum-ui/data-table';
import { Form } from '@datum-cloud/datum-ui/form';
import { GroupedTable, type GroupedTableGroup } from '@datum-cloud/datum-ui/grouped-table';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { useLingui } from '@lingui/react/macro';
import {
  ComMiloapisQuotaV1Alpha1AllowanceBucket,
  ComMiloapisQuotaV1Alpha1AllowanceBucketList,
  ComMiloapisQuotaV1Alpha1ResourceGrant,
  ComMiloapisQuotaV1Alpha1ResourceRegistration,
} from '@openapi/quota.miloapis.com/v1alpha1';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
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

/** Internal row: the grouping fields joined to the underlying bucket. */
interface QuotaTableRow extends QuotaRow {
  bucket: ComMiloapisQuotaV1Alpha1AllowanceBucket;
  description?: string;
}

function usage(bucket: ComMiloapisQuotaV1Alpha1AllowanceBucket) {
  const used = bucket.status?.allocated ?? 0;
  const total = bucket.status?.limit ?? 0;
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
  const [selected, setSelected] = useState<ComMiloapisQuotaV1Alpha1AllowanceBucket | null>(null);

  const tableQuery = useQuery({
    queryKey: [...queryKeyPrefix, 'list'],
    queryFn: () => fetchFn({}),
    enabled: queryKeyPrefix.length > 0 && queryKeyPrefix.some(Boolean),
    staleTime: 60 * 1000,
  });

  const registrationsQuery = useResourceRegistrationListQuery();

  // resourceType -> registration, for display name / description / owner lookup.
  const registrations = useMemo(() => {
    const map = new Map<string, ComMiloapisQuotaV1Alpha1ResourceRegistration>();
    for (const reg of registrationsQuery.data?.items ?? []) {
      if (reg.spec?.resourceType) map.set(reg.spec.resourceType, reg);
    }
    return map;
  }, [registrationsQuery.data]);

  const rows = useMemo<QuotaTableRow[]>(() => {
    return (tableQuery.data?.items ?? [])
      .filter((bucket) => {
        const reg = registrations.get(bucket.spec?.resourceType ?? '');
        // Feature-type registrations are visibility flags with no countable
        // usage — they belong on the Feature Flags page, not here. (Codegen
        // narrows spec.type to Entity|Allocation, so compare as a string.)
        return String(reg?.spec?.type ?? '') !== 'Feature';
      })
      .map((bucket) => {
        const resourceType = bucket.spec?.resourceType ?? '';
        const reg = registrations.get(resourceType);
        const annotations = reg?.metadata?.annotations ?? {};
        const labels = reg?.metadata?.labels ?? {};
        // Two ownership labels exist in the wild: `services.miloapis.com/owner`
        // (hand-authored on network/dns/core/notes/resourcemanager registrations)
        // and `services.miloapis.com/service` (set by the service-catalog
        // ServiceConfiguration controller on compute/billing). Prefer owner,
        // fall back to service.
        const owner =
          labels['services.miloapis.com/owner'] ?? labels['services.miloapis.com/service'];
        return {
          resourceType,
          displayName: resolveResourceDisplayName(
            annotations['kubernetes.io/display-name'],
            resourceType
          ),
          description: annotations['kubernetes.io/description'] ?? reg?.spec?.description,
          group: resolveServiceDisplayName(owner, resourceType),
          percentage: usage(bucket).percentage,
          bucket,
        };
      });
  }, [tableQuery.data, registrations]);

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
          <div>
            <Text size="sm" className="block font-medium">
              {row.original.displayName}
            </Text>
            {row.original.description && (
              <Text size="xs" textColor="muted" className="mt-0.5 block">
                {row.original.description}
              </Text>
            )}
            {row.original.resourceType !== row.original.displayName && (
              <Text size="xs" textColor="muted" className="mt-0.5 block font-mono">
                {row.original.resourceType}
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
