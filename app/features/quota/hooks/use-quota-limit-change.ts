import { planQuotaChange, quotaBreakdown } from '../lib/quota-grants';
import type { GqlQuotaBucket } from '@/resources/gql/quota.gql';
import {
  useOrgQuotaGrantCreateMutation,
  useOrgQuotaGrantDeleteMutation,
  useOrgQuotaGrantListQuery,
  useProjectQuotaGrantCreateMutation,
  useProjectQuotaGrantDeleteMutation,
  useProjectQuotaGrantListQuery,
} from '@/resources/request/client';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useLingui } from '@lingui/react/macro';
import type { ComMiloapisQuotaV1Alpha1ResourceGrant } from '@openapi/quota.miloapis.com/v1alpha1';

type GrantSpec = ComMiloapisQuotaV1Alpha1ResourceGrant['spec'];

export interface QuotaLimitChange {
  /** The consumer's grants from the API; their managedFields tell who owns each. */
  resourceGrants?: ComMiloapisQuotaV1Alpha1ResourceGrant[];
  isError: boolean;
  /** Sets a quota's limit by adding or removing staff-added grants. */
  changeLimit: (bucket: GqlQuotaBucket, target: number) => Promise<void>;
}

/**
 * Lowers or raises a limit through grants only staff added (#343). Platform and
 * GitOps grants are never touched: their controllers would put them back.
 */
function useQuotaLimitChange(
  grantsQuery: ReturnType<typeof useProjectQuotaGrantListQuery>,
  createGrant: (namespace: string, payload: GrantSpec) => Promise<unknown>,
  deleteGrant: (name: string, namespace: string) => Promise<unknown>
): QuotaLimitChange {
  const { t } = useLingui();

  const changeLimit = async (bucket: GqlQuotaBucket, target: number): Promise<void> => {
    // Plan from the grants as they are now, not as they were when the page loaded.
    const fresh = await grantsQuery.refetch();
    const breakdown =
      fresh.isError || !fresh.data
        ? undefined
        : quotaBreakdown(fresh.data.items ?? [], bucket.resourceType);
    // Without the grants, only a raise is safe, from the bucket's limit.
    const current = breakdown?.total ?? bucket.limit;
    const plan = planQuotaChange(
      current,
      target,
      breakdown ?? { shares: [], total: current, locked: current, staffAdded: 0 }
    );
    if (plan.kind === 'below-floor') {
      const message = breakdown
        ? t`This quota's grants changed. It can't go below ${plan.floor} now.`
        : t`Couldn't load this quota's grants, so it can only be raised.`;
      toast.error(message);
      throw new Error(message);
    }
    if (plan.kind === 'none') return;

    const consumerRef = {
      apiGroup: bucket.consumerApiGroup ?? '',
      kind: bucket.consumerKind as 'Organization' | 'Project',
      name: bucket.consumerName ?? '',
    };
    // One at a time, creates first, so the limit never dips below the target.
    for (const amount of plan.create) {
      await createGrant(bucket.namespace ?? '', {
        consumerRef,
        allowances: [{ resourceType: bucket.resourceType, buckets: [{ amount }] }],
      });
    }
    for (const name of plan.remove) {
      const share = breakdown?.shares.find((item) => item.name === name);
      await deleteGrant(name, share?.namespace ?? bucket.namespace ?? '');
    }
  };

  return {
    resourceGrants: grantsQuery.data?.items,
    isError: grantsQuery.isError,
    changeLimit,
  };
}

export function useProjectQuotaLimitChange(projectName: string): QuotaLimitChange {
  const grantsQuery = useProjectQuotaGrantListQuery(projectName);
  const createMutation = useProjectQuotaGrantCreateMutation();
  const deleteMutation = useProjectQuotaGrantDeleteMutation();
  return useQuotaLimitChange(
    grantsQuery,
    (namespace, payload) => createMutation.mutateAsync({ projectName, namespace, payload }),
    (name, namespace) => deleteMutation.mutateAsync({ projectName, name, namespace })
  );
}

export function useOrgQuotaLimitChange(orgName: string): QuotaLimitChange {
  const grantsQuery = useOrgQuotaGrantListQuery(orgName);
  const createMutation = useOrgQuotaGrantCreateMutation();
  const deleteMutation = useOrgQuotaGrantDeleteMutation();
  return useQuotaLimitChange(
    grantsQuery,
    (namespace, payload) => createMutation.mutateAsync({ orgName, namespace, payload }),
    (name, namespace) => deleteMutation.mutateAsync({ orgName, name, namespace })
  );
}
