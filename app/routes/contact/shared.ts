// Import the loader from the layout file
import { loader } from './detail/layout';
import { extractDataFromMatches } from '@/utils/helpers';
import { useRouteLoaderData } from 'react-router';

// Export the loader type for other files to use
export type ContactDetailLoaderData = Awaited<ReturnType<typeof loader>>;

// Export a typed hook for other files to use
export function useContactDetailData() {
  return useRouteLoaderData('routes/contact/detail/layout') as ContactDetailLoaderData;
}

// Helper function to extract organization metadata for meta functions
export function getContactDetailMetadata(matches: any[]) {
  const data = extractDataFromMatches<ContactDetailLoaderData>(
    matches,
    'routes/contact/detail/layout'
  );
  return {
    contact: data?.contact,
    user: data?.user,
    contactName: [data?.contact?.spec?.givenName, data?.contact?.spec?.familyName]
      .filter(Boolean)
      .join(' '),
  };
}
