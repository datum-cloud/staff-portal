import { ListQueryParams } from '@/resources/schemas';
import {
  ComMiloapisNotificationV1Alpha1ContactGroup,
  ComMiloapisNotificationV1Alpha1ContactGroupMembership,
  createNotificationMiloapisComV1Alpha1NamespacedContactGroup,
  createNotificationMiloapisComV1Alpha1NamespacedContactGroupMembership,
  deleteNotificationMiloapisComV1Alpha1NamespacedContactGroup,
  deleteNotificationMiloapisComV1Alpha1NamespacedContactGroupMembership,
  listNotificationMiloapisComV1Alpha1ContactGroupForAllNamespaces,
  patchNotificationMiloapisComV1Alpha1NamespacedContactGroup,
  readNotificationMiloapisComV1Alpha1NamespacedContactGroup,
} from '@openapi/notification.miloapis.com/v1alpha1';

export const contactGroupListQuery = async (params?: ListQueryParams) => {
  const response = await listNotificationMiloapisComV1Alpha1ContactGroupForAllNamespaces({
    query: {
      limit: params?.limit,
      continue: params?.cursor,
      ...(params?.search && { fieldSelector: `metadata.name=${params.search}` }),
    },
  });
  return response.data.data;
};

export const contactGroupDetailQuery = async (name: string, namespace: string = 'default') => {
  const response = await readNotificationMiloapisComV1Alpha1NamespacedContactGroup({
    path: { namespace, name },
  });
  return response.data.data;
};

export const contactGroupCreateMutation = async (
  namespace: string = 'default',
  payload: ComMiloapisNotificationV1Alpha1ContactGroup['spec']
) => {
  const response = await createNotificationMiloapisComV1Alpha1NamespacedContactGroup({
    path: { namespace },
    body: {
      apiVersion: 'notification.miloapis.com/v1alpha1',
      kind: 'ContactGroup',
      metadata: {
        generateName: 'contact-group-',
        namespace,
      },
      spec: payload,
    },
  });
  return response.data.data;
};

export const contactGroupUpdateMutation = async (
  metadata: ComMiloapisNotificationV1Alpha1ContactGroup['metadata'],
  payload: ComMiloapisNotificationV1Alpha1ContactGroup['spec']
) => {
  const response = await patchNotificationMiloapisComV1Alpha1NamespacedContactGroup({
    path: { namespace: metadata?.namespace ?? '', name: metadata?.name ?? '' },
    query: {
      fieldManager: 'datum-staff-portal',
    },
    headers: {
      'Content-Type': 'application/merge-patch+json',
    },
    body: {
      spec: payload,
    },
  });
  return response.data.data;
};

export const contactGroupDeleteMutation = (
  metadata: ComMiloapisNotificationV1Alpha1ContactGroup['metadata']
) => {
  return deleteNotificationMiloapisComV1Alpha1NamespacedContactGroup({
    path: {
      namespace: metadata?.namespace ?? '',
      name: metadata?.name ?? '',
    },
  });
};

export const contactGroupMembershipCreateMutation = async (
  namespace: string = 'default',
  payload: ComMiloapisNotificationV1Alpha1ContactGroupMembership['spec']
) => {
  const response = await createNotificationMiloapisComV1Alpha1NamespacedContactGroupMembership({
    path: { namespace },
    body: {
      apiVersion: 'notification.miloapis.com/v1alpha1',
      kind: 'ContactGroupMembership',
      metadata: { generateName: 'contact-group-membership-', namespace },
      spec: payload,
    },
  });
  return response.data.data;
};

export const contactGroupMembershipDeleteMutation = (
  metadata: ComMiloapisNotificationV1Alpha1ContactGroupMembership['metadata']
) => {
  return deleteNotificationMiloapisComV1Alpha1NamespacedContactGroupMembership({
    path: { namespace: metadata?.namespace ?? '', name: metadata?.name ?? '' },
  });
};
