import type { ComMiloapisNotificationV1Alpha1Contact } from '@openapi/notification.miloapis.com/v1alpha1';

/**
 * A contact is a "platform user" when it is linked to a User subject; otherwise
 * it is a "prospect". This is the single discriminator the overview uses to pick
 * the badge and to decide whether the user-only summary stats are shown.
 */
export function isPlatformUser(contact?: ComMiloapisNotificationV1Alpha1Contact | null): boolean {
  const subject = contact?.spec?.subject;
  return subject?.kind === 'User' && Boolean(subject?.name);
}
