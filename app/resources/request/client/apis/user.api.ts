import { ListQueryParams } from '@/resources/schemas';
import {
  ComMiloapisIamV1Alpha1PlatformAccess,
  ComMiloapisIamV1Alpha1User,
  createIamMiloapisComV1Alpha1PlatformInvitation,
  deleteIamMiloapisComV1Alpha1User,
  listIamMiloapisComV1Alpha1PlatformAccess,
  listIamMiloapisComV1Alpha1User,
  patchIamMiloapisComV1Alpha1PlatformAccess,
  patchIamMiloapisComV1Alpha1User,
  readIamMiloapisComV1Alpha1User,
} from '@openapi/iam.miloapis.com/v1alpha1';
import { listNotificationMiloapisComV1Alpha1EmailForAllNamespaces } from '@openapi/notification.miloapis.com/v1alpha1';

export const userGetQuery = async (userId: string): Promise<ComMiloapisIamV1Alpha1User | null> => {
  const response = await readIamMiloapisComV1Alpha1User({
    path: { name: userId },
  });
  return response.data?.data ?? null;
};

export const userListQuery = async (params?: ListQueryParams) => {
  const fieldSelectors: Record<string, string> = {};

  if (params?.search) {
    fieldSelectors['spec.email'] = params.search;
  }

  if (params?.filters?.registrationApproval) {
    fieldSelectors['status.registrationApproval'] = params.filters.registrationApproval;
  }

  const fieldSelectorString =
    Object.keys(fieldSelectors).length > 0
      ? Object.entries(fieldSelectors)
          .map(([key, value]) => `${key}=${value}`)
          .join(',')
      : undefined;

  const response = await listIamMiloapisComV1Alpha1User({
    query: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
      ...(fieldSelectorString && { fieldSelector: fieldSelectorString }),
    },
  });
  return response.data.data;
};

const ALL_USERS_PAGE_LIMIT = 100;
// Safety net against a runaway walk — mirrors listAllProjects'/listAllOrganizations' pattern.
const ALL_USERS_MAX_PAGES = 100;

/**
 * Walks `continue` to fetch every user, rather than a single page —
 * `userListQuery` intentionally stays single-page for the table's normal
 * paged view. This is for views that need a true total (the Users list
 * table, growth chart) where a hidden page limit would silently under-count.
 */
export const listAllUsers = async (): Promise<{
  items: ComMiloapisIamV1Alpha1User[];
  hasMore: boolean;
}> => {
  const items: ComMiloapisIamV1Alpha1User[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < ALL_USERS_MAX_PAGES; page++) {
    const result = await userListQuery({ limit: ALL_USERS_PAGE_LIMIT, cursor });
    items.push(...(result?.items ?? []));
    cursor = result?.metadata?.continue || undefined;
    if (!cursor) return { items, hasMore: false };
  }

  return { items, hasMore: true };
};

export const userUpdateMutation = async (
  userId: string,
  payload: Partial<ComMiloapisIamV1Alpha1User['spec']>
) => {
  const response = await patchIamMiloapisComV1Alpha1User({
    path: { name: userId },
    query: {
      fieldManager: 'datum-staff-portal',
    },
    headers: {
      'Content-Type': 'application/merge-patch+json',
    },
    body: {
      spec: payload,
    },
  });
  return response.data.data;
};

export const userUpdatePreferencesMutation = async (
  userId: string,
  payload: Partial<ComMiloapisIamV1Alpha1User['metadata']>
) => {
  const response = await patchIamMiloapisComV1Alpha1User({
    path: { name: userId },
    query: {
      fieldManager: 'datum-staff-portal',
    },
    headers: {
      'Content-Type': 'application/merge-patch+json',
    },
    body: {
      apiVersion: 'iam.miloapis.com/v1alpha1',
      kind: 'User',
      metadata: payload,
    },
  });
  return response.data.data;
};

export const userDeleteMutation = async (userId: string) => {
  return deleteIamMiloapisComV1Alpha1User({
    path: { name: userId },
  });
};

export const userInviteMutation = async (payload: any) => {
  const response = await createIamMiloapisComV1Alpha1PlatformInvitation({
    body: payload,
  });
  return response.data.data;
};

/** The four platform-access states a user can be in (from `PlatformAccess.spec.state`). */
export type PlatformAccessState = 'Pending' | 'Approved' | 'Rejected' | 'Suspended';

/**
 * Finds the single PlatformAccess resource governing a user's access, or null if
 * none exists yet. PlatformAccess replaces UserDeactivation/PlatformAccessApproval/
 * Rejection — there is at most one per user, matched by `spec.userRef.name`.
 */
export const platformAccessFindQuery = async (userId: string) => {
  const response = await listIamMiloapisComV1Alpha1PlatformAccess({
    query: {
      limit: 1,
      fieldSelector: `spec.userRef.name=${userId}`,
    },
  });

  return response.data.data?.items?.[0] ?? null;
};

/**
 * Patches a user's PlatformAccess to a new state (and optional reason). This is the
 * single mutation for suspend/reactivate/approve/reject — the backend derives the
 * user's effective access from `spec.state`.
 */
export const platformAccessSetStateMutation = async (
  name: string,
  state: PlatformAccessState,
  reason?: string
) => {
  const response = await patchIamMiloapisComV1Alpha1PlatformAccess({
    path: { name },
    query: {
      fieldManager: 'datum-staff-portal',
    },
    headers: {
      'Content-Type': 'application/merge-patch+json',
    },
    body: {
      spec: {
        state,
        ...(reason ? { reason } : {}),
      },
    } as Partial<ComMiloapisIamV1Alpha1PlatformAccess>,
  });
  return response.data.data;
};

export const userEmailListQuery = async (
  userId: string,
  userEmail: string,
  params?: ListQueryParams
) => {
  const listByEmail = await listNotificationMiloapisComV1Alpha1EmailForAllNamespaces({
    query: {
      limit: params?.limit,
      continue: params?.cursor,
      fieldSelector: `spec.recipient.emailAddress=${userEmail}`,
    },
  });

  const listByUser = await listNotificationMiloapisComV1Alpha1EmailForAllNamespaces({
    query: {
      limit: params?.limit,
      continue: params?.cursor,
      fieldSelector: `spec.recipient.userRef.name=${userId}`,
    },
  });

  return {
    ...listByEmail.data.data,
    items: [...(listByEmail.data.data?.items ?? []), ...(listByUser.data.data?.items ?? [])],
  };
};
