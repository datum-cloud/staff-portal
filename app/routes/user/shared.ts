// Import the loader from the layout file
import { loader } from './detail/layout';
import { extractDataFromMatches } from '@/utils/helpers';
import { useRouteLoaderData } from 'react-router';

// Export the loader type for other files to use
export type UserDetailLoaderData = Awaited<ReturnType<typeof loader>>;

// Export a typed hook for other files to use
export function useUserDetailData() {
  return useRouteLoaderData('routes/user/detail/layout') as UserDetailLoaderData;
}

// Helper function to extract user metadata for meta functions
export function getUserDetailMetadata(matches: any[]) {
  const data = extractDataFromMatches<UserDetailLoaderData>(matches, 'routes/user/detail/layout');
  return {
    user: data,
    userName: data ? `${data.spec.givenName} ${data.spec.familyName}` : '',
    userEmail: data?.spec?.email || '',
  };
}
