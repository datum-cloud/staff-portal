import { PROXY_URL } from '@/modules/axios/axios.client';
import { ListQueryParams } from '@/resources/schemas';
import {
  deleteIdentityMiloapisComV1Alpha1Session,
  listIdentityMiloapisComV1Alpha1Session,
  listIdentityMiloapisComV1Alpha1UserIdentity,
} from '@openapi/identity.miloapis.com/v1alpha1';
// TEMPORARY: hand-written stand-ins until milo-os/zitadel-provider#135 reaches staging
// and `bun run openapi:generate` can emit them. Swap this import for the group barrel
// above and delete the file when it does.
import {
  createIdentityMiloapisComV1Alpha1PasskeyRegistrationLink,
  listIdentityMiloapisComV1Alpha1Passkey,
} from '@openapi/identity.miloapis.com/v1alpha1/pending-phase-c';
import { listNotificationMiloapisComV1Alpha1EmailForAllNamespaces } from '@openapi/notification.miloapis.com/v1alpha1';

// Labels and annotations zitadel-provider stamps on the recovery Email
// (internal/recoverymail/email.go). The Email is the audit record: the identity apiserver
// is virtual, so who asked and why live here and nowhere else.
export const RECOVERY_USER_LABEL = 'identity.miloapis.com/user';
export const RECOVERY_REQUESTED_BY_LABEL = 'identity.miloapis.com/recovery-requested-by';
export const RECOVERY_REQUESTER_ANNOTATION = 'identity.miloapis.com/recovery-requester';
export const RECOVERY_REASON_ANNOTATION = 'identity.miloapis.com/recovery-reason';

/** How many past recovery links the history card shows. */
export const RECOVERY_EMAIL_HISTORY_LIMIT = 20;

// Cross-user lookups are gated server-side by a SAR against milo on
// `get iam.miloapis.com/users/<userId>`. When userId equals the caller's
// own UID the selector is a no-op (handler short-circuits to self).
const buildUserScopedFieldSelector = (userId: string, extra?: string): string => {
  const parts = [`status.userUID=${userId}`];
  if (extra) parts.push(extra);
  return parts.join(',');
};

export const sessionListQuery = async (userId: string, params?: ListQueryParams) => {
  const response = await listIdentityMiloapisComV1Alpha1Session({
    baseURL: `${PROXY_URL}/apis/iam.miloapis.com/v1alpha1/users/${userId}/control-plane`,
    query: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
      fieldSelector: buildUserScopedFieldSelector(
        userId,
        params?.search ? `metadata.name=${params.search}` : undefined
      ),
    },
  });
  return response.data.data;
};

export const sessionDeleteMutation = (userId: string, sessionName: string) => {
  return deleteIdentityMiloapisComV1Alpha1Session({
    baseURL: `${PROXY_URL}/apis/iam.miloapis.com/v1alpha1/users/${userId}/control-plane`,
    path: { name: sessionName },
  });
};

export const identityListQuery = async (userId: string, params?: ListQueryParams) => {
  return listIdentityMiloapisComV1Alpha1UserIdentity({
    baseURL: `${PROXY_URL}/apis/iam.miloapis.com/v1alpha1/users/${userId}/control-plane`,
    query: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
      fieldSelector: buildUserScopedFieldSelector(userId),
    },
  });
};

export const passkeyListQuery = async (userId: string) => {
  const response = await listIdentityMiloapisComV1Alpha1Passkey({
    baseURL: `${PROXY_URL}/apis/iam.miloapis.com/v1alpha1/users/${userId}/control-plane`,
    query: { fieldSelector: buildUserScopedFieldSelector(userId) },
  });
  return response.data.data;
};

// Phase C admin backstop. Create-only and virtual: the object exists only in this response;
// the durable record is the labeled notification Email (see recoveryEmailListQuery). The
// server rejects requestedBy != caller, unverified users (400), no permission (403), and
// returns 503 while infra's RECOVERY_LINKS_ENABLED is off — surface all of those verbatim.
export const passkeyRegistrationLinkCreateMutation = async (
  userId: string,
  input: { requestedBy: string; reason: string }
) => {
  const response = await createIdentityMiloapisComV1Alpha1PasskeyRegistrationLink({
    baseURL: `${PROXY_URL}/apis/iam.miloapis.com/v1alpha1/users/${userId}/control-plane`,
    body: {
      apiVersion: 'identity.miloapis.com/v1alpha1',
      kind: 'PasskeyRegistrationLink',
      metadata: { generateName: 'passkey-recovery-' },
      spec: { userRef: { name: userId }, requestedBy: input.requestedBy, reason: input.reason },
    },
  });
  return response.data.data;
};

// The links-sent history. zitadel-provider stamps these labels on the Email it creates for
// both recovery triggers; `=support` keeps the list to the ones staff sent. The Emails live
// in the notification namespace, so this lists across namespaces rather than guessing one.
export const recoveryEmailListQuery = async (userId: string) => {
  const response = await listNotificationMiloapisComV1Alpha1EmailForAllNamespaces({
    query: {
      labelSelector: `${RECOVERY_USER_LABEL}=${userId},${RECOVERY_REQUESTED_BY_LABEL}=support`,
      limit: RECOVERY_EMAIL_HISTORY_LIMIT,
    },
  });
  return response.data.data;
};
