import {
  useContactGroupListQuery,
  useContactListQuery,
  useOrgListQuery,
  useProjectListQuery,
  userListQuery,
  useUserListQuery,
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

export function useOrganizationSearch() {
  const [searchQuery, setSearchQuery] = React.useState('');

  const { data: data, isLoading } = useOrgListQuery({
    limit: 50,
    ...(searchQuery && { search: searchQuery }),
  });

  const options = React.useMemo(() => {
    if (!data?.items) return [];
    return data.items
      .map((org) => ({
        value: org.metadata?.name ?? '',
        label:
          org.metadata?.annotations?.['kubernetes.io/display-name'] || (org.metadata?.name ?? ''),
      }))
      .sort((a, b) => a.label?.localeCompare(b.label ?? '') ?? 0);
  }, [data]);

  const setSearch = React.useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return { options, isLoading, setSearch };
}

export function useProjectSearch() {
  const [searchQuery, setSearchQuery] = React.useState('');

  const { data: data, isLoading } = useProjectListQuery({
    limit: 50,
    ...(searchQuery && { search: searchQuery }),
  });

  const options = React.useMemo(() => {
    if (!data?.items) return [];
    return data.items
      .map((project) => ({
        value: project.metadata?.name ?? '',
        label:
          project.metadata?.annotations?.['kubernetes.io/description'] ||
          (project.metadata?.name ?? ''),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [data]);

  const setSearch = React.useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return { options, isLoading, setSearch };
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
