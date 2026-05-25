import {
  useFeatureFlagToggle,
  FEATURE_FLAG_ENABLED_BY_ANNOTATION,
} from '../hooks/useFeatureFlagToggle';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateTime } from '@/components/date';
import { DialogConfirm } from '@/components/dialog';
import {
  useFeatureFlagRegistrationListQuery,
  useOrgQuotaBucketListQuery,
  useOrgQuotaGrantListQuery,
} from '@/resources/request/client';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { Switch } from '@datum-cloud/datum-ui/switch';
import { useLingui } from '@lingui/react/macro';
import type {
  ComMiloapisQuotaV1Alpha1ResourceGrant,
  ComMiloapisQuotaV1Alpha1ResourceRegistration,
} from '@openapi/quota.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

function flagKey(resourceType: string | undefined) {
  if (!resourceType) return '';
  const slash = resourceType.indexOf('/');
  return slash >= 0 ? resourceType.slice(slash + 1) : resourceType;
}

function displayName(reg: ComMiloapisQuotaV1Alpha1ResourceRegistration) {
  return (
    reg.metadata?.annotations?.['kubernetes.io/display-name'] ?? flagKey(reg.spec?.resourceType)
  );
}

const columnHelper = createColumnHelper<ComMiloapisQuotaV1Alpha1ResourceRegistration>();

type PendingToggle = {
  registration: ComMiloapisQuotaV1Alpha1ResourceRegistration;
  enable: boolean;
};

export interface FeatureFlagListProps {
  orgName: string;
}

