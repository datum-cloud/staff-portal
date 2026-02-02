import type { ComMiloapisNotificationV1Alpha1Email } from '@openapi/notification.miloapis.com/v1alpha1';

export const extractTemplateName = (templateRef?: string): string => {
  if (!templateRef) return '-';
  const parts = templateRef.split(/[-.]/);
  return parts[parts.length - 1] || templateRef;
};

export const normalizeBody = (body?: string): string => {
  if (!body) return '';
  return body.trim();
};

type EmailStatusCondition = NonNullable<
  NonNullable<ComMiloapisNotificationV1Alpha1Email['status']>['conditions']
>[number];

export const getEmailCondition = (
  email: ComMiloapisNotificationV1Alpha1Email
): EmailStatusCondition | undefined => {
  const conditions = email.status?.conditions;
  if (!conditions || conditions.length === 0) return undefined;

  return conditions[0];
};
