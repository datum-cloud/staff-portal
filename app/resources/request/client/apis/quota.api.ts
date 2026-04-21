import { PROXY_URL } from '@/modules/axios/axios.client';
import { ListQueryParams } from '@/resources/schemas';
import {
  ComMiloapisQuotaV1Alpha1ResourceGrant,
  createQuotaMiloapisComV1Alpha1NamespacedResourceGrant,
  deleteQuotaMiloapisComV1Alpha1NamespacedResourceGrant,
  listQuotaMiloapisComV1Alpha1NamespacedAllowanceBucket,
  listQuotaMiloapisComV1Alpha1NamespacedResourceClaim,
  listQuotaMiloapisComV1Alpha1NamespacedResourceGrant,
} from '@openapi/quota.miloapis.com/v1alpha1';

const MILO_SYSTEM_NAMESPACE = 'milo-system';

const getProjectControlPlaneBaseURL = (projectName: string) =>
  `${PROXY_URL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane`;

const getOrgControlPlaneBaseURL = (orgName: string) =>
  `${PROXY_URL}/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${orgName}/control-plane`;

export const quotaGrantListQuery = async (
  namespace: string,
  params?: ListQueryParams & { fieldSelector?: string; labelSelector?: string; baseURL?: string }
) => {
  const response = await listQuotaMiloapisComV1Alpha1NamespacedResourceGrant({
    ...(params?.baseURL && { baseURL: params.baseURL }),
    path: { namespace },
    query: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
      ...(params?.fieldSelector && { fieldSelector: params.fieldSelector }),
      ...(params?.labelSelector && { labelSelector: params.labelSelector }),
    },
  });
  return response.data.data;
};

export const orgQuotaGrantListQuery = (
  orgName: string,
  params?: ListQueryParams & { resourceType?: string; labelSelector?: string }
) => {
  const fieldSelectorParts = [
    `spec.consumerRef.kind=Organization`,
    `spec.consumerRef.name=${orgName}`,
  ];
  if (params?.resourceType)
    fieldSelectorParts.push(`spec.allowances.resourceType=${params.resourceType}`);

  return quotaGrantListQuery(`organization-${orgName}`, {
    ...params,
    baseURL: getOrgControlPlaneBaseURL(orgName),
    fieldSelector: fieldSelectorParts.join(','),
  });
};

export const projectQuotaGrantListQuery = (
  projectName: string,
  params?: ListQueryParams & { resourceType?: string; labelSelector?: string }
) => {
  const fieldSelectorParts = [
    `spec.consumerRef.kind=Project`,
    `spec.consumerRef.name=${projectName}`,
  ];
  if (params?.resourceType)
    fieldSelectorParts.push(`spec.allowances.resourceType=${params.resourceType}`);

  return quotaGrantListQuery(MILO_SYSTEM_NAMESPACE, {
    ...params,
    baseURL: getProjectControlPlaneBaseURL(projectName),
    fieldSelector: fieldSelectorParts.join(','),
  });
};

export const quotaGrantCreateMutation = async (
  baseURL: string,
  namespace: string,
  payload: ComMiloapisQuotaV1Alpha1ResourceGrant['spec']
) => {
  const response = await createQuotaMiloapisComV1Alpha1NamespacedResourceGrant({
    baseURL,
    path: { namespace },
    body: {
      apiVersion: 'quota.miloapis.com/v1alpha1',
      kind: 'ResourceGrant',
      metadata: {
        generateName: 'resource-grant-',
        namespace,
      },
      spec: payload,
    },
  });
  return response.data.data;
};

export const orgQuotaGrantCreateMutation = async (
  orgName: string,
  namespace: string,
  payload: ComMiloapisQuotaV1Alpha1ResourceGrant['spec']
) => {
  return quotaGrantCreateMutation(getOrgControlPlaneBaseURL(orgName), namespace, payload);
};

export const projectQuotaGrantCreateMutation = async (
  projectName: string,
  namespace: string,
  payload: ComMiloapisQuotaV1Alpha1ResourceGrant['spec']
) => {
  return quotaGrantCreateMutation(getProjectControlPlaneBaseURL(projectName), namespace, payload);
};

