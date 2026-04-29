import { SearchResultGroup } from './search-result-group';
import type { useAppSearch } from './use-app-search';
import type { SearchResultItem } from '@/resources/request/client';
import { contactRoutes, projectRoutes, routes } from '@/utils/config/routes.config';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@datum-cloud/datum-ui/command';
import { Text } from '@datum-cloud/datum-ui/typography';
import { useLingui } from '@lingui/react/macro';
import { ComMiloapisNetworkingDnsV1Alpha1DnsZone } from '@openapi/dns.networking.miloapis.com/v1alpha1';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import { ComDatumapisNetworkingV1AlphaDomain } from '@openapi/networking.datumapis.com/v1alpha';
import { ComMiloapisNotificationV1Alpha1Contact } from '@openapi/notification.miloapis.com/v1alpha1';
import {
  ComMiloapisResourcemanagerV1Alpha1Organization,
  ComMiloapisResourcemanagerV1Alpha1Project,
} from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { Building2, Contact, FolderOpen, Globe, Loader2, Server, Users } from 'lucide-react';
import { Link } from 'react-router';

type SearchState = ReturnType<typeof useAppSearch>;

interface SearchResultsProps {
  state: SearchState;
  listClassName?: string;
}

function SeeAllLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="text-primary hover:text-primary/80 block p-2 text-xs">
      {label} →
    </Link>
  );
}

