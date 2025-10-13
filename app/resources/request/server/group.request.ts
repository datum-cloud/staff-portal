import { apiRequest } from '@/modules/axios/axios.server';
import { GroupSchema } from '@/resources/schemas';

export const groupDetailQuery = (
  token: string,
  groupName: string,
  namespace: string = 'milo-system'
) => {
  return apiRequest({
    method: 'GET',
    url: `/apis/iam.miloapis.com/v1alpha1/namespaces/${namespace}/groups/${groupName}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .output(GroupSchema)
    .execute();
};
