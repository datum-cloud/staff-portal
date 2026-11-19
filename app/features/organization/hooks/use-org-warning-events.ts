import {
  groupWarningEvents,
  type WarningEventSource,
  type WarningGroup,
} from '../lib/warning-events';
import {
  useOrgAllProjectsQuery,
  useOrgWarningEventsQuery,
  useProjectWarningEventQueries,
} from '@/resources/request/client';
import { useMemo } from 'react';

export interface OrgWarningEvents {
  /** Grouped warnings from the last 24 hours, most recently seen first. */
  groups: WarningGroup[];
  /** The project list, or the organization's own events, are still loading. */
  isLoading: boolean;
  /** How many projects the organization has. */
  projectCount: number;
  /** How many projects' events are still loading. */
  loadingProjects: number;
  /** Projects whose events couldn't be read, so the list may be incomplete. */
  unreadProjects: string[];
  /** The organization's own events couldn't be read. */
  orgUnread: boolean;
  /** The project list itself failed, so no project's events could be fetched. */
  isError: boolean;
}

/**
 * Warning events from the last 24 hours across an organization (#769): the
 * organization control plane's own, plus every project's, each fetched
 * through EventQuery and failing on its own, then grouped by object and reason.
 */
export function useOrgWarningEvents(orgName: string): OrgWarningEvents {
  const projectsQuery = useOrgAllProjectsQuery(orgName);
  const projectNames = useMemo(
    () => (projectsQuery.data?.items ?? []).map((project) => project.name).filter(Boolean),
    [projectsQuery.data]
  );
  const orgQuery = useOrgWarningEventsQuery(orgName);
  const results = useProjectWarningEventQueries(projectNames);

  // `useQueries` returns a new array every render; rebuild only on real changes.
  const resultsKey = results
    .map((r) => `${r.status}:${r.dataUpdatedAt}:${r.errorUpdatedAt}`)
    .join('|');

  return useMemo(() => {
    const projectSources: WarningEventSource[] = projectNames.flatMap((project, index) => {
      const items = results[index]?.data?.items;
      return items ? [{ project, events: items }] : [];
    });
    const orgSource: WarningEventSource[] = orgQuery.data ? [{ events: orgQuery.data.items }] : [];

    return {
      groups: groupWarningEvents([...orgSource, ...projectSources]),
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
