import {
  useFeatureFlagToggle,
  FEATURE_FLAG_ENABLED_BY_ANNOTATION,
  isPlatformManagedGrant,
} from '../hooks/useFeatureFlagToggle';
import { DateTime } from '@/components/date';
import { DialogConfirm } from '@/components/dialog';
import { ListTable, ListColumnHeader } from '@/features/milo';
import {
  useFeatureFlagRegistrationListQuery,
  useOrgQuotaBucketListQuery,
  useOrgQuotaGrantListQuery,
} from '@/resources/request/client';
import { createColumnHelper } from '@/utils/table';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { Switch } from '@datum-cloud/datum-ui/switch';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { useLingui } from '@lingui/react/macro';
import type {
  ComMiloapisQuotaV1Alpha1ResourceGrant,
  ComMiloapisQuotaV1Alpha1ResourceRegistration,
} from '@openapi/quota.miloapis.com/v1alpha1';
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

  // A flag is platform-managed when at least one platform-issued grant is
  // enabling it — an operator removing their own grant wouldn't actually turn
  // the flag off in that case, so the toggle becomes read-only.
  const platformManagedByResourceType = useMemo(() => {
    const set = new Set<string>();
    for (const [resourceType, grants] of grantsByResourceType.entries()) {
      if (grants.some(isPlatformManagedGrant)) set.add(resourceType);
    }
    return set;
  }, [grantsByResourceType]);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'name',
        header: ({ column }) => <ListColumnHeader column={column} title={t`Flag`} />,
        cell: ({ row }) => (
          <div className="flex max-w-5xl flex-col">
            <span className="text-sm font-medium">{displayName(row.original)}</span>
            {row.original.spec?.description && (
              <span className="text-muted-foreground text-xs break-words whitespace-normal">
                {row.original.spec.description}
              </span>
            )}
          </div>
        ),
      }),
      columnHelper.display({
        id: 'enabledBy',
        header: () => t`Enabled by`,
        cell: ({ row }) => {
          const resourceType = row.original.spec?.resourceType ?? '';
          const grants = grantsByResourceType.get(resourceType) ?? [];
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
            // A platform-managed grant won't carry the operator annotation —
            // surface that explicitly instead of an em-dash.
            if (platformManagedByResourceType.has(resourceType)) {
              return <span className="text-muted-foreground text-sm italic">{t`Platform`}</span>;
            }
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
          const resourceType = row.original.spec?.resourceType ?? '';
          const available = bucketByResourceType.get(resourceType) ?? 0;
          const enabled = available > 0;
          const orgDataLoading = bucketsQuery.isLoading || grantsQuery.isLoading;
          const platformManaged = platformManagedByResourceType.has(resourceType);

          const switchEl = (
            <Switch
              checked={enabled}
              disabled={orgDataLoading || platformManaged}
              onCheckedChange={() => setPending({ registration: row.original, enable: !enabled })}
              aria-label={enabled ? t`Disable flag` : t`Enable flag`}
            />
          );

          return (
            <div className="flex w-full justify-end">
              {platformManaged ? (
                <Tooltip
                  side="left"
                  message={t`This flag is managed by the platform and can't be changed from here.`}>
                  {/* Wrap so the tooltip still fires hover events on the disabled switch. */}
                  <span tabIndex={0}>{switchEl}</span>
                </Tooltip>
              ) : (
                switchEl
              )}
            </div>
          );
        },
      }),
    ],
    [
      t,
      bucketByResourceType,
      grantsByResourceType,
      platformManagedByResourceType,
      bucketsQuery.isLoading,
      grantsQuery.isLoading,
    ]
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

      <ListTable
        loading={registrationsQuery.isLoading}
        data={registrationsQuery.data?.items ?? []}
        columns={columns}
        pageSize={20}
        getRowId={(row) => row.metadata?.name ?? ''}
        defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
        searchPlaceholder={t`Search by flag key or description...`}
        emptyMessage={t`No feature flags registered.`}
        inset="tab"
        searchFn={(row, search) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return (
            displayName(row).toLowerCase().includes(q) ||
            (row.spec?.resourceType ?? '').toLowerCase().includes(q) ||
            (row.spec?.description ?? '').toLowerCase().includes(q)
          );
        }}
      />
    </>
  );
}
