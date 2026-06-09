import {
  projectDnsListQuery,
  projectDnsRecordListQuery,
  projectDomainListQuery,
  projectExportPolicyListQuery,
  projectEdgeListQuery,
  projectListQuery,
  projectQuery,
} from '../apis/project.api';
import { ListQueryParams } from '@/resources/schemas';
import { useQueries, useQuery } from '@tanstack/react-query';

export const projectQueryKeys = {
  all: ['projects'] as const,
  list: (params?: ListQueryParams) => ['projects', 'list', params] as const,
  detail: (projectName: string) => ['projects', 'detail', projectName] as const,
  domains: {
    all: (projectName: string) => ['projects', projectName, 'domains'] as const,
    list: (projectName: string, params?: ListQueryParams) =>
      ['projects', projectName, 'domains', 'list', params] as const,
  },
  edges: {
    all: (projectName: string) => ['projects', projectName, 'edges'] as const,
    list: (projectName: string, params?: ListQueryParams) =>
      ['projects', projectName, 'edges', 'list', params] as const,
  },
  exportPolicies: {
    all: (projectName: string) => ['projects', projectName, 'export-policies'] as const,
    list: (projectName: string, params?: ListQueryParams) =>
      ['projects', projectName, 'export-policies', 'list', params] as const,
  },
  dns: {
    all: (projectName: string) => ['projects', projectName, 'dns'] as const,
    list: (projectName: string, params?: ListQueryParams) =>
      ['projects', projectName, 'dns', 'list', params] as const,
    records: (projectName: string, dnsName: string, namespace: string = 'default') =>
      ['projects', projectName, 'dns', dnsName, 'records', namespace] as const,
  },
};

export const useProjectDnsRecordListQuery = (
  projectName: string,
  dnsName: string,
  namespace: string = 'default'
) => {
  return useQuery({
    queryKey: projectQueryKeys.dns.records(projectName, dnsName, namespace),
    queryFn: () => projectDnsRecordListQuery(projectName, dnsName, namespace),
    enabled: Boolean(projectName && dnsName),
    staleTime: 60 * 1000,
  });
};

export const useProjectListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: projectQueryKeys.list(params),
    queryFn: () => projectListQuery(params),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Fetches the given projects by name and returns a map of project name to its
 * human-readable display name (the `kubernetes.io/description` annotation),
 * falling back to the project name when no annotation is present.
 */
export const useProjectDisplayNamesQuery = (projectNames: string[]) => {
  const uniqueNames = Array.from(new Set(projectNames.filter(Boolean)));

  const queries = useQueries({
    queries: uniqueNames.map((name) => ({
      queryKey: projectQueryKeys.detail(name),
      queryFn: () => projectQuery(name),
      enabled: !!name,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const displayNames: Record<string, string> = {};
  uniqueNames.forEach((name, index) => {
    const project = queries[index]?.data;
    displayNames[name] = project?.metadata?.annotations?.['kubernetes.io/description'] || name;
  });

  return {
    displayNames,
    isLoading: queries.some((q) => q.isLoading),
  };
};

export const useProjectDomainListQuery = (projectName: string, params?: ListQueryParams) => {
  return useQuery({
    queryKey: projectQueryKeys.domains.list(projectName, params),
    queryFn: () => projectDomainListQuery(projectName, params),
    enabled: Boolean(projectName),
    staleTime: 5 * 60 * 1000,
  });
};

export const useProjectEdgeListQuery = (projectName: string, params?: ListQueryParams) => {
  return useQuery({
    queryKey: projectQueryKeys.edges.list(projectName, params),
    queryFn: () => projectEdgeListQuery(projectName, params),
    enabled: Boolean(projectName),
    staleTime: 5 * 60 * 1000,
  });
};

export const useProjectExportPolicyListQuery = (projectName: string, params?: ListQueryParams) => {
  return useQuery({
    queryKey: projectQueryKeys.exportPolicies.list(projectName, params),
    queryFn: () => projectExportPolicyListQuery(projectName, params),
    enabled: Boolean(projectName),
    staleTime: 5 * 60 * 1000,
  });
};

export const useProjectDnsListQuery = (projectName: string, params?: ListQueryParams) => {
  return useQuery({
    queryKey: projectQueryKeys.dns.list(projectName, params),
    queryFn: () => projectDnsListQuery(projectName, params),
    enabled: Boolean(projectName),
    staleTime: 5 * 60 * 1000,
  });
};
