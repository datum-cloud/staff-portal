import { type GroupedSearchResults, searchAllQuery } from '@/resources/request/client';
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

const EMPTY: GroupedSearchResults = {
  users: [],
  organizations: [],
  projects: [],
  domains: [],
  dnsZones: [],
  contacts: [],
};

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

  const {
    data: results,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['search', 'all', debouncedSearch],
    queryFn: () => searchAllQuery(debouncedSearch),
    enabled: open && debouncedSearch.length >= 3,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const runCommand = useCallback(
    (command: () => unknown) => {
      setOpen(false);
      setSearch('');
      command();
    },
    [setOpen, setSearch]
  );

  const { users, organizations, projects, domains, dnsZones, contacts } = results ?? EMPTY;

  const hasEntityResults = users.length > 0 || organizations.length > 0 || projects.length > 0;

  const hasResourceResults = domains.length > 0 || dnsZones.length > 0 || contacts.length > 0;

  const hasResults = hasEntityResults || hasResourceResults;

  const getDisplayName = (item: {
    metadata?: { name?: string; annotations?: Record<string, string> };
  }) => item.metadata?.annotations?.['kubernetes.io/display-name'] || item.metadata?.name || '';

  return {
    open,
    setOpen,
    search,
    setSearch,
    quickLinks,
    // Results
    userResults: users,
    orgResults: organizations,
    projectResults: projects,
    domainResults: domains,
    dnsZoneResults: dnsZones,
    contactResults: contacts,
    // State
    isLoading,
    isError,
    hasResults,
    hasEntityResults,
    hasResourceResults,
    runCommand,
    navigate,
    getDisplayName,
  };
}
