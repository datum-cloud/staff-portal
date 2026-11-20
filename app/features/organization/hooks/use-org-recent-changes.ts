import { recentChanges, type AuditSource, type ChangeRow } from '../lib/recent-changes';
import {
  useOrgAllProjectsQuery,
  useOrgRecentChangesQuery,
  useProjectRecentChangesQueries,
} from '@/resources/request/client';
import { useMemo } from 'react';

export interface OrgRecentChanges {
  /** The newest changes from the last 24 hours, newest first. */
  changes: ChangeRow[];
  /** The project list, or the organization's own audit log, is still loading. */
  isLoading: boolean;
  projectCount: number;
  /** How many projects' audit logs are still loading. */
  loadingProjects: number;
  /** Projects whose audit log couldn't be read, so the list may be incomplete. */
  unreadProjects: string[];
  /** The organization's own audit log couldn't be read. */
  orgUnread: boolean;
  /** The project list itself failed. */
  isError: boolean;
}

/**
 * The newest changes from the last 24 hours across an organization (#770):
 * its own audit log plus every project's, each fetched through AuditLogQuery
 * and failing on its own.
 */
export function useOrgRecentChanges(orgName: string): OrgRecentChanges {
  const projectsQuery = useOrgAllProjectsQuery(orgName);
  const projectNames = useMemo(
    () => (projectsQuery.data?.items ?? []).map((project) => project.name).filter(Boolean),
    [projectsQuery.data]
  );
  const orgQuery = useOrgRecentChangesQuery(orgName);
  const results = useProjectRecentChangesQueries(projectNames);

  // `useQueries` returns a new array every render; rebuild only on real changes.
  const resultsKey = results
    .map((r) => `${r.status}:${r.dataUpdatedAt}:${r.errorUpdatedAt}`)
    .join('|');

  return useMemo(() => {
    const projectSources: AuditSource[] = projectNames.flatMap((project, index) => {
      const events = results[index]?.data;
      return events ? [{ project, events }] : [];
    });
    const orgSource: AuditSource[] = orgQuery.data ? [{ events: orgQuery.data }] : [];

    return {
      changes: recentChanges([...orgSource, ...projectSources]),
      isLoading: projectsQuery.isLoading || orgQuery.isLoading,
      projectCount: projectNames.length,
      loadingProjects: results.filter((result) => result.isLoading).length,
      unreadProjects: projectNames.filter((_, index) => results[index]?.isError),
      orgUnread: orgQuery.isError,
      isError: projectsQuery.isError,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `resultsKey` tracks `results`
  }, [
    projectNames,
    resultsKey,
    orgQuery.data,
    orgQuery.isLoading,
    orgQuery.isError,
    projectsQuery.isLoading,
    projectsQuery.isError,
  ]);
}
