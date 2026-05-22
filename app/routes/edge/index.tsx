import type { Route } from './+types/index';
import { EdgeList, type EdgeRow } from '@/features/edge';
import { searchEdgesListQuery } from '@/resources/request/client';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { t } from '@lingui/core/macro';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

export const meta: Route.MetaFunction = () => metaObject(t`AI Edge`);

// `tenant.name` carries the project name when `tenant.type` is "project"
// (case has been observed as both lowercase and capitalized).
function getProjectName(tenant?: { name?: string; type?: string }): string {
  return tenant?.type?.toLowerCase() === 'project' ? (tenant?.name ?? '') : '';
}

const SEARCH_DEBOUNCE_MS = 300;

export default function Page() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce keystrokes into the value used for the API call so we don't
  // hit the search endpoint on every character.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['edges', 'search-list', debouncedSearch],
    queryFn: () => searchEdgesListQuery(debouncedSearch),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const rows: EdgeRow[] = useMemo(
    () =>
      (data?.items ?? []).map((item) => ({
        edge: item.resource,
        projectName: getProjectName(item.tenant),
      })),
    [data?.items]
  );

  return (
    <EdgeList
      data={rows}
      loading={isLoading}
      showProjectColumn
      hasMore={data?.hasMore ?? false}
      controlledSearch={{ value: search, onChange: setSearch }}
      linkBuilder={(row) => {
        // Defensive: if a result somehow lacks tenant info, render the row
        // as plain text rather than linking nowhere.
        if (!row.projectName) return null;
        return projectRoutes.edge.detail(row.projectName, row.edge.metadata?.name ?? '');
      }}
    />
  );
}
