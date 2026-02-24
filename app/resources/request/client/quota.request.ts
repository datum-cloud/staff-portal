import { PROXY_URL } from '@/modules/axios/axios.client';
import { ListQueryParams } from '@/resources/schemas';
import {
  ComMiloapisQuotaV1Alpha1AllowanceBucket,
  ComMiloapisQuotaV1Alpha1ResourceClaim,
  ComMiloapisQuotaV1Alpha1ResourceGrant,
  createQuotaMiloapisComV1Alpha1NamespacedResourceGrant,
  deleteQuotaMiloapisComV1Alpha1NamespacedAllowanceBucket,
  deleteQuotaMiloapisComV1Alpha1NamespacedResourceClaim,
  deleteQuotaMiloapisComV1Alpha1NamespacedResourceGrant,
  listQuotaMiloapisComV1Alpha1NamespacedAllowanceBucket,
  listQuotaMiloapisComV1Alpha1NamespacedResourceClaim,
  listQuotaMiloapisComV1Alpha1NamespacedResourceGrant,
  listQuotaMiloapisComV1Alpha1ResourceRegistration,
  readQuotaMiloapisComV1Alpha1NamespacedAllowanceBucket,
  readQuotaMiloapisComV1Alpha1NamespacedResourceClaim,
  readQuotaMiloapisComV1Alpha1NamespacedResourceGrant,
  readQuotaMiloapisComV1Alpha1ResourceRegistration,
} from '@openapi/quota.miloapis.com/v1alpha1';

const MILO_SYSTEM_NAMESPACE = 'milo-system';

// Helper to build control-plane baseURL
const getProjectControlPlaneBaseURL = (projectName: string) =>
  `${PROXY_URL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane`;

const getOrgControlPlaneBaseURL = (orgName: string) =>
  `${PROXY_URL}/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${orgName}/control-plane`;

// ------------------------
// ResourceRegistrations
// ------------------------
export const quotaRegistrationListQuery = async (
  params?: ListQueryParams & { fieldSelector?: string; labelSelector?: string }
) => {
  const response = await listQuotaMiloapisComV1Alpha1ResourceRegistration({
    query: {
      limit: params?.limit,
      continue: params?.cursor,
      ...(params?.fieldSelector && { fieldSelector: params.fieldSelector }),
      ...(params?.labelSelector && { labelSelector: params.labelSelector }),
    },
  });
  return response.data.data;
};

export const quotaRegistrationDetailQuery = async (name: string) => {
  const response = await readQuotaMiloapisComV1Alpha1ResourceRegistration({
    path: { name },
  });
  return response.data.data;
};

// ------------------------
// ResourceGrants
// ------------------------
export const quotaGrantListQuery = async (
  namespace: string,
  params?: ListQueryParams & { fieldSelector?: string; labelSelector?: string; baseURL?: string }
) => {
  const response = await listQuotaMiloapisComV1Alpha1NamespacedResourceGrant({
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

export const quotaGrantDetailQuery = async (
  metadata: ComMiloapisQuotaV1Alpha1ResourceGrant['metadata']
) => {
  // Grants are namespaced (namespace is typically the organization namespace)
  const response = await readQuotaMiloapisComV1Alpha1NamespacedResourceGrant({
    path: { namespace: metadata?.namespace ?? '', name: metadata?.name ?? '' },
  });
  return response.data.data;
};

// Convenience: list grants for a specific Organization consumer
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

  return quotaGrantListQuery(orgName, {
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
  namespace: string,
  payload: ComMiloapisQuotaV1Alpha1ResourceGrant['spec']
) => {
  const response = await createQuotaMiloapisComV1Alpha1NamespacedResourceGrant({
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

export const quotaGrantDeleteMutation = async (name: string, namespace: string = 'default') => {
  return deleteQuotaMiloapisComV1Alpha1NamespacedResourceGrant({
    path: { namespace, name },
  });
};

// ------------------------
// AllowanceBuckets
// ------------------------
export const quotaBucketListQuery = async (
  namespace: string,
  params?: ListQueryParams & { fieldSelector?: string; labelSelector?: string; baseURL?: string }
) => {
  const response = await listQuotaMiloapisComV1Alpha1NamespacedAllowanceBucket({
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

export const quotaBucketDetailQuery = async (
  metadata: ComMiloapisQuotaV1Alpha1AllowanceBucket['metadata']
) => {
  // Note: OpenAPI has namespaced version, using default namespace
  // Buckets are typically cluster-scoped (one per consumer+resourceType), exposed by name
  const response = await readQuotaMiloapisComV1Alpha1NamespacedAllowanceBucket({
    path: { namespace: metadata?.namespace ?? '', name: metadata?.name ?? '' },
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

  return quotaBucketListQuery(orgName, {
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

export const quotaBucketDeleteMutation = async (
  metadata: ComMiloapisQuotaV1Alpha1AllowanceBucket['metadata']
) => {
  // Note: OpenAPI has namespaced version, using default namespace
  // Buckets are typically cluster-scoped, but OpenAPI requires namespace
  return deleteQuotaMiloapisComV1Alpha1NamespacedAllowanceBucket({
    path: { namespace: metadata?.namespace ?? '', name: metadata?.name ?? '' },
  });
};

// ------------------------
// ResourceClaims
// ------------------------
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

export const quotaClaimDetailQuery = async (
  metadata: ComMiloapisQuotaV1Alpha1ResourceClaim['metadata']
) => {
  // Claims are generally namespaced
  const response = await readQuotaMiloapisComV1Alpha1NamespacedResourceClaim({
    path: { namespace: metadata?.namespace ?? '', name: metadata?.name ?? '' },
  });
  return response.data.data;
};

export const orgQuotaClaimListQuery = (
  orgName: string,
  params?: ListQueryParams & { resourceType?: string; labelSelector?: string }
) => {
  const parts = [`spec.consumerRef.kind=Organization`, `spec.consumerRef.name=${orgName}`];
  // Filter by request resourceType if provided (server-side may ignore; client can post-filter)
  if (params?.resourceType) parts.push(`spec.requests.resourceType=${params.resourceType}`);

  return quotaClaimListQuery(orgName, {
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

export const quotaClaimDeleteMutation = async (
  metadata: ComMiloapisQuotaV1Alpha1ResourceClaim['metadata']
) => {
  // Claims are generally namespaced
  return deleteQuotaMiloapisComV1Alpha1NamespacedResourceClaim({
    path: { namespace: metadata?.namespace ?? '', name: metadata?.name ?? '' },
  });
};
