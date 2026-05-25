import { useApp } from '@/providers/app.provider';
import {
  useOrgQuotaGrantCreateMutation,
  useOrgQuotaGrantDeleteMutation,
} from '@/resources/request/client';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useLingui } from '@lingui/react/macro';
import type {
  ComMiloapisQuotaV1Alpha1ResourceGrant,
  ComMiloapisQuotaV1Alpha1ResourceRegistration,
} from '@openapi/quota.miloapis.com/v1alpha1';

/**
 * Annotation stamped on grants created from the staff portal so the UI can
 * surface the operator who flipped the flag (and when, from
 * creationTimestamp).
 */
export const FEATURE_FLAG_ENABLED_BY_ANNOTATION = 'staff-portal.miloapis.com/enabled-by';

/** Org-scoped resources live in the namespace `organization-<orgName>`. */
function orgNamespaceOf(orgName: string): string {
  return `organization-${orgName}`;
}

/**
 * Composed action for enabling/disabling a feature flag against an
 * organization. Enabling creates a `ResourceGrant` (amount=1) annotated with
 * the current user's email; disabling deletes every existing grant for that
 * resource type. Invalidation of the bucket / grant queries is handled by
 * the underlying mutation hooks.
 */
export function useFeatureFlagToggle(orgName: string) {
  const { t } = useLingui();
  const { user } = useApp();
  const create = useOrgQuotaGrantCreateMutation();
  const remove = useOrgQuotaGrantDeleteMutation();

  return {
    isPending: create.isPending || remove.isPending,
    toggle: async (
      registration: ComMiloapisQuotaV1Alpha1ResourceRegistration,
      shouldEnable: boolean,
      existingGrants: ComMiloapisQuotaV1Alpha1ResourceGrant[]
    ) => {
      const resourceType = registration.spec?.resourceType ?? '';
      const namespace = orgNamespaceOf(orgName);
      const consumerType = registration.spec?.consumerType;
      const consumerKind: 'Organization' | 'Project' =
        consumerType?.kind === 'Project' ? 'Project' : 'Organization';

      if (shouldEnable) {
        const email = user?.spec?.email ?? '';
        await create.mutateAsync({
          orgName,
          namespace,
          payload: {
            consumerRef: {
              apiGroup: consumerType?.apiGroup ?? 'resourcemanager.miloapis.com',
              kind: consumerKind,
              name: orgName,
            },
            allowances: [{ resourceType, buckets: [{ amount: 1 }] }],
          },
          annotations: email ? { [FEATURE_FLAG_ENABLED_BY_ANNOTATION]: email } : undefined,
        });
        toast.success(t`Feature flag enabled`);
        return;
      }

      if (existingGrants.length === 0) {
        toast.error(t`No grants found to remove for this flag`);
        throw new Error('No grants to remove');
      }
      await Promise.all(
        existingGrants.map((grant) =>
          remove.mutateAsync({
            orgName,
            name: grant.metadata?.name ?? '',
            namespace: grant.metadata?.namespace ?? namespace,
          })
        )
      );
      toast.success(t`Feature flag disabled`);
    },
  };
}
