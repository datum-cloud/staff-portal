// Import the loader from the layout file
import { loader } from './detail/layout';
import { extractDataFromMatches } from '@/utils/helpers';
import { useRouteLoaderData } from 'react-router';

// Export the loader type for other files to use
export type ServiceDetailLoaderData = Awaited<ReturnType<typeof loader>>;

// Export a typed hook for other files to use
export function useServiceDetailData() {
  return useRouteLoaderData('service-catalog-detail') as ServiceDetailLoaderData;
}

// Helper function to extract service metadata for meta functions
export function getServiceDetailMetadata(matches: any[]) {
  const data = extractDataFromMatches<ServiceDetailLoaderData>(matches, 'service-catalog-detail');
  return {
    service: data,
    displayName: data?.spec?.displayName ?? data?.metadata?.name ?? '',
    canonicalName: data?.spec?.serviceName ?? '',
  };
}
