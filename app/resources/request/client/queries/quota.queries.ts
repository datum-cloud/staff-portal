import {
  featureFlagRegistrationListQuery,
  orgQuotaBucketListQuery,
  orgQuotaGrantCreateMutation,
  orgQuotaGrantDeleteMutation,
  orgQuotaGrantListQuery,
  projectQuotaBucketListQuery,
  projectQuotaGrantListQuery,
} from '../apis/quota.api';
import { ListQueryParams } from '@/resources/schemas';
import type { ComMiloapisQuotaV1Alpha1ResourceGrant } from '@openapi/quota.miloapis.com/v1alpha1';
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const quotaQueryKeys = {
  organizations: {
    buckets: {
      all: (orgName: string) => ['organizations', orgName, 'quota', 'buckets'] as const,
      list: (orgName: string, params?: ListQueryParams) =>
        ['organizations', orgName, 'quota', 'buckets', 'list', params] as const,
    },
    grants: {
      all: (orgName: string) => ['organizations', orgName, 'quota', 'grants'] as const,
      list: (orgName: string, params?: ListQueryParams) =>
        ['organizations', orgName, 'quota', 'grants', 'list', params] as const,
    },
  },
  projects: {
    buckets: {
      all: (projectName: string) => ['projects', projectName, 'quota', 'buckets'] as const,
      list: (projectName: string, params?: ListQueryParams) =>
        ['projects', projectName, 'quota', 'buckets', 'list', params] as const,
    },
    grants: {
      all: (projectName: string) => ['projects', projectName, 'quota', 'grants'] as const,
      list: (projectName: string, params?: ListQueryParams) =>
        ['projects', projectName, 'quota', 'grants', 'list', params] as const,
    },
  },
  featureFlags: {
    registrations: {
      all: ['quota', 'feature-flags', 'registrations'] as const,
      list: (params?: ListQueryParams) =>
        ['quota', 'feature-flags', 'registrations', 'list', params] as const,
    },
  },
};

export const useOrgQuotaBucketListQuery = (orgName: string, params?: ListQueryParams) => {
  return useQuery({
    queryKey: quotaQueryKeys.organizations.buckets.list(orgName, params),
    queryFn: () => orgQuotaBucketListQuery(orgName, params),
    enabled: Boolean(orgName),
    staleTime: 60 * 1000,
  });
};

export const useProjectQuotaBucketListQuery = (projectName: string, params?: ListQueryParams) => {
  return useQuery({
    queryKey: quotaQueryKeys.projects.buckets.list(projectName, params),
    queryFn: () => projectQuotaBucketListQuery(projectName, params),
    enabled: Boolean(projectName),
    staleTime: 60 * 1000,
  });
};

export const useOrgQuotaGrantListQuery = (orgName: string, params?: ListQueryParams) => {
  return useQuery({
    queryKey: quotaQueryKeys.organizations.grants.list(orgName, params),
    queryFn: () => orgQuotaGrantListQuery(orgName, params),
    enabled: Boolean(orgName),
    staleTime: 60 * 1000,
  });
};

export const useProjectQuotaGrantListQuery = (projectName: string, params?: ListQueryParams) => {
  return useQuery({
    queryKey: quotaQueryKeys.projects.grants.list(projectName, params),
    queryFn: () => projectQuotaGrantListQuery(projectName, params),
    enabled: Boolean(projectName),
    staleTime: 60 * 1000,
  });
};

// Feature flags are surfaced as ResourceRegistrations labeled
// `app.kubernetes.io/component=feature-flags`. The list is cluster-scoped
// (registrations are shared across all orgs) — per-org enablement state is
// derived from the AllowanceBucket / ResourceGrant lists above.
export const useFeatureFlagRegistrationListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: quotaQueryKeys.featureFlags.registrations.list(params),
    queryFn: () => featureFlagRegistrationListQuery(params),
    staleTime: 60 * 1000,
  });
};

// Brief wait before invalidating after a grant create/delete: the
// AllowanceBucket controller reconciles asynchronously, so an immediate
// refetch usually comes back with stale state. 1s matches the legacy
// timing used by QuotaBucketList / QuotaGrantList.
const GRANT_RECONCILE_WAIT_MS = 1000;

async function invalidateOrgQuotaState(queryClient: QueryClient, orgName: string) {
  await new Promise((resolve) => setTimeout(resolve, GRANT_RECONCILE_WAIT_MS));
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: quotaQueryKeys.organizations.buckets.all(orgName) }),
    queryClient.invalidateQueries({ queryKey: quotaQueryKeys.organizations.grants.all(orgName) }),
  ]);
}

export const useOrgQuotaGrantCreateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orgName,
      namespace,
      payload,
      annotations,
    }: {
      orgName: string;
      namespace: string;
      payload: ComMiloapisQuotaV1Alpha1ResourceGrant['spec'];
      annotations?: Record<string, string>;
    }) => orgQuotaGrantCreateMutation(orgName, namespace, payload, annotations),
    onSuccess: async (_, variables) => {
      await invalidateOrgQuotaState(queryClient, variables.orgName);
    },
  });
};

export const useOrgQuotaGrantDeleteMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orgName,
      name,
      namespace,
    }: {
      orgName: string;
      name: string;
      namespace: string;
    }) => orgQuotaGrantDeleteMutation(orgName, name, namespace),
    onSuccess: async (_, variables) => {
      await invalidateOrgQuotaState(queryClient, variables.orgName);
    },
  });
};
