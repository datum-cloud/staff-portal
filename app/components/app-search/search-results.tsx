import { SearchResultGroup } from './search-result-group';
import type { useAppSearch } from './use-app-search';
import { contactRoutes, routes } from '@/utils/config/routes.config';
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
    <Link
      to={to}
      className="text-primary hover:text-primary/80 block px-3 py-1.5 text-sm font-medium">
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
                        runCommand(() => navigate(routes.users.detail(user.metadata?.name ?? '')))
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

                    <SearchResultGroup<ComDatumapisNetworkingV1AlphaDomain>
                      heading={t`Domains`}
                      items={(domainResults || []).slice(0, 3)}
                      icon={Globe}
                      iconClassName="text-green-600"
                      getValue={(d) => `${d.metadata?.name ?? ''} ${d.spec?.domainName ?? ''}`}
                      getTitle={(d) => d.spec?.domainName ?? d.metadata?.name ?? ''}
                      getSubtitle={(d) =>
                        [getDomainStatus(d), getDomainRegistrar(d)].filter(Boolean).join(' \u2022 ')
                      }
                      onSelect={(d) =>
                        runCommand(() => {
                          const projectName = d.metadata?.namespace ?? '';
                          navigate(
                            `/customers/projects/${projectName}/domains/${d.metadata?.namespace ?? ''}/${d.metadata?.name ?? ''}`
                          );
                        })
                      }
                      footer={
                        (domainResults?.length ?? 0) > 3 ? (
                          <SeeAllLink to="/customers/projects" label={t`See all domains`} />
                        ) : null
                      }
                    />

                    <SearchResultGroup<ComMiloapisNetworkingDnsV1Alpha1DnsZone>
                      heading={t`DNS Zones`}
                      items={(dnsZoneResults || []).slice(0, 3)}
                      icon={Server}
                      iconClassName="text-blue-600"
                      getValue={(z) => `${z.metadata?.name ?? ''} ${z.spec?.domainName ?? ''}`}
                      getTitle={(z) => z.spec?.domainName ?? z.metadata?.name ?? ''}
                      getSubtitle={(z) => [getDnsRecordCount(z), getDnsStatus(z)].join(' \u2022 ')}
                      onSelect={(z) =>
                        runCommand(() => {
                          const projectName = z.metadata?.namespace ?? '';
                          navigate(
                            `/customers/projects/${projectName}/dns/${z.metadata?.namespace ?? ''}/${z.metadata?.name ?? ''}`
                          );
                        })
                      }
                      footer={
                        (dnsZoneResults?.length ?? 0) > 3 ? (
                          <SeeAllLink to="/customers/projects" label={t`See all DNS zones`} />
                        ) : null
                      }
                    />

                    <SearchResultGroup<ComMiloapisNotificationV1Alpha1Contact>
                      heading={t`Contacts`}
                      items={(contactResults || []).slice(0, 3)}
                      icon={Contact}
                      iconClassName="text-orange-600"
                      getValue={(c) =>
                        `${c.metadata?.name ?? ''} ${c.spec?.givenName ?? ''} ${c.spec?.familyName ?? ''} ${c.spec?.email ?? ''}`
                      }
                      getTitle={(c) =>
                        `${c.spec?.givenName ?? ''} ${c.spec?.familyName ?? ''}`.trim() ||
                        (c.metadata?.name ?? '')
                      }
                      getSubtitle={(c) => c.spec?.email ?? ''}
                      onSelect={(c) =>
                        runCommand(() =>
                          navigate(
                            contactRoutes.detail(
                              c.metadata?.namespace ?? '',
                              c.metadata?.name ?? ''
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
