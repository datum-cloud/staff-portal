import { apiRequest } from '@/modules/axios/axios.server';
import { ProjectSchema } from '@/resources/schemas/project.schema';

export const projectDetailQuery = (token: string, projectName: string) => {
  return apiRequest({
    method: 'GET',
    url: `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .output(ProjectSchema)
    .execute();
};
