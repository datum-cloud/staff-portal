import type { DnsZoneRow } from '../components/dns-zone-list';
import {
  projectDnsListQuery,
  projectQueryKeys,
  useOrgProjectListQuery,
} from '@/resources/request/client';
import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

/**
 * Aggregate the DNS zones under every project an organization owns.
 *
 * Per #489: the search index doesn't carry org tenancy yet (only project),
 * so we resolve this client-side — list the org's projects, then fan out
 * one DNS query per project and merge the results. Sharing the per-project
 * query keys means the project-scoped DNS tab reuses these cache entries
 * (and vice versa). Once milo-os/search supports tagging resources with
 * their org at index time, this hook can collapse to a single search call.
 */
export function useOrgDnsList(orgName: string): {
  rows: DnsZoneRow[];
  isLoading: boolean;
} {
  const projectsQuery = useOrgProjectListQuery(orgName);

  const projectNames = useMemo(
    () =>
      (projectsQuery.data?.items ?? [])
        .map((project) => project.metadata?.name ?? '')
        .filter((name): name is string => !!name),
    [projectsQuery.data]
  );

  const dnsQueries = useQueries({
    queries: projectNames.map((projectName) => ({
      queryKey: projectQueryKeys.dns.list(projectName),
      queryFn: () => projectDnsListQuery(projectName),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const rows = useMemo<DnsZoneRow[]>(() => {
    const out: DnsZoneRow[] = [];
    dnsQueries.forEach((query, index) => {
      const projectName = projectNames[index];
      for (const dnsZone of query.data?.items ?? []) {
        out.push({ dnsZone, projectName });
      }
    });
    return out;
  }, [dnsQueries, projectNames]);

  const isLoading =
    projectsQuery.isLoading ||
    (projectNames.length > 0 && dnsQueries.some((query) => query.isLoading));

  return { rows, isLoading };
}
