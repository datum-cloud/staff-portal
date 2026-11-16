import { orgInvitationResendMutation } from './organization.api';
import {
  createIamMiloapisComV1Alpha1NamespacedUserInvitation,
  deleteIamMiloapisComV1Alpha1NamespacedUserInvitation,
  readIamMiloapisComV1Alpha1NamespacedUserInvitation,
} from '@openapi/iam.miloapis.com/v1alpha1';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@openapi/iam.miloapis.com/v1alpha1', () => ({
  createIamMiloapisComV1Alpha1NamespacedUserInvitation: vi.fn(),
  deleteIamMiloapisComV1Alpha1NamespacedUserInvitation: vi.fn(),
  listIamMiloapisComV1Alpha1NamespacedUserInvitation: vi.fn(),
  readIamMiloapisComV1Alpha1NamespacedUserInvitation: vi.fn(),
}));

const readInvitation = vi.mocked(readIamMiloapisComV1Alpha1NamespacedUserInvitation);
const deleteInvitation = vi.mocked(deleteIamMiloapisComV1Alpha1NamespacedUserInvitation);
const createInvitation = vi.mocked(createIamMiloapisComV1Alpha1NamespacedUserInvitation);

// The SDK resolves to the proxy envelope: `response.data.data` is the resource.
const envelope = (data: unknown) => ({ data: { data } }) as never;

const stored = {
  metadata: { name: 'inv-1', namespace: 'organization-acme' },
  spec: {
    email: 'person@example.com',
    givenName: 'Pat',
    familyName: 'Doe',
    organizationRef: { name: 'acme' },
    roles: [{ name: 'datum-cloud-viewer', namespace: 'milo-system' }],
    invitedBy: { name: 'staff-user' },
    expirationDate: '2026-01-01T00:00:00Z',
    state: 'Pending',
  },
};

describe('orgInvitationResendMutation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    readInvitation.mockResolvedValue(envelope(stored));
    deleteInvitation.mockResolvedValue(envelope({}));
    createInvitation.mockResolvedValue(envelope({ metadata: { name: 'inv-2' } }));
  });

  it('recreates the invitation with its roles, namespaces included', async () => {
    await orgInvitationResendMutation('acme', 'inv-1');

    expect(readInvitation).toHaveBeenCalledWith({
      path: { namespace: 'organization-acme', name: 'inv-1' },
    });
    expect(deleteInvitation).toHaveBeenCalledWith({
      path: { namespace: 'organization-acme', name: 'inv-1' },
    });

    const body = createInvitation.mock.calls[0][0].body;
    expect(body.spec).toMatchObject({
      email: 'person@example.com',
      givenName: 'Pat',
      familyName: 'Doe',
      organizationRef: { name: 'acme' },
      roles: [{ name: 'datum-cloud-viewer', namespace: 'milo-system' }],
      state: 'Pending',
    });
    // Milo sets the inviter itself.
    expect(body.spec).not.toHaveProperty('invitedBy');
    // Names the invitation it replaces, so activity shows it as resent.
    expect(body.metadata?.annotations).toEqual({ 'iam.miloapis.com/resent-from': 'inv-1' });
    expect(new Date(body.spec!.expirationDate!).getTime()).toBeGreaterThan(Date.now());
  });

  it('gives the resent invitation seven days, matching cloud-portal', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-16T12:00:00Z'));
    try {
      await orgInvitationResendMutation('acme', 'inv-1');
    } finally {
      vi.useRealTimers();
    }

    const body = createInvitation.mock.calls[0][0].body;
    expect(new Date(body.spec!.expirationDate!).toISOString()).toBe('2026-11-23T12:00:00.000Z');
  });

  it('deletes before it creates, since Milo allows one pending invitation per email', async () => {
    await orgInvitationResendMutation('acme', 'inv-1');

    expect(deleteInvitation.mock.invocationCallOrder[0]).toBeLessThan(
      createInvitation.mock.invocationCallOrder[0]
    );
  });

  it('leaves the invitation alone when it cannot be read', async () => {
    readInvitation.mockRejectedValue(new Error('not found'));

    await expect(orgInvitationResendMutation('acme', 'inv-1')).rejects.toThrow('not found');
    expect(deleteInvitation).not.toHaveBeenCalled();
    expect(createInvitation).not.toHaveBeenCalled();
  });
});