export function FeatureFlagList({ orgName }: FeatureFlagListProps) {
  const { t } = useLingui();
  const [pending, setPending] = useState<PendingToggle | null>(null);

  const registrationsQuery = useFeatureFlagRegistrationListQuery();
  const bucketsQuery = useOrgQuotaBucketListQuery(orgName);
  const grantsQuery = useOrgQuotaGrantListQuery(orgName);
  const { toggle, isPending: toggleIsPending } = useFeatureFlagToggle(orgName);

  // Aggregate available counts per resource type. A flag is "enabled" when
  // any bucket for that type reports `status.available > 0`.
  const bucketByResourceType = useMemo(() => {
    const map = new Map<string, number>();
    for (const bucket of bucketsQuery.data?.items ?? []) {
      const rt = bucket.spec?.resourceType ?? '';
      if (!rt) continue;
      map.set(rt, (map.get(rt) ?? 0) + (bucket.status?.available ?? 0));
    }
    return map;
  }, [bucketsQuery.data]);

  const featureResourceTypes = useMemo(
    () =>
      new Set(
        (registrationsQuery.data?.items ?? [])
          .map((r) => r.spec?.resourceType)
          .filter((rt): rt is string => !!rt)
      ),
    [registrationsQuery.data]
  );

  // Group grants by the resource type they enable, scoped to feature-flag
  // registrations only — the same org may hold unrelated quota grants.
  const grantsByResourceType = useMemo(() => {
    const map = new Map<string, ComMiloapisQuotaV1Alpha1ResourceGrant[]>();
    for (const grant of grantsQuery.data?.items ?? []) {
      for (const allowance of grant.spec?.allowances ?? []) {
        if (!allowance.resourceType || !featureResourceTypes.has(allowance.resourceType)) continue;
        const list = map.get(allowance.resourceType) ?? [];
        list.push(grant);
        map.set(allowance.resourceType, list);
      }
    }
    return map;
  }, [grantsQuery.data, featureResourceTypes]);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'name',
        header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Flag`} />,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{displayName(row.original)}</span>
            {row.original.spec?.description && (
              <span className="text-muted-foreground text-xs">{row.original.spec.description}</span>
            )}
          </div>
        ),
      }),
      columnHelper.display({
        id: 'enabledBy',
        header: () => t`Enabled by`,
        cell: ({ row }) => {
          const grants = grantsByResourceType.get(row.original.spec?.resourceType ?? '') ?? [];
          if (grants.length === 0) {
            return <span className="text-muted-foreground">—</span>;
          }
          // Multiple grants can enable the same flag; show the most recent.
          const latest = grants
            .slice()
            .sort((a, b) =>
              (b.metadata?.creationTimestamp ?? '').localeCompare(
                a.metadata?.creationTimestamp ?? ''
              )
            )[0];
          const enabledBy = latest.metadata?.annotations?.[FEATURE_FLAG_ENABLED_BY_ANNOTATION];
          if (!enabledBy) {
            return <span className="text-muted-foreground text-sm">—</span>;
          }
          return (
            <div className="flex flex-col">
              <span className="text-sm">{enabledBy}</span>
              <DateTime
                date={latest.metadata?.creationTimestamp}
                className="text-muted-foreground text-xs"
              />
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'toggle',
        header: () => <div className="text-right">{t`Toggle`}</div>,
        cell: ({ row }) => {
          const available = bucketByResourceType.get(row.original.spec?.resourceType ?? '') ?? 0;
          const enabled = available > 0;
          const orgDataLoading = bucketsQuery.isLoading || grantsQuery.isLoading;
          return (
            <div className="flex w-full justify-end">
              <Switch
                checked={enabled}
                disabled={orgDataLoading}
                onCheckedChange={() => setPending({ registration: row.original, enable: !enabled })}
                aria-label={enabled ? t`Disable flag` : t`Enable flag`}
              />
            </div>
          );
        },
      }),
    ],
    [t, bucketByResourceType, grantsByResourceType, bucketsQuery.isLoading, grantsQuery.isLoading]
  );

  const pendingResourceType = pending?.registration.spec?.resourceType ?? '';
  const pendingFlag = pending ? displayName(pending.registration) : '';
  const pendingGrants = pending ? (grantsByResourceType.get(pendingResourceType) ?? []) : [];

  const handleConfirm = async () => {
    if (!pending) return;
    await toggle(pending.registration, pending.enable, pendingGrants);
  };

  return (
    <>
      <DialogConfirm
        open={!!pending}
        onOpenChange={(open) => {
          if (!open && !toggleIsPending) setPending(null);
        }}
        title={pending?.enable ? t`Enable feature flag` : t`Disable feature flag`}
        description={
          pending?.enable
            ? t`Enable "${pendingFlag}" for this organization? A new resource grant will be created.`
            : pendingGrants.length > 1
              ? t`Disable "${pendingFlag}" for this organization? ${pendingGrants.length} resource grants will be deleted.`
              : t`Disable "${pendingFlag}" for this organization? The associated resource grant will be deleted.`
        }
        confirmText={pending?.enable ? t`Enable` : t`Disable`}
        cancelText={t`Cancel`}
        variant={pending?.enable ? 'default' : 'destructive'}
        onConfirm={handleConfirm}
      />

      <DataTable.Client
        loading={registrationsQuery.isLoading}
        data={registrationsQuery.data?.items ?? []}
        columns={columns}
        pageSize={20}
        getRowId={(row) => row.metadata?.name ?? ''}
        defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
        searchFn={(row, search) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return (
            displayName(row).toLowerCase().includes(q) ||
            (row.spec?.resourceType ?? '').toLowerCase().includes(q) ||
            (row.spec?.description ?? '').toLowerCase().includes(q)
          );
        }}>
        <Card className="m-4 py-4 shadow-none">
          <CardContent className="flex flex-col gap-2 px-4">
            <DataTableToolbar
              search={
                <DataTable.Search
                  placeholder={t`Search by flag key or description...`}
                  className="w-full md:w-64"
                />
              }
            />
            <DataTable.Content
              headerClassName="bg-muted/50"
              className="border-t border-b border-solid"
              emptyMessage={t`No feature flags registered.`}
            />
            <DataTable.Pagination className="pb-0" />
          </CardContent>
        </Card>
      </DataTable.Client>
    </>
  );
}
