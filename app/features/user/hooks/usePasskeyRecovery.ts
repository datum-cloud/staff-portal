import { useApp } from '@/providers/app.provider';
import { passkeyRegistrationLinkCreateMutation } from '@/resources/request/client';
import { parseK8sMessage } from '@/utils/errors';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useLingui } from '@lingui/react/macro';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import axios from 'axios';

/** The apiserver returns this while infra's RECOVERY_LINKS_ENABLED is still off. */
const STATUS_LINKS_DISABLED = 503;
/** No PolicyBinding granting identity-passkey-registration-links-editor. */
const STATUS_NOT_AUTHORIZED = 403;

/** The `{ requestId, code, error, path }` envelope the internal proxy returns on failure. */
const serverMessage = (error: unknown): string | undefined => {
  if (!axios.isAxiosError(error)) return undefined;
  const data = error.response?.data as { error?: string; message?: string } | undefined;
  const raw = data?.error ?? data?.message;
  return raw ? parseK8sMessage(raw) : undefined;
};

/**
 * Sends the Phase C passkey recovery link, in the shape {@link useUserPlatformAccess} uses:
 * create the object, run the caller's `onSuccess`, toast.
 *
 * The requester is the signed-in staff user — the server rejects a `requestedBy` that is
 * not the authenticated caller, so this is the only value that can work.
 *
 * A failure is re-thrown carrying a message support can act on. Two of the server's
 * outcomes are expected and get our own words: 503 means infrastructure has not switched
 * the backstop on, 403 means this account lacks the grant. Everything else — an unverified
 * address above all — is shown in the server's own words, because that is the useful part.
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
      try {
        const link = await passkeyRegistrationLinkCreateMutation(user.metadata?.name ?? '', {
          requestedBy: currentUser?.metadata?.name ?? '',
          reason,
        });

        await onSuccess();
        toast.success(t`Recovery link sent to the user's verified email address`);
        return link;
      } catch (error) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;

        if (status === STATUS_LINKS_DISABLED) {
          throw new Error(
            t`Recovery links are disabled right now. Nothing was sent — ask the infrastructure team to switch them on.`
          );
        }
        if (status === STATUS_NOT_AUTHORIZED) {
          throw new Error(
            t`You are not authorized to send a recovery link for this user. Nothing was sent.`
          );
        }

        throw new Error(
          serverMessage(error) ?? t`Sending the recovery link failed. Nothing was sent.`
        );
      }
    },
  };
}
