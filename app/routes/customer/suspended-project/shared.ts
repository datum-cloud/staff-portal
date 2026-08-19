import { loader } from './detail/layout';
import { extractDataFromMatches } from '@/utils/helpers';
import { useRouteLoaderData } from 'react-router';

export type SuspendedProjectDetailLoaderData = Awaited<ReturnType<typeof loader>>;

export function useSuspendedProjectDetailData() {
  return useRouteLoaderData('suspended-project-detail') as SuspendedProjectDetailLoaderData;
}

export function getSuspendedProjectDetailMetadata(matches: any[]) {
  const data = extractDataFromMatches<SuspendedProjectDetailLoaderData>(
    matches,
    'suspended-project-detail'
  );
  return {
    project: data,
    projectName: data?.metadata?.name ?? '',
  };
}
