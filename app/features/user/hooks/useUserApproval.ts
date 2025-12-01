import { useApp } from '@/providers/app.provider';
import {
  userApproveMutation,
  userDeleteApprovalMutation,
  userDeleteRejectionMutation,
  userFindApprovalQuery,
  userFindRejectionQuery,
  userRejectMutation,
} from '@/resources/request/client';
import { User } from '@/resources/schemas';
import { toast } from '@datum-ui/toast';
import { useLingui } from '@lingui/react/macro';

export function useUserApproval() {
  const { t } = useLingui();
  const { user: currentUser } = useApp();

  return {
    approveUser: async (user: User, onSuccess: () => Promise<void>) => {
      await userApproveMutation({
        apiVersion: 'iam.miloapis.com/v1alpha1',
        kind: 'PlatformAccessApproval',
        metadata: { generateName: 'platform-access-approval-' },
        spec: {
          subjectRef: { userRef: { name: user.metadata.name } },
          approverRef: { name: currentUser?.metadata.name ?? '' },
        },
      });

      await onSuccess();
      toast.success(t`User approved successfully`);
    },

    rejectUser: async (user: User, reason: string, onSuccess: () => Promise<void>) => {
      await userRejectMutation({
        apiVersion: 'iam.miloapis.com/v1alpha1',
        kind: 'PlatformAccessRejection',
        metadata: { generateName: 'platform-access-rejection-' },
        spec: {
          subjectRef: { name: user?.metadata.name ?? '' },
          reason: reason,
          rejecterRef: { name: currentUser?.metadata.name ?? '' },
        },
      });

      await onSuccess();
      toast.success(t`User rejected successfully`);
    },

    pendingUser: async (user: User, onSuccess: () => Promise<void>) => {
      if (user.status?.registrationApproval === 'Approved') {
        const approval = await userFindApprovalQuery(user.metadata.name);
        if (!approval) {
          toast.error(t`User is not approved`);
          return;
        }

        await userDeleteApprovalMutation(approval.metadata.name ?? '');
      } else if (user.status?.registrationApproval === 'Rejected') {
        const rejection = await userFindRejectionQuery(user.metadata.name);
        if (!rejection) {
          toast.error(t`User is not rejected`);
          return;
        }

        await userDeleteRejectionMutation(rejection.metadata.name ?? '');
      } else {
        toast.error(t`User is not approved or rejected`);
        return;
      }

      await onSuccess();
      toast.success(t`User moved to pending successfully`);
    },
  };
}
