import { useApp } from '@/providers/app.provider';
import { userApproveMutation, userRejectMutation } from '@/resources/request/client';
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
        metadata: { name: `${user.metadata.name}-approval` },
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
        metadata: { name: `${user?.metadata.name}-rejection` },
        spec: {
          subjectRef: { name: user?.metadata.name ?? '' },
          reason: reason,
          rejecterRef: { name: currentUser?.metadata.name ?? '' },
        },
      });

      await onSuccess();
      toast.success(t`User rejected successfully`);
    },
  };
}
