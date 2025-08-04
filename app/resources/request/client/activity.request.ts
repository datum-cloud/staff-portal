import { apiRequestClient } from '@/modules/axios/axios.client';
import {
  ActivityListResponseSchema,
  ActivityQueryParams,
  ListQueryParams,
} from '@/resources/schemas';

// Activity query with single resource support
export const activityListQuery = (
  resourceType?: string,
  resourceId?: string,
  params?: ListQueryParams<ActivityQueryParams>
) => {
  return apiRequestClient({
    method: 'GET',
    url: '',
    baseURL: '/api/activity',
    params: {
      // Only Write operations are logged (default)
      actions: 'create,update,patch,delete,deletecollection',
      ...(params?.limit && { limit: params.limit }),
      ...(params?.filters?.start && { start: params.filters.start }),
      ...(params?.filters?.end && { end: params.filters.end }),
      ...(params?.search && { q: params.search }),
      // Legacy project filter
      ...(params?.filters?.project && { project: params.filters.project }),
      // Organization filter
      ...(params?.filters?.organization && { organization: params.filters.organization }),
      // Single resource support
      ...(resourceType && { resourceType }),
      ...(resourceId && { resourceId }),
      // Enhanced filtering options
      ...(params?.filters?.user && { user: params.filters.user }),
      ...(params?.filters?.status && { status: params.filters.status }),
      ...(params?.filters?.actions && { actions: params.filters.actions }),
      ...(params?.filters?.responseCode && { responseCode: params.filters.responseCode }),
      ...(params?.filters?.apiGroup && { apiGroup: params.filters.apiGroup }),
      ...(params?.filters?.namespace && { namespace: params.filters.namespace }),
      ...(params?.filters?.sourceIP && { sourceIP: params.filters.sourceIP }),
    },
  })
    .output(ActivityListResponseSchema)
    .execute();
};
