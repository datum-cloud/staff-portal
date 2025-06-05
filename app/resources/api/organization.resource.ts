import { apiRequestClient } from '@/modules/axios/axios.client';
import { useQuery } from '@tanstack/react-query';

export const useOrgQuery = () =>
  useQuery({
    queryKey: ['orgs'],
    queryFn: () =>
      apiRequestClient({
        method: 'GET',
        url: '/datum-os/iam/v1alpha/organizations',
      }).execute(),
  });
