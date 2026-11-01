import { isPlatformUser } from './contact-user-link';
import type { ComMiloapisNotificationV1Alpha1Contact } from '@openapi/notification.miloapis.com/v1alpha1';
import { describe, expect, it } from 'vitest';

const contact = (
  subject?: NonNullable<ComMiloapisNotificationV1Alpha1Contact['spec']>['subject']
): ComMiloapisNotificationV1Alpha1Contact =>
  ({
    metadata: { name: 'kevin-williams', namespace: 'default' },
    spec: { email: 'k@datum.net', subject },
  }) as ComMiloapisNotificationV1Alpha1Contact;

describe('isPlatformUser', () => {
  it('is true when linked to a User subject with a name', () => {
    expect(
      isPlatformUser(contact({ apiGroup: 'iam.miloapis.com', kind: 'User', name: 'user-123' }))
    ).toBe(true);
  });

  it('is false when the subject is a User but has no name', () => {
    expect(isPlatformUser(contact({ apiGroup: 'iam.miloapis.com', kind: 'User', name: '' }))).toBe(
      false
    );
  });

  it('is false when there is no subject (prospect)', () => {
    expect(isPlatformUser(contact(undefined))).toBe(false);
  });

  it('is false when the subject is not a User', () => {
    expect(
      isPlatformUser(
        contact({ apiGroup: 'iam.miloapis.com', kind: 'Group', name: 'group-1' } as never)
      )
    ).toBe(false);
  });

  it('is false for a null/undefined contact', () => {
    expect(isPlatformUser(undefined)).toBe(false);
    expect(isPlatformUser(null)).toBe(false);
  });
});
