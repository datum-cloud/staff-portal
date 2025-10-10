// Import the loader from the layout file
import { loader } from './edit';
import { extractDataFromMatches } from '@/utils/helpers';
import { useRouteLoaderData } from 'react-router';

// Export the loader type for other files to use
export type ContactDetailLoaderData = Awaited<ReturnType<typeof loader>>;

// Export a typed hook for other files to use
export function useContactDetailData() {
  return useRouteLoaderData('routes/contact/edit') as ContactDetailLoaderData;
}

// Helper function to extract organization metadata for meta functions
export function getContactDetailMetadata(matches: any[]) {
  const data = extractDataFromMatches<ContactDetailLoaderData>(matches, 'routes/contact/edit');
  return {
    contact: data,
    contactName: [data?.spec?.givenName, data?.spec?.familyName].filter(Boolean).join(' '),
  };
}
