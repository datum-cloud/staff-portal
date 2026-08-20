// Import the loader from the layout file
import { loader } from './detail/layout';
import { useLiveProject } from '@/resources/request/client';
import { extractDataFromMatches } from '@/utils/helpers';
import { useRouteLoaderData } from 'react-router';

// Export the loader type for other files to use
export type ProjectDetailLoaderData = Awaited<ReturnType<typeof loader>>;

// Export a typed hook for other files to use
export function useProjectDetailData() {
  const data = useRouteLoaderData('project-detail') as ProjectDetailLoaderData;
  const { project } = useLiveProject(data.project);
  return { ...data, project: project ?? data.project };
}

// Helper function to extract project metadata for meta functions
export function getProjectDetailMetadata(matches: any[]) {
  const data = extractDataFromMatches<ProjectDetailLoaderData>(matches, 'project-detail');
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
