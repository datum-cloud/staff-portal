import { planQuotaChange, quotaBreakdown, type QuotaBreakdown } from '../lib/quota-grants';
import type { GqlQuotaBucket } from '@/resources/gql/quota.gql';
import {
  useOrgQuotaGrantCreateMutation,
  useOrgQuotaGrantDeleteMutation,
  useOrgQuotaGrantListQuery,
  useProjectQuotaGrantCreateMutation,
  useProjectQuotaGrantDeleteMutation,
  useProjectQuotaGrantListQuery,
} from '@/resources/request/client';
import { useLingui } from '@lingui/react/macro';
import type { ComMiloapisQuotaV1Alpha1ResourceGrant } from '@openapi/quota.miloapis.com/v1alpha1';

/** The organization or project a quota belongs to. */
export interface QuotaConsumer {
  kind: 'Organization' | 'Project';
  name: string;
}

/** The change can't be made as asked. Failed requests are reported by the API client. */
export class QuotaChangeError extends Error {}

/**
 * The consumer's ResourceGrants from the API. Unlike the gateway's grant list,
 * these carry `managedFields`, which tell who owns each grant (#343).
 */
export function useConsumerQuotaGrants(consumer: QuotaConsumer) {
  const orgGrants = useOrgQuotaGrantListQuery(
    consumer.kind === 'Organization' ? consumer.name : ''
  );
  const projectGrants = useProjectQuotaGrantListQuery(
    consumer.kind === 'Project' ? consumer.name : ''
  );
  return consumer.kind === 'Organization' ? orgGrants : projectGrants;
}

/** Create and delete grants for the consumer. The mutation hooks refresh quota data. */
export function useConsumerQuotaGrantMutations(consumer: QuotaConsumer) {
  const orgCreate = useOrgQuotaGrantCreateMutation();
  const orgDelete = useOrgQuotaGrantDeleteMutation();
  const projectCreate = useProjectQuotaGrantCreateMutation();
  const projectDelete = useProjectQuotaGrantDeleteMutation();
  const isOrg = consumer.kind === 'Organization';

  const createGrant = (
    namespace: string,
    payload: ComMiloapisQuotaV1Alpha1ResourceGrant['spec']
  ): Promise<unknown> =>
    isOrg
      ? orgCreate.mutateAsync({ orgName: consumer.name, namespace, payload })
      : projectCreate.mutateAsync({ projectName: consumer.name, namespace, payload });

  const deleteGrant = (name: string, namespace: string): Promise<unknown> =>
    isOrg
      ? orgDelete.mutateAsync({ orgName: consumer.name, name, namespace })
      : projectDelete.mutateAsync({ projectName: consumer.name, name, namespace });

  return { createGrant, deleteGrant };
}

/**
 * Sets a quota's limit by adding or removing staff-added grants (#343). Platform
 * and GitOps grants are never touched: their controllers would put them back.
 */
export function useQuotaLimitChange(consumer: QuotaConsumer) {
  const { t } = useLingui();
  const grantsQuery = useConsumerQuotaGrants(consumer);
  const { createGrant, deleteGrant } = useConsumerQuotaGrantMutations(consumer);

  const breakdownFor = (resourceType: string): QuotaBreakdown | undefined =>
    grantsQuery.data ? quotaBreakdown(grantsQuery.data.items ?? [], resourceType) : undefined;

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
      throw new QuotaChangeError(
        breakdown
          ? t`This quota's grants changed. It can't go below ${plan.floor} now.`
          : t`Couldn't load this quota's grants, so it can only be raised.`
      );
    }
    if (plan.kind === 'none') return;

    const consumerRef = {
      apiGroup: bucket.consumerApiGroup ?? '',
      kind: bucket.consumerKind as QuotaConsumer['kind'],
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

  return { grantsQuery, breakdownFor, changeLimit };
}
