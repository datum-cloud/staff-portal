import type {
  ContactGroupCreate,
  ContactGroupUpdate,
  ContactGroupMembershipCreate,
} from '@/resources/schemas';
import {
  importAfterMocks,
  mockLogger,
  mockRequestClient,
} from '@/tests/setup/unit/request-client.mock';
import { describe, expect, test, vi, beforeEach } from 'vitest';

mockLogger();
const axiosMock = mockRequestClient();

describe('contact-group.request', () => {
  let contactGroupListQuery: typeof import('./contact-group.request').contactGroupListQuery;
  let contactGroupCreateMutation: typeof import('./contact-group.request').contactGroupCreateMutation;
  let contactGroupUpdateMutation: typeof import('./contact-group.request').contactGroupUpdateMutation;
  let contactGroupDeleteMutation: typeof import('./contact-group.request').contactGroupDeleteMutation;
  let contactGroupMembershipListQuery: typeof import('./contact-group.request').contactGroupMembershipListQuery;
  let contactGroupMembershipCreateMutation: typeof import('./contact-group.request').contactGroupMembershipCreateMutation;
  let contactGroupMembershipDeleteMutation: typeof import('./contact-group.request').contactGroupMembershipDeleteMutation;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await importAfterMocks<
      typeof import('@/resources/request/client/contact-group.request')
    >('@/resources/request/client/contact-group.request');
    contactGroupListQuery = mod.contactGroupListQuery;
    contactGroupCreateMutation = mod.contactGroupCreateMutation;
    contactGroupUpdateMutation = mod.contactGroupUpdateMutation;
    contactGroupDeleteMutation = mod.contactGroupDeleteMutation;
    contactGroupMembershipListQuery = mod.contactGroupMembershipListQuery;
    contactGroupMembershipCreateMutation = mod.contactGroupMembershipCreateMutation;
    contactGroupMembershipDeleteMutation = mod.contactGroupMembershipDeleteMutation;
  }, 20000);

  test('contactGroupListQuery builds params', async () => {
    await contactGroupListQuery({ limit: 20, cursor: 'c1' });
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/notification.miloapis.com/v1alpha1/contactgroups',
      params: { limit: 20, continue: 'c1' },
    });
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });

  test('contactGroupCreateMutation posts typed payload', async () => {
    const payload: ContactGroupCreate = {
      apiVersion: 'notification.miloapis.com/v1alpha1',
      kind: 'ContactGroup',
      metadata: { namespace: 'default', generateName: 'cg-' },
      spec: { displayName: 'desc' },
    };
    await contactGroupCreateMutation(payload, 'org-x');
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'POST',
      url: '/apis/notification.miloapis.com/v1alpha1/namespaces/org-x/contactgroups',
      data: payload,
    });
    expect(axiosMock.__builder.input).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
  });

  test('contactGroupUpdateMutation patches typed payload', async () => {
    const patch: ContactGroupUpdate = {
      apiVersion: 'notification.miloapis.com/v1alpha1',
      kind: 'ContactGroup',
      metadata: { namespace: 'default' },
      spec: { displayName: 'updated' },
    };
    await contactGroupUpdateMutation('cg-1', patch, 'org-x');
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'PATCH',
      url: '/apis/notification.miloapis.com/v1alpha1/namespaces/org-x/contactgroups/cg-1',
      params: { fieldManager: 'datum-staff-portal' },
      headers: { 'Content-Type': 'application/merge-patch+json' },
      data: patch,
    });
    expect(axiosMock.__builder.input).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
  });

  test('contactGroupDeleteMutation', async () => {
    await contactGroupDeleteMutation('cg-1', 'org-x');
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'DELETE',
      url: '/apis/notification.miloapis.com/v1alpha1/namespaces/org-x/contactgroups/cg-1',
    });
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });

  test('contactGroupMembershipListQuery with fieldSelector', async () => {
    await contactGroupMembershipListQuery({
      limit: 10,
      cursor: 'n2',
      filters: { fieldSelector: 'spec.contactGroupRef.name=cg-1' },
    });
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/notification.miloapis.com/v1alpha1/contactgroupmemberships',
      params: { limit: 10, continue: 'n2', fieldSelector: 'spec.contactGroupRef.name=cg-1' },
    });
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });

  test('contactGroupMembershipCreateMutation', async () => {
    const payload: ContactGroupMembershipCreate = {
      apiVersion: 'notification.miloapis.com/v1alpha1',
      kind: 'ContactGroupMembership',
      metadata: { namespace: 'default', generateName: 'cgm-' },
      spec: {
        contactGroupRef: { name: 'cg-1', namespace: 'default' },
        contactRef: { name: 'c-1', namespace: 'default' },
      },
    };
    await contactGroupMembershipCreateMutation(payload, 'org-x');
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'POST',
      url: '/apis/notification.miloapis.com/v1alpha1/namespaces/org-x/contactgroupmemberships',
      data: payload,
    });
    expect(axiosMock.__builder.input).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
  });

  test('contactGroupMembershipDeleteMutation', async () => {
    await contactGroupMembershipDeleteMutation('cgm-1', 'org-x');
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'DELETE',
      url: '/apis/notification.miloapis.com/v1alpha1/namespaces/org-x/contactgroupmemberships/cgm-1',
    });
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });
});
