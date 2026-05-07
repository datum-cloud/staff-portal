import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateTime } from '@/components/date';
import { DialogConfirm } from '@/components/dialog';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { Switch } from '@datum-cloud/datum-ui/switch';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useLingui } from '@lingui/react/macro';
import {
  ComMiloapisQuotaV1Alpha1AllowanceBucketList,
  ComMiloapisQuotaV1Alpha1ResourceGrant,
  ComMiloapisQuotaV1Alpha1ResourceGrantList,
  ComMiloapisQuotaV1Alpha1ResourceRegistration,
  ComMiloapisQuotaV1Alpha1ResourceRegistrationList,
} from '@openapi/quota.miloapis.com/v1alpha1';
import { useQuery } from '@tanstack/react-query';
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

const ENABLED_BY_ANNOTATION = 'staff-portal.miloapis.com/enabled-by';

interface FeatureFlagListProps {
  orgName: string;
  orgNamespace: string;
  currentUserEmail: string;
  queryKeyPrefix: string[];
  fetchRegistrationsFn: () => Promise<ComMiloapisQuotaV1Alpha1ResourceRegistrationList>;
  fetchBucketsFn: () => Promise<ComMiloapisQuotaV1Alpha1AllowanceBucketList>;
  fetchGrantsFn: () => Promise<ComMiloapisQuotaV1Alpha1ResourceGrantList>;
  createGrantFn: (
    namespace: string,
    payload: ComMiloapisQuotaV1Alpha1ResourceGrant['spec'],
    annotations?: Record<string, string>
  ) => Promise<ComMiloapisQuotaV1Alpha1ResourceGrant>;
  deleteGrantFn: (name: string, namespace: string) => Promise<unknown>;
}

const columnHelper = createColumnHelper<ComMiloapisQuotaV1Alpha1ResourceRegistration>();

type PendingToggle = {
  registration: ComMiloapisQuotaV1Alpha1ResourceRegistration;
  enable: boolean;
};

export function FeatureFlagList({
  orgName,
  orgNamespace,
  currentUserEmail,
  queryKeyPrefix,
  fetchRegistrationsFn,
  fetchBucketsFn,
  fetchGrantsFn,
  createGrantFn,
  deleteGrantFn,
}: FeatureFlagListProps) {
  const { t } = useLingui();
  const [pending, setPending] = useState<PendingToggle | null>(null);

  const registrationsQuery = useQuery({
    queryKey: [...queryKeyPrefix, 'registrations'],
    queryFn: fetchRegistrationsFn,
    staleTime: 60 * 1000,
  });

  const bucketsQuery = useQuery({
    queryKey: [...queryKeyPrefix, 'buckets'],
    queryFn: fetchBucketsFn,
    enabled: !!orgName,
    staleTime: 60 * 1000,
  });

  const grantsQuery = useQuery({
    queryKey: [...queryKeyPrefix, 'grants'],
    queryFn: fetchGrantsFn,
    enabled: !!orgName,
    staleTime: 60 * 1000,
  });

  const refetchOrgData = async () => {
    await Promise.all([bucketsQuery.refetch(), grantsQuery.refetch()]);
  };

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
          const latest = grants
            .slice()
            .sort((a, b) =>
              (b.metadata?.creationTimestamp ?? '').localeCompare(
                a.metadata?.creationTimestamp ?? ''
              )
            )[0];
          const enabledBy = latest.metadata?.annotations?.[ENABLED_BY_ANNOTATION];
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
    const resourceType = pending.registration.spec?.resourceType ?? '';
    const consumerType = pending.registration.spec?.consumerType;
    if (pending.enable) {
      const annotations = currentUserEmail
        ? { [ENABLED_BY_ANNOTATION]: currentUserEmail }
        : undefined;
      await createGrantFn(
        orgNamespace,
        {
          consumerRef: {
            apiGroup: consumerType?.apiGroup ?? 'resourcemanager.miloapis.com',
            kind: (consumerType?.kind as 'Organization' | 'Project') ?? 'Organization',
            name: orgName,
          },
          allowances: [{ resourceType, buckets: [{ amount: 1 }] }],
        },
        annotations
      );
      toast.success(t`Feature flag enabled`);
    } else {
      if (pendingGrants.length === 0) {
        toast.error(t`No grants found to remove for this flag`);
        throw new Error('No grants to remove');
      }
      await Promise.all(
        pendingGrants.map((g) =>
          deleteGrantFn(g.metadata?.name ?? '', g.metadata?.namespace ?? orgNamespace)
        )
      );
      toast.success(t`Feature flag disabled`);
    }
    await new Promise((r) => setTimeout(r, 1000));
    await refetchOrgData();
  };

  return (
    <>
      <DialogConfirm
        open={!!pending}
        onOpenChange={(open) => {
          if (!open) setPending(null);
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
