import type { ContactCreate, ContactUpdate } from '@/resources/schemas';
import {
  importAfterMocks,
  mockLogger,
  mockRequestClient,
} from '@/tests/setup/unit/request-client.mock';
import { describe, expect, test, vi, beforeEach } from 'vitest';

mockLogger();
const axiosMock = mockRequestClient();

describe('contact.request', () => {
  let contactListQuery: typeof import('./contact.request').contactListQuery;
  let contactCreateMutation: typeof import('./contact.request').contactCreateMutation;
  let contactUpdateMutation: typeof import('./contact.request').contactUpdateMutation;
  let contactDeleteMutation: typeof import('./contact.request').contactDeleteMutation;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await importAfterMocks<typeof import('@/resources/request/client/contact.request')>(
      '@/resources/request/client/contact.request'
    );
    contactListQuery = mod.contactListQuery;
    contactCreateMutation = mod.contactCreateMutation;
    contactUpdateMutation = mod.contactUpdateMutation;
    contactDeleteMutation = mod.contactDeleteMutation;
  });

  test('contactListQuery builds params correctly', async () => {
    await contactListQuery({ limit: 10, cursor: 'c1', search: 'alice' });

    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/notification.miloapis.com/v1alpha1/contacts',
      params: { limit: 10, continue: 'c1', fieldSelector: 'metadata.name=alice' },
    });
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });

  test('contactCreateMutation posts typed payload to namespace', async () => {
    const payload: ContactCreate = {
      apiVersion: 'notification.miloapis.com/v1alpha1',
      kind: 'Contact',
      metadata: { namespace: 'default', generateName: 'contact-' },
      spec: {
        givenName: 'Alice',
        familyName: 'Doe',
        email: 'alice@example.com',
        subject: { apiGroup: 'iam.miloapis.com', kind: 'User', name: 'user-alice' },
      },
    };

    await contactCreateMutation(payload, 'org-foo');

    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'POST',
      url: '/apis/notification.miloapis.com/v1alpha1/namespaces/org-foo/contacts',
      data: payload,
    });
    expect(axiosMock.__builder.input).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });

  test('contactUpdateMutation patches with typed payload', async () => {
    const patch: ContactUpdate = {
      apiVersion: 'notification.miloapis.com/v1alpha1',
      kind: 'Contact',
      metadata: { namespace: 'default' },
      spec: { givenName: 'Alicia', familyName: 'Doe', email: 'alice@example.com' },
    };

    await contactUpdateMutation('contact-1', patch, 'ns-x');

    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'PATCH',
      url: '/apis/notification.miloapis.com/v1alpha1/namespaces/ns-x/contacts/contact-1',
      params: { fieldManager: 'datum-staff-portal' },
      headers: { 'Content-Type': 'application/merge-patch+json' },
      data: patch,
    });
    expect(axiosMock.__builder.input).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });

  test('contactDeleteMutation deletes resource at path', async () => {
    await contactDeleteMutation('contact-2', 'ns-y');
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'DELETE',
      url: '/apis/notification.miloapis.com/v1alpha1/namespaces/ns-y/contacts/contact-2',
    });
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });
});
