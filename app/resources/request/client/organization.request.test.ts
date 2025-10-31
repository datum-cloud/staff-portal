import type { MemberInvitationCreate } from '@/resources/schemas';
import {
  importAfterMocks,
  mockLogger,
  mockRequestClient,
} from '@/tests/setup/unit/request-client.mock';
import { describe, expect, test, vi, beforeEach } from 'vitest';

describe('organization.request', () => {
  let orgListQuery: typeof import('./organization.request').orgListQuery;
  let orgProjectListQuery: typeof import('./organization.request').orgProjectListQuery;
  let orgMemberListQuery: typeof import('./organization.request').orgMemberListQuery;
  let orgInvitationCreateMutation: typeof import('./organization.request').orgInvitationCreateMutation;
  let orgInvitationDeleteMutation: typeof import('./organization.request').orgInvitationDeleteMutation;
  let orgDeleteMutation: typeof import('./organization.request').orgDeleteMutation;
  mockLogger();
  const axiosMock = mockRequestClient();

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await importAfterMocks<
      typeof import('@/resources/request/client/organization.request')
    >('@/resources/request/client/organization.request');
    orgListQuery = mod.orgListQuery;
    orgProjectListQuery = mod.orgProjectListQuery;
    orgMemberListQuery = mod.orgMemberListQuery;
    orgInvitationCreateMutation = mod.orgInvitationCreateMutation;
    orgInvitationDeleteMutation = mod.orgInvitationDeleteMutation;
    orgDeleteMutation = mod.orgDeleteMutation;
  }, 20000);

  test('orgListQuery builds params', async () => {
    await orgListQuery({ limit: 10, cursor: 'c1', search: 'acme' });
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/resourcemanager.miloapis.com/v1alpha1/organizations',
      params: { limit: 10, continue: 'c1', fieldSelector: 'metadata.name=acme' },
    });
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });

  test('orgProjectListQuery builds path and params', async () => {
    await orgProjectListQuery('acme', { limit: 5, cursor: 'n1' });
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/resourcemanager.miloapis.com/v1alpha1/organizations/acme/control-plane/apis/resourcemanager.miloapis.com/v1alpha1/projects',
      params: { limit: 5, continue: 'n1' },
    });
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });

  test('orgMemberListQuery merges members and invitations', async () => {
    // Prepare two mocked responses for the two sequential calls
    axiosMock.__builder.execute
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              status: { user: { givenName: 'A', familyName: 'B', email: 'a@b.c' } },
              spec: { userRef: { name: 'u1' } },
              metadata: { creationTimestamp: 't1' },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              spec: {
                givenName: 'C',
                familyName: 'D',
                email: 'c@d.e',
                roles: ['Member'],
                state: 'Pending',
              },
              metadata: { name: 'inv1', creationTimestamp: 't2' },
            },
          ],
        },
      });

    await orgMemberListQuery('acme', { limit: 3 });
    // Two GETs are made with different URLs; we just assert first is called
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/resourcemanager.miloapis.com/v1alpha1/namespaces/organization-acme/organizationmemberships',
      params: { limit: 3 },
    });
    expect(axiosMock.__builder.output).toHaveBeenCalled();
    expect(axiosMock.__builder.execute).toHaveBeenCalled();
  });

  test('orgInvitationCreateMutation posts typed payload', async () => {
    const payload: MemberInvitationCreate = {
      apiVersion: 'iam.miloapis.com/v1alpha1',
      kind: 'UserInvitation',
      metadata: { generateName: 'inv-' },
      spec: {
        givenName: 'John',
        familyName: 'Doe',
        email: 'a@b.c',
        expirationDate: '2099-01-01T00:00:00Z',
        organizationRef: { name: 'acme' },
        state: 'Pending',
        roles: [{ name: 'Member', namespace: 'acme' }],
      },
    };
    await orgInvitationCreateMutation('acme', payload);
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'POST',
      url: '/apis/iam.miloapis.com/v1alpha1/namespaces/organization-acme/userinvitations',
      data: payload,
    });
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });

  test('orgInvitationDeleteMutation builds path', async () => {
    await orgInvitationDeleteMutation('acme', 'inv-1');
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'DELETE',
      url: '/apis/iam.miloapis.com/v1alpha1/namespaces/organization-acme/userinvitations/inv-1',
    });
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });

  test('orgDeleteMutation builds path', async () => {
    await orgDeleteMutation('acme');
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'DELETE',
      url: '/apis/resourcemanager.miloapis.com/v1alpha1/organizations/acme',
    });
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });
});
