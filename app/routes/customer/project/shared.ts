// Import the loader from the layout file
import { loader } from './detail/layout';
import { extractDataFromMatches } from '@/utils/helpers';
import { useRouteLoaderData } from 'react-router';

// Export the loader type for other files to use
export type ProjectDetailLoaderData = Awaited<ReturnType<typeof loader>>;

// Export a typed hook for other files to use
export function useProjectDetailData() {
  return useRouteLoaderData('routes/project/detail/layout') as ProjectDetailLoaderData;
}

// Helper function to extract project metadata for meta functions
export function getProjectDetailMetadata(matches: any[]) {
  const data = extractDataFromMatches<ProjectDetailLoaderData>(
    matches,
    'routes/project/detail/layout'
  );
  return {
    project: data?.project,
    organization: data?.organization,
    projectName:
      data?.project?.metadata?.annotations?.['kubernetes.io/description'] ||
      data?.project?.metadata?.name,
    organizationName:
      data?.organization?.metadata?.annotations?.['kubernetes.io/display-name'] ||
      data?.organization?.metadata?.name,
  };
}
