import { apiRequestClient } from '@/modules/axios/axios.client';
import { ProjectActivityListResponseSchema } from '@/resources/schemas/activity.schema';
import { ListQueryParams } from '@/resources/schemas/common.schema';

export const activityListQuery = (projectName: string | null, params?: ListQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: '',
    baseURL: '/api/activity',
    params: {
      // Only Write operations are logged
      actions: 'create,update,patch,delete,deletecollection',
      ...(projectName && { project: projectName }),
      ...(params?.limit && { limit: params.limit }),
      ...(params?.filters?.start && { start: params.filters.start }), // Already in nanoseconds
      ...(params?.filters?.end && { end: params.filters.end }), // Already in nanoseconds
      ...(params?.search && { q: params.search }),
    },
  })
    .output(ProjectActivityListResponseSchema)
    .execute();
};
