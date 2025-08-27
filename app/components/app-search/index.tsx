'use client';

import { SearchResultGroup } from './search-result-group';
import { cn } from '@/modules/shadcn/lib/utils';
import { Button } from '@/modules/shadcn/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/modules/shadcn/ui/command';
import { orgListQuery, projectListQuery, userListQuery } from '@/resources/request/client';
import { Organization, Project, User } from '@/resources/schemas';
import { routes } from '@/utils/config/routes.config';
import { Text } from '@datum-ui/typography';
import { useLingui } from '@lingui/react/macro';
import { useQuery } from '@tanstack/react-query';
import { Activity, Building2, FolderOpen, Home, Loader2, SearchIcon, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

interface Props {
  className?: string;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
}

// Define search items using route configuration
const searchItems = [
  {
    title: 'Dashboard',
    icon: Home,
    href: routes.dashboard(),
    description: 'Go to dashboard',
  },
  {
    title: 'Users',
    icon: Users,
    href: routes.users.list(),
    description: 'Manage users',
  },
  {
    title: 'Organizations',
    icon: Building2,
    href: routes.organizations.list(),
    description: 'Manage organizations',
  },
  {
    title: 'Projects',
    icon: FolderOpen,
    href: routes.projects.list(),
    description: 'Manage projects',
  },
  {
    title: 'Activity',
    icon: Activity,
    href: routes.activity(),
    description: 'View activity logs',
  },
];

function AppSearch({ className = '', placeholder = 'Search' }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const navigate = useNavigate();
  const { t } = useLingui();

  // Handle keyboard shortcut (Cmd+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  // Centralized search queries
  const { data: orgs, isLoading: orgsLoading } = useQuery({
    queryKey: ['orgs', 'search', debouncedSearch],
    queryFn: () => orgListQuery({ search: debouncedSearch, limit: 5 }),
    enabled: open && debouncedSearch.length > 0,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', 'search', debouncedSearch],
    queryFn: () => projectListQuery({ search: debouncedSearch, limit: 5 }),
    enabled: open && debouncedSearch.length > 0,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users', 'search', debouncedSearch],
    queryFn: () => userListQuery({ search: debouncedSearch, limit: 5 }),
    enabled: open && debouncedSearch.length > 0,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const runCommand = useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  // Calculate overall state
  const isLoading = orgsLoading || projectsLoading || usersLoading;
  const hasResults =
    (orgs?.data?.items?.length ?? 0) +
      (projects?.data?.items?.length ?? 0) +
      (users?.data?.items?.length ?? 0) >
    0;

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          'bg-muted/25 text-muted-foreground hover:bg-muted/50 relative h-8 w-full flex-1 justify-start rounded-md text-sm font-normal shadow-none sm:pr-12 md:w-40 md:flex-none lg:w-56 xl:w-64',
          className
        )}
        onClick={() => setOpen(true)}>
        <SearchIcon aria-hidden="true" className="absolute top-1/2 left-1.5 -translate-y-1/2" />
        <span className="ml-3">{placeholder}</span>
        <kbd className="bg-muted pointer-events-none absolute top-[0.3rem] right-[0.3rem] hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder={t`Type a command or search...`}
          value={search}
          onValueChange={handleSearchChange}
        />
        <CommandList>
          {(!search || search.length === 0) && (
            <CommandGroup heading={t`Navigation`}>
              {searchItems.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.href}
                    onSelect={() => runCommand(() => navigate(item.href))}>
                    <Icon className="mr-2 h-4 w-4" />
                    <Text>{t`${item.title}`}</Text>
                    <Text size="xs" textColor="muted" className="ml-auto">
                      {item.description}
                    </Text>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {search && search.length > 0 && (
            <>
              {isLoading ? (
                <CommandEmpty>
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <Text>{t`Searching...`}</Text>
                  </div>
                </CommandEmpty>
              ) : !hasResults ? (
                <CommandEmpty>{t`No results found.`}</CommandEmpty>
              ) : (
                <>
                  {/* Organizations */}
                  <SearchResultGroup<Organization>
                    heading="Organizations"
                    items={orgs?.data?.items || []}
                    icon={Building2}
                    getValue={(org) =>
                      `${org.metadata.name} ${org.metadata.annotations?.['kubernetes.io/display-name'] ?? ''}`
                    }
                    getTitle={(org) =>
                      org.metadata.annotations?.['kubernetes.io/display-name'] || org.metadata.name
                    }
                    getSubtitle={(org) => org.metadata.name}
                    onSelect={(org) =>
                      runCommand(() => navigate(routes.organizations.detail(org.metadata.name)))
                    }
                  />

                  {/* Projects */}
                  <SearchResultGroup<Project>
                    heading="Projects"
                    items={projects?.data?.items || []}
                    icon={FolderOpen}
                    getValue={(project) =>
                      `${project.metadata.name} ${project.metadata.annotations?.['kubernetes.io/description'] ?? ''}`
                    }
                    getTitle={(project) =>
                      project.metadata.annotations?.['kubernetes.io/description'] ||
                      project.metadata.name
                    }
                    getSubtitle={(project) => project.metadata.name}
                    onSelect={(project) =>
                      runCommand(() => navigate(routes.projects.detail(project.metadata.name)))
                    }
                  />

                  {/* Users */}
                  <SearchResultGroup<User>
                    heading="Users"
                    items={users?.data?.items || []}
                    icon={Users}
                    getValue={(user) =>
                      `${user.metadata.name} ${user.spec.givenName} ${user.spec.familyName} ${user.spec.email}`
                    }
                    getTitle={(user) => `${user.spec.givenName} ${user.spec.familyName}`}
                    getSubtitle={(user) => user.spec.email}
                    onSelect={(user) =>
                      runCommand(() => navigate(routes.users.detail(user.metadata.name)))
                    }
                  />
                </>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

export default AppSearch;
