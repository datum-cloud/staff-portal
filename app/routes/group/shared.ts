// Import the loader from the layout file
import { loader } from './member';
import { extractDataFromMatches } from '@/utils/helpers';
import { useRouteLoaderData } from 'react-router';

// Export the loader type for other files to use
export type GroupDetailLoaderData = Awaited<ReturnType<typeof loader>>;

// Export a typed hook for other files to use
export function useGroupDetailData() {
  return useRouteLoaderData('routes/group/member') as GroupDetailLoaderData;
}

// Helper function to extract organization metadata for meta functions
export function getGroupDetailMetadata(matches: any[]) {
  const data = extractDataFromMatches<GroupDetailLoaderData>(matches, 'routes/group/member');
  return {
    group: data,
    groupName: data?.metadata?.name || '',
  };
}
