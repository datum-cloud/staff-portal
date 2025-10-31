import type { GroupMembershipCreate } from '@/resources/schemas';
import {
  importAfterMocks,
  mockLogger,
  mockRequestClient,
} from '@/tests/setup/unit/request-client.mock';
import { describe, expect, test, vi, beforeEach } from 'vitest';

mockLogger();
const axiosMock = mockRequestClient();

describe('group.request', () => {
  let groupListQuery: typeof import('./group.request').groupListQuery;
  let groupMembershipListQuery: typeof import('./group.request').groupMembershipListQuery;
  let groupMembershipDeleteMutation: typeof import('./group.request').groupMembershipDeleteMutation;
  let groupMembershipCreateMutation: typeof import('./group.request').groupMembershipCreateMutation;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await importAfterMocks<typeof import('@/resources/request/client/group.request')>(
      '@/resources/request/client/group.request'
    );
    groupListQuery = mod.groupListQuery;
    groupMembershipListQuery = mod.groupMembershipListQuery;
    groupMembershipDeleteMutation = mod.groupMembershipDeleteMutation;
    groupMembershipCreateMutation = mod.groupMembershipCreateMutation;
  }, 20000);

  test('groupListQuery builds params', async () => {
    await groupListQuery({ limit: 15, cursor: 'c2' });
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/iam.miloapis.com/v1alpha1/groups',
      params: { limit: 15, continue: 'c2' },
    });
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });

  test('groupMembershipListQuery with fieldSelector', async () => {
    await groupMembershipListQuery({
      limit: 5,
      cursor: 'n1',
      filters: { fieldSelector: 'spec.groupRef.name=g1' },
    });
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/iam.miloapis.com/v1alpha1/groupmemberships',
      params: { limit: 5, continue: 'n1', fieldSelector: 'spec.groupRef.name=g1' },
    });
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });

  test('groupMembershipDeleteMutation', async () => {
    await groupMembershipDeleteMutation('gm-1', 'milo-system');
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'DELETE',
      url: '/apis/iam.miloapis.com/v1alpha1/namespaces/milo-system/groupmemberships/gm-1',
    });
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });

  test('groupMembershipCreateMutation posts typed payload', async () => {
    const payload: GroupMembershipCreate = {
      apiVersion: 'iam.miloapis.com/v1alpha1',
      kind: 'GroupMembership',
      metadata: { namespace: 'milo-system', generateName: 'gm-' },
      spec: { groupRef: { name: 'g1' }, userRef: { name: 'u1' } },
    };
    await groupMembershipCreateMutation(payload, 'milo-system');
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'POST',
      url: '/apis/iam.miloapis.com/v1alpha1/namespaces/milo-system/groupmemberships',
      data: payload,
    });
    expect(axiosMock.__builder.input).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
  });
});
