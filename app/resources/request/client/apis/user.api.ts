import { ListQueryParams } from '@/resources/schemas';
import {
  ComMiloapisIamV1Alpha1User,
  ComMiloapisIamV1Alpha1UserDeactivation,
  createIamMiloapisComV1Alpha1PlatformAccessApproval,
  createIamMiloapisComV1Alpha1PlatformAccessRejection,
  createIamMiloapisComV1Alpha1PlatformInvitation,
  createIamMiloapisComV1Alpha1UserDeactivation,
  deleteIamMiloapisComV1Alpha1PlatformAccessApproval,
  deleteIamMiloapisComV1Alpha1PlatformAccessRejection,
  deleteIamMiloapisComV1Alpha1User,
  deleteIamMiloapisComV1Alpha1UserDeactivation,
  listIamMiloapisComV1Alpha1PlatformAccessApproval,
  listIamMiloapisComV1Alpha1PlatformAccessRejection,
  listIamMiloapisComV1Alpha1User,
  listIamMiloapisComV1Alpha1UserDeactivation,
  patchIamMiloapisComV1Alpha1User,
  readIamMiloapisComV1Alpha1User,
} from '@openapi/iam.miloapis.com/v1alpha1';
import { listNotificationMiloapisComV1Alpha1EmailForAllNamespaces } from '@openapi/notification.miloapis.com/v1alpha1';

export const userGetQuery = async (userId: string): Promise<ComMiloapisIamV1Alpha1User | null> => {
  const response = await readIamMiloapisComV1Alpha1User({
    path: { name: userId },
  });
  return response.data?.data ?? null;
};

export const userListQuery = async (params?: ListQueryParams) => {
  const fieldSelectors: Record<string, string> = {};

  if (params?.search) {
    fieldSelectors['spec.email'] = params.search;
  }

  if (params?.filters?.registrationApproval) {
    fieldSelectors['status.registrationApproval'] = params.filters.registrationApproval;
  }

  const fieldSelectorString =
    Object.keys(fieldSelectors).length > 0
      ? Object.entries(fieldSelectors)
          .map(([key, value]) => `${key}=${value}`)
          .join(',')
      : undefined;

  const response = await listIamMiloapisComV1Alpha1User({
    query: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
      ...(fieldSelectorString && { fieldSelector: fieldSelectorString }),
    },
  });
  return response.data.data;
};

export const userFindApprovalQuery = async (userId: string) => {
  const response = await listIamMiloapisComV1Alpha1PlatformAccessApproval({
    query: {
      limit: 1,
      fieldSelector: `spec.subjectRef.userRef.name=${userId}`,
    },
  });

  return response.data.data?.items?.[0] ?? null;
};

export const userFindRejectionQuery = async (userId: string) => {
  const response = await listIamMiloapisComV1Alpha1PlatformAccessRejection({
    query: {
      limit: 1,
      fieldSelector: `spec.subjectRef.name=${userId}`,
    },
  });

  return response.data.data?.items?.[0] ?? null;
};

export const userUpdateMutation = async (
  userId: string,
  payload: Partial<ComMiloapisIamV1Alpha1User['spec']>
) => {
  const response = await patchIamMiloapisComV1Alpha1User({
    path: { name: userId },
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

export const userUpdatePreferencesMutation = async (
  userId: string,
  payload: Partial<ComMiloapisIamV1Alpha1User['metadata']>
) => {
  const response = await patchIamMiloapisComV1Alpha1User({
    path: { name: userId },
    query: {
      fieldManager: 'datum-staff-portal',
    },
    headers: {
      'Content-Type': 'application/merge-patch+json',
    },
    body: {
      apiVersion: 'iam.miloapis.com/v1alpha1',
      kind: 'User',
      metadata: payload,
    },
  });
  return response.data.data;
};

export const userDeleteMutation = async (userId: string) => {
  return deleteIamMiloapisComV1Alpha1User({
    path: { name: userId },
  });
};

export const userInviteMutation = async (payload: any) => {
  const response = await createIamMiloapisComV1Alpha1PlatformInvitation({
    body: payload,
  });
  return response.data.data;
};

export const userApproveMutation = async (payload: any) => {
  const response = await createIamMiloapisComV1Alpha1PlatformAccessApproval({
    body: payload,
  });
  return response.data.data;
};

export const userDeleteApprovalMutation = async (approvalName: string) => {
  return deleteIamMiloapisComV1Alpha1PlatformAccessApproval({
    path: { name: approvalName },
  });
};

export const userRejectMutation = async (payload: any) => {
  const response = await createIamMiloapisComV1Alpha1PlatformAccessRejection({
    body: payload,
  });
  return response.data.data;
};

export const userDeleteRejectionMutation = async (rejectionName: string) => {
  return deleteIamMiloapisComV1Alpha1PlatformAccessRejection({
    path: { name: rejectionName },
  });
};

export const userDeactivateMutation = async (
  payload: ComMiloapisIamV1Alpha1UserDeactivation['spec']
) => {
  const response = await createIamMiloapisComV1Alpha1UserDeactivation({
    body: {
      apiVersion: 'iam.miloapis.com/v1alpha1',
      kind: 'UserDeactivation',
      metadata: {
        generateName: 'user-deactivation-',
      },
      spec: payload,
    },
  });
  return response.data.data;
};

export const userReactivateMutation = async (userId: string) => {
  return deleteIamMiloapisComV1Alpha1UserDeactivation({
    path: { name: userId },
  });
};

export const userEmailListQuery = async (
  userId: string,
  userEmail: string,
  params?: ListQueryParams
) => {
  const listByEmail = await listNotificationMiloapisComV1Alpha1EmailForAllNamespaces({
    query: {
      limit: params?.limit,
      continue: params?.cursor,
      fieldSelector: `spec.recipient.emailAddress=${userEmail}`,
    },
  });

  const listByUser = await listNotificationMiloapisComV1Alpha1EmailForAllNamespaces({
    query: {
      limit: params?.limit,
      continue: params?.cursor,
      fieldSelector: `spec.recipient.userRef.name=${userId}`,
    },
  });

  return {
    ...listByEmail.data.data,
    items: [...(listByEmail.data.data?.items ?? []), ...(listByUser.data.data?.items ?? [])],
  };
};

export const userDeactivationQuery = async (userId: string) => {
  const response = await listIamMiloapisComV1Alpha1UserDeactivation({
    query: {
      limit: 1,
      fieldSelector: `spec.userRef.name=${userId}`,
    },
  });

  const data = response.data.data?.items?.[0] ?? null;
  return { ...response, data };
};
