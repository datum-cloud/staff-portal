import { useApp } from '@/providers/app.provider';
import { passkeyRegistrationLinkCreateMutation } from '@/resources/request/client';
import { parseK8sMessage } from '@/utils/errors';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useLingui } from '@lingui/react/macro';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import axios from 'axios';

/**
 * The apiserver returns 503 from two unrelated places: while infra's RECOVERY_LINKS_ENABLED
 * is still off, and when Zitadel itself is unreachable. Only the server knows which, so this
 * status shows the server's message rather than one guess about the cause.
 */
const STATUS_UNAVAILABLE = 503;
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
 * A failure is re-thrown carrying a message support can act on. 403 is the one outcome that
 * gets our own words, because both of the server's 403s mean the same thing to the person
 * reading it: this account lacks the grant. Everything else is shown in the server's own
 * words — an unverified address, and either cause of a 503 — because that is the useful
 * part, and because guessing which of two causes produced a 503 misdirects support during
 * an outage.
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

        if (status === STATUS_UNAVAILABLE) {
          throw new Error(
            serverMessage(error) ?? t`Recovery links are unavailable right now. Nothing was sent.`
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
