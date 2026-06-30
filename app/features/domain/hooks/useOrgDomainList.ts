import type { DomainRow } from '../components/domain-list';
import {
  projectDomainListQuery,
  projectQueryKeys,
  useOrgProjectListQuery,
} from '@/resources/request/client';
import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

/**
 * Aggregate the domains under every project an organization owns.
 *
 * Per #476: the search index doesn't carry org tenancy yet (only project),
 * so we resolve this client-side — list the org's projects, then fan out
 * one domain query per project and merge the results. The trade-off is
 * O(n) requests per org load; per Kev on #476 that's acceptable while orgs
 * have few projects. Once milo-os/search supports tagging resources with
 * their org at index time, this hook can collapse to a single search call.
 */
export function useOrgDomainList(orgName: string): {
  rows: DomainRow[];
  isLoading: boolean;
} {
  const projectsQuery = useOrgProjectListQuery(orgName);

  const projectNames = useMemo(
    () => (projectsQuery.data?.items ?? []).map((project) => project.name).filter(Boolean),
    [projectsQuery.data]
  );

  // Fan out one list query per project. Sharing the same query keys as the
  // project-scoped Domains tab means visiting that tab later reuses these
  // cache entries (and vice versa).
  const domainQueries = useQueries({
    queries: projectNames.map((projectName) => ({
      queryKey: projectQueryKeys.domains.list(projectName),
      queryFn: () => projectDomainListQuery(projectName),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const rows = useMemo<DomainRow[]>(() => {
    const out: DomainRow[] = [];
    domainQueries.forEach((query, index) => {
      const projectName = projectNames[index];
      for (const domain of query.data?.items ?? []) {
        out.push({ domain, projectName });
      }
    });
    return out;
  }, [domainQueries, projectNames]);

  // Loading while we either still don't know the project set or any of the
  // fan-out queries is in flight. An empty org (no projects) settles
  // immediately on the empty array.
  const isLoading =
    projectsQuery.isLoading ||
    (projectNames.length > 0 && domainQueries.some((query) => query.isLoading));

  return { rows, isLoading };
}
