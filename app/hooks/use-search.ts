import { listOrganizations } from '@/modules/graphql/organizations';
import { listProjects } from '@/modules/graphql/projects';
import {
  useContactGroupListQuery,
  useContactListQuery,
  userListQuery,
  organizationQueryKeys,
  projectQueryKeys,
} from '@/resources/request/client';
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';

export function useUserSearch() {
  const [searchQuery, setSearchQuery] = React.useState('');

  const params = {
    limit: 50,
    ...(searchQuery && { search: searchQuery }),
  };
  const { data: data, isLoading } = useQuery({
    queryKey: ['users', 'list', params],
    queryFn: () => userListQuery(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!searchQuery,
  });

  const options = React.useMemo(() => {
    if (!data?.items) return [];
    return data.items
      .map((user) => ({
        value: user.metadata?.name ?? '',
        label: `${user.spec?.givenName ?? ''} ${user.spec?.familyName ?? ''}`,
        description: user.spec?.email ?? '',
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [data]);

  const setSearch = React.useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return { options, isLoading, setSearch };
}

export function useOrganizationSearch(minChars = 2) {
  // SearchableFilterGroup already debounces onSearchChange; keep this as the
  // query that actually hits the network (no second debounce).
  const [searchQuery, setSearchQuery] = React.useState('');
  const trimmed = searchQuery.trim();
  const enabled = trimmed.length >= minChars;

  const { data, isFetching, isLoading } = useQuery({
    queryKey: organizationQueryKeys.list({ limit: 50, search: trimmed }),
    queryFn: () => listOrganizations({ limit: 50, search: trimmed }),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const options = React.useMemo(() => {
    if (!enabled || !data?.items) return [];
    return data.items
      .map((org) => {
        const label = org.contactInfo?.businessName || org.displayName || org.name;
        return {
          value: org.name,
          label,
          searchText: [org.contactInfo?.businessName, org.displayName, org.name]
            .filter(Boolean)
            .join(' '),
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [data, enabled]);

  const setSearch = React.useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return {
    options,
    isLoading: enabled && (isLoading || isFetching),
    setSearch,
  };
}

export function useProjectSearch(minChars = 2) {
  // SearchableFilterGroup debounces onSearchChange; this is the query that hits
  // the network (no second debounce).
  const [searchQuery, setSearchQuery] = React.useState('');
  const trimmed = searchQuery.trim();
  const enabled = trimmed.length >= minChars;

  const { data, isFetching, isLoading } = useQuery({
    queryKey: projectQueryKeys.list({ limit: 50, search: trimmed }),
    queryFn: () => listProjects({ limit: 50, search: trimmed }),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const options = React.useMemo(() => {
    if (!enabled || !data?.items) return [];
    return data.items
      .map((project) => ({
        value: project.name,
        label: project.displayName || project.name,
        searchText: [project.displayName, project.name].filter(Boolean).join(' '),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [data, enabled]);

  const setSearch = React.useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return {
    options,
    isLoading: enabled && (isLoading || isFetching),
    setSearch,
  };
}

export function useContactSearch() {
  const [searchQuery, setSearchQuery] = React.useState('');

  const { data: data, isLoading } = useContactListQuery({
    limit: 50,
    ...(searchQuery && { search: searchQuery }),
  });

  const options = React.useMemo(() => {
    if (!data?.items) return [];
    return data.items
      .map((c) => ({
        value: [c.metadata?.name ?? '', c.metadata?.namespace ?? 'default'].join('|'),
        label: `${c.spec?.givenName} ${c.spec?.familyName}`.trim() || (c.metadata?.name ?? ''),
        description: c.spec?.email ?? '',
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [data]);

  const setSearch = React.useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return { options, isLoading, setSearch, searchQuery };
}

export function useContactGroupSearch() {
  const [searchQuery, setSearchQuery] = React.useState('');

  const { data: data, isLoading } = useContactGroupListQuery({
    ...(searchQuery && { search: searchQuery }),
  });

  const options = React.useMemo(() => {
    if (!data?.items) return [];
    return data.items
      .map((c) => ({
        value: [c.metadata?.name ?? '', c.metadata?.namespace ?? 'default'].join('|'),
        label: c.spec?.displayName ?? '',
        description: c.spec?.description ?? '',
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [data]);

  const setSearch = React.useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return { options, isLoading, setSearch };
}
