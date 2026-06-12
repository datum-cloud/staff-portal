import { groupQuotas, type QuotaRow } from '../lib/quotas-grouping';
import { resolveResourceDisplayName, resolveServiceDisplayName } from '../lib/service-catalog';
import { BadgeCondition } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DialogConfirm } from '@/components/dialog';
import { useResourceRegistrationListQuery } from '@/resources/request/client';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { ActionItem } from '@datum-cloud/datum-ui/data-table';
import { GroupedTable, type GroupedTableGroup } from '@datum-cloud/datum-ui/grouped-table';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { useLingui } from '@lingui/react/macro';
import {
  ComMiloapisQuotaV1Alpha1ResourceGrant,
  ComMiloapisQuotaV1Alpha1ResourceGrantList,
  ComMiloapisQuotaV1Alpha1ResourceRegistration,
} from '@openapi/quota.miloapis.com/v1alpha1';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Trash2Icon } from 'lucide-react';
import { useMemo, useState } from 'react';

interface QuotaGrantListProps {
  queryKeyPrefix: string[];
  fetchFn: (params?: Record<string, unknown>) => Promise<ComMiloapisQuotaV1Alpha1ResourceGrantList>;
  deleteGrantFn: (name: string, namespace: string) => Promise<unknown>;
}

/**
 * Internal row: a single (grant × resourceType) pair. A grant that allows
 * multiple resourceTypes is flattened into one row per type so the table can
 * group by owning service and show friendly names, the same as the Usage tab.
 * Deletes still operate on the parent grant.
 */
interface QuotaGrantRow extends QuotaRow {
  grant: ComMiloapisQuotaV1Alpha1ResourceGrant;
  allocation: number;
}

/** Sum every bucket amount per resourceType within a single grant. */
function allocationByResourceType(
  allowances: ComMiloapisQuotaV1Alpha1ResourceGrant['spec']['allowances'] | undefined
): Array<[string, number]> {
  const totals = new Map<string, number>();
  for (const allowance of allowances ?? []) {
    const sum = (allowance.buckets ?? []).reduce((acc, b) => acc + (b?.amount ?? 0), 0);
    totals.set(allowance.resourceType, (totals.get(allowance.resourceType) ?? 0) + sum);
  }
  return Array.from(totals.entries());
}

export function QuotaGrantList({ queryKeyPrefix, fetchFn, deleteGrantFn }: QuotaGrantListProps) {
  const { t } = useLingui();
  const [selectedGrant, setSelectedGrant] = useState<ComMiloapisQuotaV1Alpha1ResourceGrant | null>(
    null
  );

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

  const rows = useMemo<QuotaGrantRow[]>(() => {
    return (tableQuery.data?.items ?? []).flatMap((grant) =>
      allocationByResourceType(grant.spec?.allowances).map(([resourceType, allocation]) => {
        const reg = registrations.get(resourceType);
        const annotations = reg?.metadata?.annotations ?? {};
        const labels = reg?.metadata?.labels ?? {};
        // Prefer the hand-authored owner label, fall back to the catalog-managed
        // service label (compute/billing). Mirrors the Usage tab resolution.
        const owner =
          labels['services.miloapis.com/owner'] ?? labels['services.miloapis.com/service'];
        return {
          resourceType,
          displayName: resolveResourceDisplayName(
            annotations['kubernetes.io/display-name'],
            resourceType
          ),
          group: resolveServiceDisplayName(owner, resourceType),
          percentage: 0,
          allocation,
          grant,
        };
      })
    );
  }, [tableQuery.data, registrations]);

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
          <div>
            <Text size="sm" className="block font-medium">
              {row.original.displayName}
            </Text>
            {row.original.resourceType !== row.original.displayName && (
              <Text size="xs" textColor="muted" className="mt-0.5 block font-mono">
                {row.original.resourceType}
              </Text>
            )}
          </div>
        ),
      },
      {
        id: 'grant',
        header: t`Grant`,
        accessorFn: (row) => row.grant.metadata?.name,
        size: 220,
        cell: ({ row }) => (
          <Text
            size="sm"
            textColor="muted"
            className="truncate"
            title={row.original.grant.metadata?.name}>
            {row.original.grant.metadata?.name}
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
        accessorFn: (row) => row.grant.status,
        size: 160,
        cell: ({ row }) => (
          <BadgeCondition
            status={row.original.grant.status}
            multiple={false}
            showMessage
            className="text-xs"
          />
        ),
      },
      {
        id: 'created',
        header: t`Created`,
        accessorFn: (row) => row.grant.metadata?.creationTimestamp,
        size: 160,
        cell: ({ row }) => <DateTime date={row.original.grant.metadata?.creationTimestamp} />,
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
        const isInactive = row.grant.status?.conditions?.some(
          (c) => c.type === 'Active' && c.status === 'False'
        );
        if (isInactive) return true;
        return row.grant.metadata?.labels?.['quota.miloapis.com/auto-created'] === 'true';
      },
    },
  ];

  return (
    <>
      <DialogConfirm
        open={!!selectedGrant}
        onOpenChange={() => setSelectedGrant(null)}
        title={t`Delete Grant`}
        description={t`Are you sure you want to delete grant "${selectedGrant?.metadata?.name}"? This action cannot be undone.`}
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        requireConfirmation
        onConfirm={async () => {
          await deleteGrantFn(
            selectedGrant?.metadata?.name ?? '',
            selectedGrant?.metadata?.namespace ?? ''
          );
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
                (row.grant.metadata?.name ?? '').toLowerCase().includes(q)
              );
            }}
            getRowId={(row) =>
              `${row.grant.metadata?.namespace ?? ''}/${row.grant.metadata?.name ?? ''}/${row.resourceType}`
            }
            rowActions={rowActions}
            empty={t`No grants found.`}
          />
        </CardContent>
      </Card>
    </>
  );
}
