import { useOrgListQuery } from '@/resources/request/client/organization.request';
import { useProjectListQuery } from '@/resources/request/client/project.request';
import { useUserListQuery } from '@/resources/request/client/user.request';
import * as React from 'react';

export function useUserSearch() {
  const [searchQuery, setSearchQuery] = React.useState('');

  const { data: data, isLoading } = useUserListQuery({
    limit: 50,
    ...(searchQuery && { search: searchQuery }),
  });

  const options = React.useMemo(() => {
    if (!data?.data?.items) return [];
    return data.data.items
      .map((user) => ({
        value: user.metadata.name,
        label: `${user.spec.givenName} ${user.spec.familyName}`,
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
    if (!data?.data?.items) return [];
    return data.data.items
      .map((org) => ({
        value: org.metadata.name,
        label: org.metadata.annotations?.['kubernetes.io/display-name'] || org.metadata.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
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
    if (!data?.data?.items) return [];
    return data.data.items
      .map((project) => ({
        value: project.metadata.name,
        label: project.metadata.annotations?.['kubernetes.io/description'] || project.metadata.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [data]);

  const setSearch = React.useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return { options, isLoading, setSearch };
}
