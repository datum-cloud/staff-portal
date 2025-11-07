import type { UserUpdate, UserApprove, UserReject, UserDeactivate, UserInvite } from '@/resources/schemas';
import {
  importAfterMocks,
  mockLogger,
  mockRequestClient,
} from '@/tests/setup/unit/request-client.mock';
import { describe, expect, test, vi, beforeEach } from 'vitest';

mockLogger();
const axiosMock = mockRequestClient();

describe('user.request', () => {
  let userListQuery: typeof import('./user.request').userListQuery;
  let userUpdateMutation: typeof import('./user.request').userUpdateMutation;
  let userDeleteMutation: typeof import('./user.request').userDeleteMutation;
  let userApproveMutation: typeof import('./user.request').userApproveMutation;
  let userRejectMutation: typeof import('./user.request').userRejectMutation;
  let userDeactivateMutation: typeof import('./user.request').userDeactivateMutation;
  let userReactivateMutation: typeof import('./user.request').userReactivateMutation;
  let userInviteMutation: typeof import('./user.request').userInviteMutation;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await importAfterMocks<typeof import('@/resources/request/client/user.request')>(
      '@/resources/request/client/user.request'
    );
    userListQuery = mod.userListQuery;
    userUpdateMutation = mod.userUpdateMutation;
    userDeleteMutation = mod.userDeleteMutation;
    userApproveMutation = mod.userApproveMutation;
    userRejectMutation = mod.userRejectMutation;
    userDeactivateMutation = mod.userDeactivateMutation;
    userReactivateMutation = mod.userReactivateMutation;
    userInviteMutation = mod.userInviteMutation;
  });

  test('userListQuery builds combined fieldSelector', async () => {
    await userListQuery({
      limit: 25,
      cursor: 'next',
      search: 'user@example.com',
      // filters type is defined in ListQueryParams; we pass expected slice
      // registrationApproval is a string union in schema
      filters: { registrationApproval: 'Approved' },
    });

    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/iam.miloapis.com/v1alpha1/users',
      params: {
        limit: 25,
        continue: 'next',
        fieldSelector: 'spec.email=user@example.com,status.registrationApproval=Approved',
      },
    });
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });

  test('userUpdateMutation sends typed patch', async () => {
    const patch: UserUpdate = {
      apiVersion: 'iam.miloapis.com/v1alpha1',
      kind: 'User',
      spec: { givenName: 'Jane', familyName: 'Doe' },
    };

    await userUpdateMutation('user-1', patch);

    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'PATCH',
      url: '/apis/iam.miloapis.com/v1alpha1/users/user-1',
      params: { fieldManager: 'datum-staff-portal' },
      headers: { 'Content-Type': 'application/merge-patch+json' },
      data: patch,
    });
    expect(axiosMock.__builder.input).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
  });

  test('userDeleteMutation deletes user resource', async () => {
    await userDeleteMutation('user-2');
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'DELETE',
      url: '/apis/iam.miloapis.com/v1alpha1/users/user-2',
    });
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });

  test('userApproveMutation validates typed input', async () => {
    const payload: UserApprove = {
      apiVersion: 'iam.miloapis.com/v1alpha1',
      kind: 'PlatformAccessApproval',
      metadata: { generateName: 'approve-' },
      spec: { subjectRef: { userRef: { name: 'user-1' } }, approverRef: { name: 'admin-1' } },
    };

    await userApproveMutation(payload);
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'POST',
      url: '/apis/iam.miloapis.com/v1alpha1/platformaccessapprovals',
      data: payload,
    });
    expect(axiosMock.__builder.input).toHaveBeenCalledTimes(1);
  });

  test('userRejectMutation validates typed input', async () => {
    const payload: UserReject = {
      apiVersion: 'iam.miloapis.com/v1alpha1',
      kind: 'PlatformAccessRejection',
      metadata: { generateName: 'reject-' },
      spec: { subjectRef: { name: 'user-1' }, reason: 'Insufficient info' },
    };

    await userRejectMutation(payload);
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'POST',
      url: '/apis/iam.miloapis.com/v1alpha1/platformaccessrejections',
      data: payload,
    });
    expect(axiosMock.__builder.input).toHaveBeenCalledTimes(1);
  });

  test('userDeactivateMutation validates typed input', async () => {
    const payload: UserDeactivate = {
      apiVersion: 'iam.miloapis.com/v1alpha1',
      kind: 'UserDeactivation',
      metadata: { generateName: 'deact-' },
      spec: {
        deactivatedBy: 'admin-1',
        description: 'cleanup',
        reason: 'policy',
        userRef: { name: 'user-1' },
      },
    };

    await userDeactivateMutation(payload);
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'POST',
      url: '/apis/iam.miloapis.com/v1alpha1/userdeactivations',
      data: payload,
    });
    expect(axiosMock.__builder.input).toHaveBeenCalledTimes(1);
  });

  test('userReactivateMutation deletes deactivation by id', async () => {
    await userReactivateMutation('user-3');
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'DELETE',
      url: '/apis/iam.miloapis.com/v1alpha1/userdeactivations/user-3',
    });
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });

  test('userInviteMutation validates typed input', async () => {
    const payload: UserInvite = {
      apiVersion: 'iam.miloapis.com/v1alpha1',
      kind: 'PlatformInvitation',
      metadata: { name: 'sample-invitation-8' },
      spec: {
        email: 'jane.doe@example.com',
        familyName: 'Doe',
        givenName: 'Jane',
        scheduleAt: '2025-12-31T21:30:00Z',
      },
    };

    await userInviteMutation(payload);
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'POST',
      url: '/apis/iam.miloapis.com/v1alpha1/platforminvitations',
      data: payload,
    });
    expect(axiosMock.__builder.input).toHaveBeenCalledTimes(1);
  });

  test('userInviteMutation works without scheduleAt', async () => {
    const payload: UserInvite = {
      apiVersion: 'iam.miloapis.com/v1alpha1',
      kind: 'PlatformInvitation',
      metadata: { generateName: 'invitation-' },
      spec: {
        email: 'john.doe@example.com',
        familyName: 'Doe',
        givenName: 'John',
      },
    };

    await userInviteMutation(payload);
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'POST',
      url: '/apis/iam.miloapis.com/v1alpha1/platforminvitations',
      data: payload,
    });
    expect(axiosMock.__builder.input).toHaveBeenCalledTimes(1);
  });
});