export const quotaGrantDeleteMutation = async (
  baseURL: string,
  name: string,
  namespace: string = 'default'
) => {
  return deleteQuotaMiloapisComV1Alpha1NamespacedResourceGrant({
    baseURL,
    path: { namespace, name },
  });
};

export const orgQuotaGrantDeleteMutation = async (
  orgName: string,
  name: string,
  namespace: string = 'default'
) => {
  return quotaGrantDeleteMutation(getOrgControlPlaneBaseURL(orgName), name, namespace);
};

export const projectQuotaGrantDeleteMutation = async (
  projectName: string,
  name: string,
  namespace: string = 'default'
) => {
  return quotaGrantDeleteMutation(getProjectControlPlaneBaseURL(projectName), name, namespace);
};

export const quotaBucketListQuery = async (
  namespace: string,
  params?: ListQueryParams & { fieldSelector?: string; labelSelector?: string; baseURL?: string }
) => {
  const response = await listQuotaMiloapisComV1Alpha1NamespacedAllowanceBucket({
    ...(params?.baseURL && { baseURL: params.baseURL }),
    path: { namespace },
    query: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
      ...(params?.fieldSelector && { fieldSelector: params.fieldSelector }),
      ...(params?.labelSelector && { labelSelector: params.labelSelector }),
    },
  });
  return response.data.data;
};

export const orgQuotaBucketListQuery = (
  orgName: string,
  params?: ListQueryParams & { resourceType?: string; labelSelector?: string }
) => {
  const fieldSelectorParts = [
    `spec.consumerRef.kind=Organization`,
    `spec.consumerRef.name=${orgName}`,
  ];
  if (params?.resourceType) fieldSelectorParts.push(`spec.resourceType=${params.resourceType}`);

  return quotaBucketListQuery(`organization-${orgName}`, {
    ...params,
    baseURL: getOrgControlPlaneBaseURL(orgName),
    fieldSelector: fieldSelectorParts.join(','),
  });
};

export const projectQuotaBucketListQuery = (
  projectName: string,
  params?: ListQueryParams & { resourceType?: string; labelSelector?: string }
) => {
  const fieldSelectorParts = [
    `spec.consumerRef.kind=Project`,
    `spec.consumerRef.name=${projectName}`,
  ];
  if (params?.resourceType) fieldSelectorParts.push(`spec.resourceType=${params.resourceType}`);

  return quotaBucketListQuery(MILO_SYSTEM_NAMESPACE, {
    ...params,
    baseURL: getProjectControlPlaneBaseURL(projectName),
    fieldSelector: fieldSelectorParts.join(','),
  });
};

export const quotaClaimListQuery = async (
  namespace: string,
  params?: ListQueryParams & { fieldSelector?: string; labelSelector?: string; baseURL?: string }
) => {
  const response = await listQuotaMiloapisComV1Alpha1NamespacedResourceClaim({
    ...(params?.baseURL && { baseURL: params.baseURL }),
    path: { namespace },
    query: {
      limit: params?.limit,
      continue: params?.cursor,
      ...(params?.fieldSelector && { fieldSelector: params.fieldSelector }),
      ...(params?.labelSelector && { labelSelector: params.labelSelector }),
    },
  });
  return response.data.data;
};

export const orgQuotaClaimListQuery = (
  orgName: string,
  params?: ListQueryParams & { resourceType?: string; labelSelector?: string }
) => {
  const parts = [`spec.consumerRef.kind=Organization`, `spec.consumerRef.name=${orgName}`];
  if (params?.resourceType) parts.push(`spec.requests.resourceType=${params.resourceType}`);

  return quotaClaimListQuery(`organization-${orgName}`, {
    ...params,
    baseURL: getOrgControlPlaneBaseURL(orgName),
    fieldSelector: parts.join(','),
  });
};

export const projectQuotaClaimListQuery = (
  projectName: string,
  params?: ListQueryParams & { resourceType?: string; labelSelector?: string }
) => {
  const parts = [`spec.consumerRef.kind=Project`, `spec.consumerRef.name=${projectName}`];
  if (params?.resourceType) parts.push(`spec.requests.resourceType=${params.resourceType}`);

  return quotaClaimListQuery(MILO_SYSTEM_NAMESPACE, {
    ...params,
    baseURL: getProjectControlPlaneBaseURL(projectName),
    fieldSelector: parts.join(','),
  });
};
