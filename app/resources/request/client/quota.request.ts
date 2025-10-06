import { apiRequestClient } from '@/modules/axios/axios.client';
import {
  AllowanceBucketListResponseSchema,
  AllowanceBucketResponseSchema,
  ListQueryParams,
  ResourceGrantCreate,
  ResourceGrantCreateSchema,
  ResourceGrantListResponseSchema,
  ResourceGrantResponseSchema,
} from '@/resources/schemas';
import { z } from 'zod';

// Generic helpers for optional selectors
const buildCommonParams = (
  params?: ListQueryParams & {
    fieldSelector?: string;
    labelSelector?: string;
  }
) => ({
  ...(params?.limit && { limit: params.limit }),
  ...(params?.cursor && { continue: params.cursor }),
  ...(params?.fieldSelector && { fieldSelector: params.fieldSelector }),
  ...(params?.labelSelector && { labelSelector: params.labelSelector }),
});

// ------------------------
// ResourceRegistrations
// ------------------------
export const quotaRegistrationListQuery = (
  params?: ListQueryParams & { fieldSelector?: string; labelSelector?: string }
) => {
  return (
    apiRequestClient({
      method: 'GET',
      url: '/apis/quota.miloapis.com/v1alpha1/resourceregistrations',
      params: buildCommonParams(params),
    })
      // TODO: replace z.any() with concrete schema when available
      .output(z.any())
      .execute()
  );
};

export const quotaRegistrationDetailQuery = (name: string) => {
  return apiRequestClient({
    method: 'GET',
    url: `/apis/quota.miloapis.com/v1alpha1/resourceregistrations/${name}`,
  })
    .output(z.any())
    .execute();
};

// ------------------------
// ResourceGrants
// ------------------------
export const quotaGrantListQuery = (
  params?: ListQueryParams & { fieldSelector?: string; labelSelector?: string }
) => {
  return apiRequestClient({
    method: 'GET',
    url: '/apis/quota.miloapis.com/v1alpha1/resourcegrants',
    params: buildCommonParams(params),
  })
    .output(ResourceGrantListResponseSchema)
    .execute();
};

export const quotaGrantDetailQuery = (name: string, namespace: string = 'default') => {
  // Grants are namespaced (namespace is typically the organization namespace)
  return apiRequestClient({
    method: 'GET',
    url: `/apis/quota.miloapis.com/v1alpha1/namespaces/${namespace}/resourcegrants/${name}`,
  })
    .output(ResourceGrantResponseSchema)
    .execute();
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

  return quotaGrantListQuery({
    ...params,
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

  return quotaGrantListQuery({
    ...params,
    fieldSelector: fieldSelectorParts.join(','),
  });
};

export const quotaGrantCreateMutation = (payload: ResourceGrantCreate) => {
  return apiRequestClient({
    method: 'POST',
    url: `/apis/quota.miloapis.com/v1alpha1/namespaces/${payload.metadata.namespace}/resourcegrants`,
    data: payload,
  })
    .input(ResourceGrantCreateSchema)
    .execute();
};

export const quotaGrantDeleteMutation = (name: string, namespace: string = 'default') => {
  return apiRequestClient({
    method: 'DELETE',
    url: `/apis/quota.miloapis.com/v1alpha1/namespaces/${namespace}/resourcegrants/${name}`,
  }).execute();
};

// ------------------------
// AllowanceBuckets
// ------------------------
export const quotaBucketListQuery = (
  params?: ListQueryParams & { fieldSelector?: string; labelSelector?: string }
) => {
  return apiRequestClient({
    method: 'GET',
    url: '/apis/quota.miloapis.com/v1alpha1/allowancebuckets',
    params: buildCommonParams(params),
  })
    .output(AllowanceBucketListResponseSchema)
    .execute();
};

export const quotaBucketDetailQuery = (name: string) => {
  // Buckets are cluster-scoped (one per consumer+resourceType), exposed by name
  return apiRequestClient({
    method: 'GET',
    url: `/apis/quota.miloapis.com/v1alpha1/allowancebuckets/${name}`,
  })
    .output(AllowanceBucketResponseSchema)
    .execute();
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

  return quotaBucketListQuery({
    ...params,
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

  return quotaBucketListQuery({
    ...params,
    fieldSelector: fieldSelectorParts.join(','),
  });
};

export const quotaBucketDeleteMutation = (name: string) => {
  // Buckets are cluster-scoped, so no namespace needed
  return apiRequestClient({
    method: 'DELETE',
    url: `/apis/quota.miloapis.com/v1alpha1/allowancebuckets/${name}`,
  }).execute();
};

// ------------------------
// ResourceClaims
// ------------------------
export const quotaClaimListQuery = (
  params?: ListQueryParams & { fieldSelector?: string; labelSelector?: string }
) => {
  return apiRequestClient({
    method: 'GET',
    url: '/apis/quota.miloapis.com/v1alpha1/resourceclaims',
    params: buildCommonParams(params),
  })
    .output(z.any())
    .execute();
};

export const quotaClaimDetailQuery = (name: string, namespace: string = 'default') => {
  // Claims are generally namespaced
  return apiRequestClient({
    method: 'GET',
    url: `/apis/quota.miloapis.com/v1alpha1/namespaces/${namespace}/resourceclaims/${name}`,
  })
    .output(z.any())
    .execute();
};

export const orgQuotaClaimListQuery = (
  orgName: string,
  params?: ListQueryParams & { resourceType?: string; labelSelector?: string }
) => {
  const parts = [`spec.consumerRef.kind=Organization`, `spec.consumerRef.name=${orgName}`];
  // Filter by request resourceType if provided (server-side may ignore; client can post-filter)
  if (params?.resourceType) parts.push(`spec.requests.resourceType=${params.resourceType}`);

  return quotaClaimListQuery({
    ...params,
    fieldSelector: parts.join(','),
  });
};

export const projectQuotaClaimListQuery = (
  projectName: string,
  params?: ListQueryParams & { resourceType?: string; labelSelector?: string }
) => {
  const parts = [`spec.consumerRef.kind=Project`, `spec.consumerRef.name=${projectName}`];
  if (params?.resourceType) parts.push(`spec.requests.resourceType=${params.resourceType}`);

  return quotaClaimListQuery({
    ...params,
    fieldSelector: parts.join(','),
  });
};

export const quotaClaimDeleteMutation = (name: string, namespace: string = 'default') => {
  // Claims are generally namespaced
  return apiRequestClient({
    method: 'DELETE',
    url: `/apis/quota.miloapis.com/v1alpha1/namespaces/${namespace}/resourceclaims/${name}`,
  }).execute();
};
