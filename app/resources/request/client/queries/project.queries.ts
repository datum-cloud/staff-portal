import {
  projectDnsListQuery,
  projectDnsRecordListQuery,
  projectDomainListQuery,
  projectExportPolicyListQuery,
  projectEdgeListQuery,
  projectGetQuery,
  projectSuspensionForProjectListQuery,
  projectSuspensionListQuery,
} from '../apis/project.api';
import { isProjectDeleting } from '@/features/project/lib/project-phase';
import { listAllProjects, listProjects } from '@/modules/graphql/projects';
import { ListQueryParams } from '@/resources/schemas';
import type { ComMiloapisResourcemanagerV1Alpha1Project } from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { useQuery } from '@tanstack/react-query';

export const projectQueryKeys = {
  all: ['projects'] as const,
  detail: (projectName: string) => ['projects', projectName, 'detail'] as const,
  list: (params?: ListQueryParams) => ['projects', 'list', params] as const,
  listAll: (search?: string) => ['projects', 'list-all', search ?? ''] as const,
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
  suspensions: (projectName: string) => ['projects', projectName, 'suspensions'] as const,
  suspensionsAll: () => ['projects', 'suspensions', 'all'] as const,
};

/** All ProjectSuspensions (active + lifted) governing a project — for the suspension panel. */
export const useProjectSuspensionsQuery = (projectName: string) => {
  return useQuery({
    queryKey: projectQueryKeys.suspensions(projectName),
    queryFn: () => projectSuspensionForProjectListQuery(projectName),
    enabled: !!projectName,
  });
};

/** Every ProjectSuspension across all projects — joined into the Projects list for the Suspended status. */
export const useAllProjectSuspensionsQuery = () => {
  return useQuery({
    queryKey: projectQueryKeys.suspensionsAll(),
    queryFn: () => projectSuspensionListQuery(),
    staleTime: 60 * 1000,
  });
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

const PROJECT_DELETION_POLL_MS = 10_000;

/** Live project object; polls while the project is terminating. `null` data means gone. */
export const useLiveProject = (initial: ComMiloapisResourcemanagerV1Alpha1Project | undefined) => {
  const projectName = initial?.metadata?.name ?? '';
  const query = useQuery({
    queryKey: projectQueryKeys.detail(projectName),
    queryFn: () => projectGetQuery(projectName),
    enabled: Boolean(projectName),
    initialData: initial,
    refetchInterval: (query) => {
      const current = query.state.data;
      if (!current) return false;
      return isProjectDeleting(current) ? PROJECT_DELETION_POLL_MS : false;
    },
  });

  return {
    project: query.data === null ? undefined : (query.data ?? initial),
    isGone: query.data === null,
  };
};

export const useProjectListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: projectQueryKeys.list(params),
    queryFn: () => listProjects(params),
    staleTime: 5 * 60 * 1000,
  });
};

/** Full cross-org project list (walks continueToken) — for views needing a true total. */
export const useAllProjectsQuery = (search: string = '') => {
  return useQuery({
    queryKey: projectQueryKeys.listAll(search),
    queryFn: () => listAllProjects(search),
    staleTime: 5 * 60 * 1000,
  });
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
