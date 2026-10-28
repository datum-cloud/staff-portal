import { SearchResultGroup } from './search-result-group';
import type { useAppSearch } from './use-app-search';
import { routes } from '@/utils/config/routes.config';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@datum-cloud/datum-ui/command';
import { Text } from '@datum-cloud/datum-ui/typography';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import {
  ComMiloapisResourcemanagerV1Alpha1Organization,
  ComMiloapisResourcemanagerV1Alpha1Project,
} from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { Building2, FolderOpen, Loader2, Users } from 'lucide-react';

type SearchState = ReturnType<typeof useAppSearch>;

interface SearchResultsProps {
  state: SearchState;
  listClassName?: string;
}

export function SearchResults({ state, listClassName }: SearchResultsProps) {
  const {
    search,
    quickLinks,
    userResults,
    orgResults,
    projectResults,
    isLoading,
    allError,
    someError,
    hasResults,
    runCommand,
    navigate,
    getDisplayName,
    t,
  } = state;

  return (
    <Command shouldFilter={false}>
      <CommandList className={listClassName}>
        {(!search || search.length === 0) && (
          <CommandGroup heading={t`Navigation`}>
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem key={item.href} onSelect={() => runCommand(() => navigate(item.href))}>
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
                    runCommand(() => navigate(routes.projects.detail(project.metadata?.name ?? '')))
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
                    runCommand(() => navigate(routes.users.detail(user.metadata?.name ?? '')))
                  }
                />
              </>
            )}
          </>
        )}
      </CommandList>
    </Command>
  );
}
