import { ListQueryParams } from '@/resources/schemas';
import {
  createNotificationMiloapisComV1Alpha1NamespacedContact,
  deleteNotificationMiloapisComV1Alpha1NamespacedContact,
  listNotificationMiloapisComV1Alpha1ContactForAllNamespaces,
  patchNotificationMiloapisComV1Alpha1NamespacedContact,
  readNotificationMiloapisComV1Alpha1NamespacedContact,
  type ComMiloapisNotificationV1Alpha1Contact,
} from '@openapi/notification.miloapis.com/v1alpha1';

export const contactListQuery = async (params?: ListQueryParams<{ fieldSelector?: string }>) => {
  const fieldSelector =
    params?.filters?.fieldSelector ?? (params?.search ? `spec.email=${params.search}` : undefined);

  const response = await listNotificationMiloapisComV1Alpha1ContactForAllNamespaces({
    query: {
      limit: params?.limit,
      continue: params?.cursor,
      ...(fieldSelector && { fieldSelector }),
    },
  });
  return response.data.data;
};

export const contactDetailQuery = async (name: string, namespace: string = 'default') => {
  const response = await readNotificationMiloapisComV1Alpha1NamespacedContact({
    path: { namespace, name },
  });
  return response.data.data;
};

export const contactCreateMutation = async (
  namespace: string = 'default',
  payload: ComMiloapisNotificationV1Alpha1Contact['spec']
) => {
  const response = await createNotificationMiloapisComV1Alpha1NamespacedContact({
    path: { namespace },
    body: {
      apiVersion: 'notification.miloapis.com/v1alpha1',
      kind: 'Contact',
      metadata: {
        generateName: 'contact-',
        namespace,
      },
      spec: payload,
    },
  });
  return response.data.data;
};

export const contactUpdateMutation = async (
  metadata: ComMiloapisNotificationV1Alpha1Contact['metadata'],
  payload: Partial<ComMiloapisNotificationV1Alpha1Contact['spec']>
) => {
  const response = await patchNotificationMiloapisComV1Alpha1NamespacedContact({
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

export const contactDeleteMutation = (
  metadata: ComMiloapisNotificationV1Alpha1Contact['metadata']
) => {
  return deleteNotificationMiloapisComV1Alpha1NamespacedContact({
    path: {
      namespace: metadata?.namespace ?? '',
      name: metadata?.name ?? '',
    },
  });
};
