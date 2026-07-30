import { useApp } from '@/providers/app.provider';
import { projectLiftSuspensionMutation, projectSuspendMutation } from '@/resources/request/client';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useLingui } from '@lingui/react/macro';
import type {
  ComMiloapisResourcemanagerV1Alpha1Project,
  ComMiloapisResourcemanagerV1Alpha1ProjectSuspension,
} from '@openapi/resourcemanager.miloapis.com/v1alpha1';

type SuspensionSpec = NonNullable<ComMiloapisResourcemanagerV1Alpha1ProjectSuspension['spec']>;
export type SuspensionReason = SuspensionSpec['reason'];
export type ReinstateAuthority = SuspensionSpec['reinstateAuthority'];

export const SUSPENSION_REASONS: SuspensionReason[] = [
  'Fraud',
  'Abuse',
  'Billing',
  'Compliance',
  'Administrative',
];

export const REINSTATE_AUTHORITIES: ReinstateAuthority[] = ['Operator', 'Consumer'];

/**
 * Default reinstate authority per reason (proposal): billing suspensions are
 * customer-remediable, everything else requires an operator to lift.
 */
export function defaultAuthorityForReason(reason: SuspensionReason): ReinstateAuthority {
  return reason === 'Billing' ? 'Consumer' : 'Operator';
}

export interface SuspendInput {
  reason: SuspensionReason;
  reinstateAuthority: ReinstateAuthority;
  description?: string;
}

/**
 * Suspend / lift a project via the ProjectSuspension resource — the presence of an
 * Active ProjectSuspension derives the project's Suspended state. Mirrors
 * useUserPlatformAccess: each action mutates, toasts, then calls onSuccess to refetch.
 */
export function useProjectSuspension() {
  const { t } = useLingui();
  const { user: currentUser } = useApp();

  return {
    suspend: async (
      project: ComMiloapisResourcemanagerV1Alpha1Project,
      input: SuspendInput,
      onSuccess: () => Promise<void>
    ) => {
      await projectSuspendMutation({
        projectRef: { name: project.metadata?.name ?? '' },
        reason: input.reason,
        reinstateAuthority: input.reinstateAuthority,
        requestedBy: currentUser?.spec?.email ?? currentUser?.metadata?.name ?? '',
        ...(input.description ? { description: input.description } : {}),
      });

      await onSuccess();
      toast.success(t`Project suspended`);
    },

    lift: async (
      suspension: ComMiloapisResourcemanagerV1Alpha1ProjectSuspension,
      onSuccess: () => Promise<void>
    ) => {
      await projectLiftSuspensionMutation(suspension.metadata?.name ?? '');
      await onSuccess();
      toast.success(t`Suspension lifted`);
    },
  };
}