export function SearchResults({ state, listClassName }: SearchResultsProps) {
  const { t } = useLingui();
  const {
    search,
    quickLinks,
    userResults,
    orgResults,
    projectResults,
    domainResults,
    dnsZoneResults,
    contactResults,
    isLoading,
    isError,
    hasResults,
    hasEntityResults,
    hasResourceResults,
    runCommand,
    navigate,
    getDisplayName,
  } = state;

  const getDomainStatus = (domain: ComDatumapisNetworkingV1AlphaDomain) => {
    const conditions = domain.status?.conditions ?? [];
    const verified = conditions.find((c) => c.type === 'Verified');
    return verified?.status === 'True' ? 'Registered' : 'Pending';
  };

  const getDomainRegistrar = (domain: ComDatumapisNetworkingV1AlphaDomain) =>
    domain.status?.registration?.registrar?.name ?? '';

  const getDnsRecordCount = (zone: ComMiloapisNetworkingDnsV1Alpha1DnsZone) => {
    const count = zone.status?.recordCount ?? 0;
    return `${count} record${count !== 1 ? 's' : ''}`;
  };

  const getDnsStatus = (zone: ComMiloapisNetworkingDnsV1Alpha1DnsZone) => {
    const conditions = zone.status?.conditions ?? [];
    const ready = conditions.find((c) => c.type === 'Ready');
    return ready?.status === 'True' ? 'Active' : 'Pending';
  };

  // Project name lives in `tenant.name` for project-scoped results.
  // tenant.type case has been observed as both "project" and "Project".
  const getProjectName = (item: { tenant?: { name?: string; type?: string } }): string =>
    item.tenant?.type?.toLowerCase() === 'project' ? (item.tenant?.name ?? '') : '';

  // Search response strips metadata.namespace; default to "default" to match
  // server-side request modules (projectDnsDetailQuery / projectDomainDetailQuery).
  const getNamespace = (metadata: { namespace?: string } | undefined): string =>
    metadata?.namespace ?? 'default';

  const getItemKey = <T extends { metadata?: { name?: string } }>(item: SearchResultItem<T>) =>
    item.resource.metadata?.name ?? '';

  return (
    <Command shouldFilter={false}>
      <CommandList className={listClassName}>
        {/* Empty state — quick links */}
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

        {/* Min chars hint */}
        {search && search.length > 0 && search.length < 3 && (
          <CommandEmpty>{t`Type at least 3 characters to search.`}</CommandEmpty>
        )}

        {/* Loading */}
        {search && search.length >= 3 && isLoading && (
          <CommandEmpty>
            <Loader2 className="mx-auto mb-1 h-4 w-4 animate-spin opacity-50" />
            <Text size="sm">{t`Searching...`}</Text>
          </CommandEmpty>
        )}

        {/* Results */}
        {search && search.length >= 3 && !isLoading && (
          <>
            {isError ? (
              <CommandEmpty>{t`Search is temporarily unavailable. Please try again.`}</CommandEmpty>
            ) : !hasResults ? (
              <CommandEmpty>{t`No results found.`}</CommandEmpty>
            ) : (
              <>
                {/* ── Entities section ── */}
                {hasEntityResults && (
                  <>
                    <Text
                      as="p"
                      size="xs"
                      textColor="muted"
                      weight="semibold"
                      className="px-3 pt-3 pb-1 tracking-wider uppercase">
                      {t`Entities`}
                    </Text>

                    <SearchResultGroup<
                      SearchResultItem<ComMiloapisResourcemanagerV1Alpha1Organization>
                    >
                      heading={t`Organizations`}
                      items={orgResults || []}
                      icon={Building2}
                      getKey={getItemKey}
                      getValue={(item) =>
                        `${item.resource.metadata?.name ?? ''} ${getDisplayName(item.resource)} ${item.resource.metadata?.annotations?.['kubernetes.io/description'] ?? ''}`
                      }
                      getTitle={(item) => getDisplayName(item.resource)}
                      getSubtitle={(item) => item.resource.metadata?.name ?? ''}
                      onSelect={(item) =>
                        runCommand(() =>
                          navigate(routes.organizations.detail(item.resource.metadata?.name ?? ''))
                        )
                      }
                    />
                    <SearchResultGroup<SearchResultItem<ComMiloapisResourcemanagerV1Alpha1Project>>
                      heading={t`Projects`}
                      items={projectResults || []}
                      icon={FolderOpen}
                      getKey={getItemKey}
                      getValue={(item) =>
                        `${item.resource.metadata?.name ?? ''} ${getDisplayName(item.resource)} ${item.resource.metadata?.annotations?.['kubernetes.io/description'] ?? ''}`
                      }
                      getTitle={(item) => getDisplayName(item.resource)}
                      getSubtitle={(item) => item.resource.metadata?.name ?? ''}
                      onSelect={(item) =>
                        runCommand(() =>
                          navigate(routes.projects.detail(item.resource.metadata?.name ?? ''))
                        )
                      }
                    />
                    <SearchResultGroup<SearchResultItem<ComMiloapisIamV1Alpha1User>>
                      heading={t`Users`}
                      items={userResults || []}
                      icon={Users}
                      getKey={getItemKey}
                      getValue={(item) =>
                        `${item.resource.metadata?.name ?? ''} ${item.resource.spec?.givenName ?? ''} ${item.resource.spec?.familyName ?? ''} ${item.resource.spec?.email ?? ''}`
                      }
                      getTitle={(item) =>
                        `${item.resource.spec?.givenName ?? ''} ${item.resource.spec?.familyName ?? ''}`.trim()
                      }
                      getSubtitle={(item) => item.resource.spec?.email ?? ''}
                      onSelect={(item) =>
                        runCommand(() =>
                          navigate(routes.users.detail(item.resource.metadata?.name ?? ''))
                        )
                      }
                    />
                  </>
                )}

                {/* ── Resources section ── */}
                {hasResourceResults && (
                  <>
                    <Text
                      as="p"
                      size="xs"
                      textColor="muted"
                      weight="semibold"
                      className="px-3 pt-3 pb-1 tracking-wider uppercase">
                      {t`Resources`}
                    </Text>

                    <SearchResultGroup<SearchResultItem<ComDatumapisNetworkingV1AlphaDomain>>
                      heading={t`Domains`}
                      items={(domainResults || []).slice(0, 3)}
                      icon={Globe}
                      iconClassName="text-green-600"
                      getKey={getItemKey}
                      getValue={(item) =>
                        `${item.resource.metadata?.name ?? ''} ${item.resource.spec?.domainName ?? ''}`
                      }
                      getTitle={(item) =>
                        item.resource.spec?.domainName ?? item.resource.metadata?.name ?? ''
                      }
                      getSubtitle={(item) =>
                        [getDomainStatus(item.resource), getDomainRegistrar(item.resource)]
                          .filter(Boolean)
                          .join(' \u2022 ')
                      }
                      onSelect={(item) =>
                        runCommand(() => {
                          const projectName = getProjectName(item);
                          const namespace = getNamespace(item.resource.metadata);
                          navigate(
                            projectRoutes.domain.detail(
                              projectName,
                              namespace,
                              item.resource.metadata?.name ?? ''
                            )
                          );
                        })
                      }
                      footer={
                        (domainResults?.length ?? 0) > 3 ? (
                          <SeeAllLink to="/customers/projects" label={t`See all domains`} />
                        ) : null
                      }
                    />

                    <SearchResultGroup<SearchResultItem<ComMiloapisNetworkingDnsV1Alpha1DnsZone>>
                      heading={t`DNS Zones`}
                      items={(dnsZoneResults || []).slice(0, 3)}
                      icon={Server}
                      iconClassName="text-blue-600"
                      getKey={getItemKey}
                      getValue={(item) =>
                        `${item.resource.metadata?.name ?? ''} ${item.resource.spec?.domainName ?? ''}`
                      }
                      getTitle={(item) =>
                        item.resource.spec?.domainName ?? item.resource.metadata?.name ?? ''
                      }
                      getSubtitle={(item) =>
                        [getDnsRecordCount(item.resource), getDnsStatus(item.resource)].join(
                          ' \u2022 '
                        )
                      }
                      onSelect={(item) =>
                        runCommand(() => {
                          const projectName = getProjectName(item);
                          const namespace = getNamespace(item.resource.metadata);
                          navigate(
                            projectRoutes.dns.detail(
                              projectName,
                              namespace,
                              item.resource.metadata?.name ?? ''
                            )
                          );
                        })
                      }
                      footer={
                        (dnsZoneResults?.length ?? 0) > 3 ? (
                          <SeeAllLink to="/customers/projects" label={t`See all DNS zones`} />
                        ) : null
                      }
                    />

                    <SearchResultGroup<SearchResultItem<ComMiloapisNotificationV1Alpha1Contact>>
                      heading={t`Contacts`}
                      items={(contactResults || []).slice(0, 3)}
                      icon={Contact}
                      iconClassName="text-orange-600"
                      getKey={getItemKey}
                      getValue={(item) =>
                        `${item.resource.metadata?.name ?? ''} ${item.resource.spec?.givenName ?? ''} ${item.resource.spec?.familyName ?? ''} ${item.resource.spec?.email ?? ''}`
                      }
                      getTitle={(item) =>
                        `${item.resource.spec?.givenName ?? ''} ${item.resource.spec?.familyName ?? ''}`.trim() ||
                        (item.resource.metadata?.name ?? '')
                      }
                      getSubtitle={(item) => item.resource.spec?.email ?? ''}
                      onSelect={(item) =>
                        runCommand(() =>
                          navigate(
                            contactRoutes.detail(
                              getNamespace(item.resource.metadata),
                              item.resource.metadata?.name ?? ''
                            )
                          )
                        )
                      }
                      footer={
                        (contactResults?.length ?? 0) > 3 ? (
                          <SeeAllLink to={contactRoutes.list()} label={t`See all contacts`} />
                        ) : null
                      }
                    />

                    {/* Notes disabled until ResourceIndexPolicy is deployed */}
                  </>
                )}
              </>
            )}
          </>
        )}
      </CommandList>
    </Command>
  );
}
