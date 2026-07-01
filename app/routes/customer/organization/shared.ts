// Import the loader from the layout file
import { loader } from './detail/layout';
import { extractDataFromMatches } from '@/utils/helpers';
import { useRouteLoaderData } from 'react-router';

// Export the loader type for other files to use
export type OrganizationDetailLoaderData = Awaited<ReturnType<typeof loader>>;

// Export a typed hook for other files to use
export function useOrganizationDetailData() {
  return useRouteLoaderData('routes/organization/detail/layout') as OrganizationDetailLoaderData;
}

// Helper function to extract organization metadata for meta functions
export function getOrganizationDetailMetadata(matches: any[]) {
  const data = extractDataFromMatches<OrganizationDetailLoaderData>(
    matches,
    'routes/organization/detail/layout'
  );
  return {
    organization: data,
    organizationName:
      data?.metadata?.annotations?.['kubernetes.io/display-name'] || data?.metadata?.name,
  };
}
