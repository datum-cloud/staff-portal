// Import the loader from the edit file
import { loader } from './detail/layout';
import { extractDataFromMatches } from '@/utils/helpers';
import { useRouteLoaderData } from 'react-router';

// Export the loader type for other files to use
export type ContactGroupDetailLoaderData = Awaited<ReturnType<typeof loader>>;

// Export a typed hook for other files to use
export function useContactGroupDetailData() {
  return useRouteLoaderData('routes/contact-group/detail/layout') as ContactGroupDetailLoaderData;
}

// Helper function to extract contact group metadata for meta functions
export function getContactGroupDetailMetadata(matches: any[]) {
  const data = extractDataFromMatches<ContactGroupDetailLoaderData>(
    matches,
    'routes/contact-group/detail/layout'
  );
  return {
    contactGroup: data,
    contactGroupName: data?.spec?.displayName || data?.metadata?.name,
  };
}
