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

export const getEmailStatus = (email: ComMiloapisNotificationV1Alpha1Email): string | undefined => {
  const conditions = email.status?.conditions;
  if (!conditions || conditions.length === 0) return undefined;

  const firstCondition = conditions[0];
  return firstCondition?.status;
};
