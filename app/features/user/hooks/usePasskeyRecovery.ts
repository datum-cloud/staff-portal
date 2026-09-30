import { useApp } from '@/providers/app.provider';
import { passkeyRegistrationLinkCreateMutation } from '@/resources/request/client';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useLingui } from '@lingui/react/macro';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';

/**
 * Sends the Phase C passkey recovery link, in the shape {@link useUserPlatformAccess} uses:
 * create the object, run the caller's `onSuccess`, toast.
 *
 * The requester is the signed-in staff user — the server rejects a `requestedBy` that is
 * not the authenticated caller, so this is the only value that can work.
 */
export function usePasskeyRecovery() {
  const { t } = useLingui();
  const { user: currentUser } = useApp();

  return {
    sendRecoveryLink: async (
      user: ComMiloapisIamV1Alpha1User,
      reason: string,
      onSuccess: () => Promise<void>
    ) => {
      const link = await passkeyRegistrationLinkCreateMutation(user.metadata?.name ?? '', {
        // The server rejects this with a 400 unless it equals the authenticated caller:
        // `link.Spec.RequestedBy != caller.GetName()` in the identity apiserver's
        // passkeyregistrationlinks/rest.go:131, where `caller` comes from
        // request.UserFrom(ctx) — i.e. whatever identity the forwarded bearer token
        // resolves to. This sends the milo User's metadata.name, which requireStaffUser
        // read by the session's OIDC `sub`, so the two should be the same string. Nothing
        // in this repo can prove that; it needs one live send on staging. If it turns out
        // to differ, the value to send is the session subject itself (`session.sub`).
        requestedBy: currentUser?.metadata?.name ?? '',
        reason,
      });

      await onSuccess();
      toast.success(t`Recovery link sent to the user's verified email address`);
      return link;
    },
  };
}
