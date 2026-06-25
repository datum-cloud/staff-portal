import type { EdgeRow } from '../components/edge-list';
import {
  projectEdgeListQuery,
  projectQueryKeys,
  useOrgProjectListQuery,
} from '@/resources/request/client';
import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

/**
 * Aggregate the AI Edges under every project an organization owns.
 *
 * Per #490: the search index doesn't carry org tenancy yet (only project),
 * so we resolve this client-side — list the org's projects, then fan out
 * one edge query per project and merge the results. Sharing the per-project
 * query keys means the project-scoped Edges tab reuses these cache entries
 * (and vice versa). Once milo-os/search supports tagging resources with
 * their org at index time, this hook can collapse to a single search call.
 */
export function useOrgEdgeList(orgName: string): {
  rows: EdgeRow[];
  isLoading: boolean;
} {
  const projectsQuery = useOrgProjectListQuery(orgName);

  const projectNames = useMemo(
    () => (projectsQuery.data?.items ?? []).map((project) => project.name).filter(Boolean),
    [projectsQuery.data]
  );

  const edgeQueries = useQueries({
    queries: projectNames.map((projectName) => ({
      queryKey: projectQueryKeys.edges.list(projectName),
      queryFn: () => projectEdgeListQuery(projectName),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const rows = useMemo<EdgeRow[]>(() => {
    const out: EdgeRow[] = [];
    edgeQueries.forEach((query, index) => {
      const projectName = projectNames[index];
      for (const edge of query.data?.items ?? []) {
        out.push({ edge, projectName });
      }
    });
    return out;
  }, [edgeQueries, projectNames]);

  const isLoading =
    projectsQuery.isLoading ||
    (projectNames.length > 0 && edgeQueries.some((query) => query.isLoading));

  return { rows, isLoading };
}
