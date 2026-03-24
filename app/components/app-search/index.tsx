'use client';

import { SearchResultGroup } from './search-result-group';
import { cn } from '@/modules/shadcn/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/modules/shadcn/ui/command';
import { Input } from '@/modules/shadcn/ui/input';
import {
  searchOrganizationsQuery,
  searchProjectsQuery,
  searchUsersQuery,
} from '@/resources/request/client';
import { routes } from '@/utils/config/routes.config';
import { Text } from '@datum-cloud/datum-ui/typography';
import { useLingui } from '@lingui/react/macro';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import {
  ComMiloapisResourcemanagerV1Alpha1Organization,
  ComMiloapisResourcemanagerV1Alpha1Project,
} from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { useQuery } from '@tanstack/react-query';
import { Activity, Building2, FolderOpen, Home, Loader2, SearchIcon, Users } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';

interface Props {
  className?: string;
  placeholder?: string;
}

function AppSearch({ className = '', placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 420 });
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useLingui();
  const searchItems = [
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

  // Cmd+K focuses the search input
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Click outside closes the panel — must exclude the portalled panel itself,
  // otherwise mousedown on a result fires before onSelect and closes the panel.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inInput = containerRef.current?.contains(target);
      const inPanel = panelRef.current?.contains(target);
      if (!inInput && !inPanel) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search input
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

  const runCommand = useCallback((command: () => unknown) => {
    setOpen(false);
    setSearch('');
    inputRef.current?.blur();
    command();
  }, []);

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

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Inline search input */}
      <div className="bg-muted/25 hover:bg-muted/50 text-muted-foreground flex h-8 w-full items-center gap-1.5 rounded-md border px-2 md:w-40 lg:w-56 xl:w-64">
        <SearchIcon className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        <Input
          ref={inputRef}
          className="h-full min-w-0 flex-1 border-0 p-0 shadow-none focus-visible:ring-0"
          placeholder={placeholder ?? t`Search`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => {
            if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              setDropdownPos({
                top: rect.bottom + 4,
                left: rect.left,
                width: Math.max(rect.width, 420),
              });
            }
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              setSearch('');
              inputRef.current?.blur();
            }
          }}
        />
        {!open && (
          <kbd className="bg-muted pointer-events-none hidden h-5 shrink-0 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium select-none sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        )}
      </div>

      {/* Dropdown results panel — portalled to body to escape header stacking context */}
      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="bg-popover text-popover-foreground fixed z-50 rounded-md border shadow-md"
            style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}>
            <Command shouldFilter={false}>
              <CommandList className="max-h-[400px]">
                {(!search || search.length === 0) && (
                  <CommandGroup heading={t`Navigation`}>
                    {searchItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <CommandItem
                          key={item.href}
                          onSelect={() => runCommand(() => navigate(item.href))}>
                          <Icon className="mr-2 h-4 w-4" />
                          <Text>{item.title}</Text>
                          <Text size="xs" textColor="muted" className="ml-auto">
                            {item.description}
                          </Text>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}

                {search && search.length > 0 && search.length < 3 && (
                  <CommandEmpty>{t`Type at least 3 characters to search.`}</CommandEmpty>
                )}

                {search && search.length >= 3 && isLoading && (
                  <CommandEmpty>
                    <Loader2 className="mx-auto mb-1 h-4 w-4 animate-spin opacity-50" />
                    <Text size="sm">{t`Searching...`}</Text>
                  </CommandEmpty>
                )}

                {search && search.length >= 3 && !isLoading && (
                  <>
                    {allError ? (
                      <CommandEmpty>{t`Search is temporarily unavailable. Please try again.`}</CommandEmpty>
                    ) : !hasResults ? (
                      <CommandEmpty>{t`No results found.`}</CommandEmpty>
                    ) : (
                      <>
                        {someError && (
                          <Text size="xs" textColor="muted" className="px-3 py-1.5">
                            {t`Some results may be missing.`}
                          </Text>
                        )}
                        {/* FR-11: Organizations → Projects → Users */}
                        <SearchResultGroup<ComMiloapisResourcemanagerV1Alpha1Organization>
                          heading={t`Organizations`}
                          items={orgResults || []}
                          icon={Building2}
                          getValue={(org) =>
                            `${org.metadata?.name ?? ''} ${getDisplayName(org)} ${org.metadata?.annotations?.['kubernetes.io/description'] ?? ''}`
                          }
                          getTitle={(org) => getDisplayName(org)}
                          getSubtitle={(org) => org.metadata?.name ?? ''}
                          onSelect={(org) =>
                            runCommand(() =>
                              navigate(routes.organizations.detail(org.metadata?.name ?? ''))
                            )
                          }
                        />
                        <SearchResultGroup<ComMiloapisResourcemanagerV1Alpha1Project>
                          heading={t`Projects`}
                          items={projectResults || []}
                          icon={FolderOpen}
                          getValue={(project) =>
                            `${project.metadata?.name ?? ''} ${getDisplayName(project)} ${project.metadata?.annotations?.['kubernetes.io/description'] ?? ''}`
                          }
                          getTitle={(project) => getDisplayName(project)}
                          getSubtitle={(project) => project.metadata?.name ?? ''}
                          onSelect={(project) =>
                            runCommand(() =>
                              navigate(routes.projects.detail(project.metadata?.name ?? ''))
                            )
                          }
                        />
                        <SearchResultGroup<ComMiloapisIamV1Alpha1User>
                          heading={t`Users`}
                          items={userResults || []}
                          icon={Users}
                          getValue={(user) =>
                            `${user.metadata?.name ?? ''} ${user.spec?.givenName ?? ''} ${user.spec?.familyName ?? ''} ${user.spec?.email ?? ''}`
                          }
                          getTitle={(user) =>
                            `${user.spec?.givenName ?? ''} ${user.spec?.familyName ?? ''}`.trim()
                          }
                          getSubtitle={(user) => user.spec?.email ?? ''}
                          onSelect={(user) =>
                            runCommand(() =>
                              navigate(routes.users.detail(user.metadata?.name ?? ''))
                            )
                          }
                        />
                      </>
                    )}
                  </>
                )}
              </CommandList>
            </Command>
          </div>,
          document.body
        )}
    </div>
  );
}

export default AppSearch;
