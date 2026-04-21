import {
  searchOrganizationsQuery,
  searchProjectsQuery,
  searchUsersQuery,
} from '@/resources/request/client';
import { routes } from '@/utils/config/routes.config';
import { useLingui } from '@lingui/react/macro';
import { useQuery } from '@tanstack/react-query';
import { Activity, Building2, FolderOpen, Home, LucideIcon, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

export interface QuickLink {
  title: string;
  icon: LucideIcon;
  href: string;
  description: string;
}

export function useAppSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const navigate = useNavigate();
  const { t } = useLingui();

  const quickLinks: QuickLink[] = [
    { title: t`Dashboard`, icon: Home, href: routes.dashboard(), description: t`Go to dashboard` },
    { title: t`Users`, icon: Users, href: routes.users.list(), description: t`Manage users` },
    {
      title: t`Organizations`,
      icon: Building2,
      href: routes.organizations.list(),
      description: t`Manage organizations`,
    },
    {
      title: t`Projects`,
      icon: FolderOpen,
      href: routes.projects.list(),
      description: t`Manage projects`,
    },
    {
      title: t`Activity`,
      icon: Activity,
      href: routes.activity.root(),
      description: t`View activity logs`,
    },
  ];

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  const queryOptions = {
    enabled: open && debouncedSearch.length >= 3,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: false,
  };

  const {
    data: userResults,
    isLoading: usersLoading,
    isError: usersError,
  } = useQuery({
    queryKey: ['search', 'users', debouncedSearch],
    queryFn: () => searchUsersQuery(debouncedSearch),
    ...queryOptions,
  });

  const {
    data: orgResults,
    isLoading: orgsLoading,
    isError: orgsError,
  } = useQuery({
    queryKey: ['search', 'organizations', debouncedSearch],
    queryFn: () => searchOrganizationsQuery(debouncedSearch),
    ...queryOptions,
  });

  const {
    data: projectResults,
    isLoading: projectsLoading,
    isError: projectsError,
  } = useQuery({
    queryKey: ['search', 'projects', debouncedSearch],
    queryFn: () => searchProjectsQuery(debouncedSearch),
    ...queryOptions,
  });

  const runCommand = useCallback(
    (command: () => unknown) => {
      setOpen(false);
      setSearch('');
      command();
    },
    [setOpen, setSearch]
  );

  const isLoading = usersLoading || orgsLoading || projectsLoading;
  const allError = usersError && orgsError && projectsError;
  const someError = (usersError || orgsError || projectsError) && !allError;
  const hasResults =
    (userResults?.length ?? 0) > 0 ||
    (orgResults?.length ?? 0) > 0 ||
    (projectResults?.length ?? 0) > 0;

  const getDisplayName = (item: {
    metadata?: { name?: string; annotations?: Record<string, string> };
  }) => item.metadata?.annotations?.['kubernetes.io/display-name'] || item.metadata?.name || '';

  return {
    open,
    setOpen,
    search,
    setSearch,
    quickLinks,
    userResults,
    orgResults,
    projectResults,
    isLoading,
    allError: !!allError,
    someError: !!someError,
    hasResults,
    runCommand,
    navigate,
    getDisplayName,
    t,
  };
}
