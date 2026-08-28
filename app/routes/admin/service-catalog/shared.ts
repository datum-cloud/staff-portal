// Import the loader from the layout file
import { loader } from './detail/layout';
import { extractDataFromMatches } from '@/utils/helpers';
import { useRouteLoaderData } from 'react-router';

// Full loader return type, for other files that need more than `.service`.
type ServiceDetailRouteData = Awaited<ReturnType<typeof loader>>;

// Export the loader type for other files to use
export type ServiceDetailLoaderData = ServiceDetailRouteData['service'];

// Export a typed hook for other files to use. The layout loader also returns
// `plugins` (for the tab strip and the Overview override — see `usePlugins`
// below), but every other consumer of this route's data only ever wanted the
// `Service` resource itself, so this unwraps `.service` to keep those call
// sites unchanged.
export function useServiceDetailData() {
  const data = useRouteLoaderData('service-catalog-detail') as ServiceDetailRouteData;
  return data.service;
}

// Every Ready plugin whose `serviceRef` matches this Service — see
// `app/routes/admin/service-catalog/detail/index.tsx`'s Overview-override
// check and `layout.tsx`'s tab strip.
export function usePlugins() {
  const data = useRouteLoaderData('service-catalog-detail') as ServiceDetailRouteData;
  return data.plugins;
}

// Helper function to extract service metadata for meta functions
export function getServiceDetailMetadata(matches: any[]) {
  const data = extractDataFromMatches<{ service: ServiceDetailLoaderData }>(
    matches,
    'service-catalog-detail'
  )?.service;
  return {
    service: data,
    displayName: data?.spec?.displayName ?? data?.metadata?.name ?? '',
    canonicalName: data?.spec?.serviceName ?? '',
  };
}
