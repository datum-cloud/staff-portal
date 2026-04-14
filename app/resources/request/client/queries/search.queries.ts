import {
  searchOrganizationsQuery,
  searchProjectsQuery,
  searchUsersQuery,
} from '../apis/search.api';
import { useQuery } from '@tanstack/react-query';

export const searchQueryKeys = {
  all: ['search'] as const,
  users: {
    list: (query: string) => ['search', 'users', query] as const,
  },
  organizations: {
    list: (query: string) => ['search', 'organizations', query] as const,
  },
  projects: {
    list: (query: string) => ['search', 'projects', query] as const,
  },
};

export const useSearchUsersQuery = (query: string, minLength: number = 2) => {
  return useQuery({
    queryKey: searchQueryKeys.users.list(query),
    queryFn: () => searchUsersQuery(query),
    enabled: query.length >= minLength,
    staleTime: 30 * 1000,
  });
};

export const useSearchOrganizationsQuery = (query: string, minLength: number = 3) => {
  return useQuery({
    queryKey: searchQueryKeys.organizations.list(query),
    queryFn: () => searchOrganizationsQuery(query),
    enabled: query.length >= minLength,
    staleTime: 30 * 1000,
  });
};

export const useSearchProjectsQuery = (query: string, minLength: number = 3) => {
  return useQuery({
    queryKey: searchQueryKeys.projects.list(query),
    queryFn: () => searchProjectsQuery(query),
    enabled: query.length >= minLength,
    staleTime: 30 * 1000,
  });
};
