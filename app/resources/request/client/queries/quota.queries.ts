import {
  orgQuotaBucketListQuery,
  orgQuotaGrantListQuery,
  projectQuotaBucketListQuery,
  projectQuotaGrantListQuery,
} from '../apis/quota.api';
import { ListQueryParams } from '@/resources/schemas';
import { useQuery } from '@tanstack/react-query';

export const quotaQueryKeys = {
  organizations: {
    buckets: {
      list: (orgName: string, params?: ListQueryParams) =>
        ['organizations', orgName, 'quota', 'buckets', 'list', params] as const,
    },
    grants: {
      list: (orgName: string, params?: ListQueryParams) =>
        ['organizations', orgName, 'quota', 'grants', 'list', params] as const,
    },
  },
  projects: {
    buckets: {
      list: (projectName: string, params?: ListQueryParams) =>
        ['projects', projectName, 'quota', 'buckets', 'list', params] as const,
    },
    grants: {
      list: (projectName: string, params?: ListQueryParams) =>
        ['projects', projectName, 'quota', 'grants', 'list', params] as const,
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
