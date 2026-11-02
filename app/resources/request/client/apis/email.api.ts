import {
  ComMiloapisNotificationV1Alpha1Email,
  ComMiloapisNotificationV1Alpha1EmailList,
  listNotificationMiloapisComV1Alpha1NamespacedEmail,
} from '@openapi/notification.miloapis.com/v1alpha1';

export const EMAIL_PAGE_SIZE = 100;

/**
 * Lists every Email in a namespace, a page at a time. The list API can't sort and Email
 * names are deterministic hashes, so showing the newest first needs the whole set; paging
 * keeps each upstream response well under the server's 32 MB cap. milo-os/milo#932 tracks
 * a time-ordered list that would let this stop early.
 */
export const listAllEmails = async (
  namespace: string,
  options: { labelSelector?: string; signal?: AbortSignal } = {},
  cursor?: string,
  items: ComMiloapisNotificationV1Alpha1Email[] = []
): Promise<ComMiloapisNotificationV1Alpha1EmailList> => {
  const { labelSelector, signal } = options;
  const response = await listNotificationMiloapisComV1Alpha1NamespacedEmail({
    signal,
    path: { namespace },
    query: {
      limit: EMAIL_PAGE_SIZE,
      ...(labelSelector && { labelSelector }),
      ...(cursor && { continue: cursor }),
    },
  });
  const page = response.data.data;
  const merged = [...items, ...(page?.items ?? [])];
  const next = page?.metadata?.continue;

  return next ? listAllEmails(namespace, options, next, merged) : { ...page, items: merged };
};

export const emailListQuery = async (namespace: string = 'milo-system', signal?: AbortSignal) =>
  listAllEmails(namespace, { signal });

// Labels the escalation controller stamps on deletion-warning emails (milo #758).
// The emails live in milo-system so they survive project/org deletion as an audit trail.
const PROJECT_NAME_LABEL = 'resourcemanager.miloapis.com/project-name';
const NOTIFICATION_KIND_LABEL = 'notification.miloapis.com/notification-kind';
const PROJECT_SUSPENSION_WARNING_KIND = 'project-suspension-deletion-warning';

/**
 * Lists the deletion-warning emails for a suspended project — filtered by the
 * project-name label and the suspension-warning notification kind. Returns an
 * empty list until milo #758 ships the labels.
 */
export const projectSuspensionWarningEmailListQuery = async (
  projectName: string,
  signal?: AbortSignal
) =>
  listAllEmails('milo-system', {
    signal,
    labelSelector: `${PROJECT_NAME_LABEL}=${projectName},${NOTIFICATION_KIND_LABEL}=${PROJECT_SUSPENSION_WARNING_KIND}`,
  });
