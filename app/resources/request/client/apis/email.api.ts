import { ListQueryParams } from '@/resources/schemas';
import { listNotificationMiloapisComV1Alpha1NamespacedEmail } from '@openapi/notification.miloapis.com/v1alpha1';

export const emailListQuery = async (
  namespace: string = 'milo-system',
  params?: ListQueryParams
) => {
  const response = await listNotificationMiloapisComV1Alpha1NamespacedEmail({
    path: { namespace },
    query: {
      limit: params?.limit,
      continue: params?.cursor,
    },
  });
  return response.data.data;
};

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
export const projectSuspensionWarningEmailListQuery = async (projectName: string) => {
  const response = await listNotificationMiloapisComV1Alpha1NamespacedEmail({
    path: { namespace: 'milo-system' },
    query: {
      labelSelector: `${PROJECT_NAME_LABEL}=${projectName},${NOTIFICATION_KIND_LABEL}=${PROJECT_SUSPENSION_WARNING_KIND}`,
    },
  });
  return response.data.data;
};
