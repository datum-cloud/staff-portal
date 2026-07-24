import {
  PlatformAccessState,
  platformAccessFindQuery,
  platformAccessSetStateMutation,
} from '@/resources/request/client';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useLingui } from '@lingui/react/macro';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';

export type { PlatformAccessState };

/** All selectable platform-access states, in lifecycle order. */
export const PLATFORM_ACCESS_STATES: PlatformAccessState[] = [
  'Pending',
  'Approved',
  'Suspended',
  'Rejected',
];

/**
 * Writes a user's platform-access state via the single PlatformAccess resource,
 * replacing the old create/delete UserDeactivation + PlatformAccessApproval/Rejection
 * flows. Mirrors {@link useUserApproval}'s shape: each action locates the resource,
 * mutates it, toasts, then calls the caller's `onSuccess` (to revalidate/refetch).
 */
export function useUserPlatformAccess() {
  const { t } = useLingui();

  return {
    setState: async (
      user: ComMiloapisIamV1Alpha1User,
      state: PlatformAccessState,
      reason: string | undefined,
      onSuccess: () => Promise<void>
    ) => {
      const access = await platformAccessFindQuery(user.metadata?.name ?? '');
      if (!access) {
        toast.error(t`No platform access record found for this user`);
        return;
      }

      await platformAccessSetStateMutation(access.metadata?.name ?? '', state, reason);

      await onSuccess();
      toast.success(t`Platform access updated to ${state}`);
    },
  };
}
