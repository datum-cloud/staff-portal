import { orgListQuery } from '../apis/organization.api';
import { ListQueryParams } from '@/resources/schemas';
import { useQuery } from '@tanstack/react-query';

export const organizationQueryKeys = {
  all: ['organizations'] as const,
  list: (params?: ListQueryParams) => ['organizations', 'list', params] as const,
};

export const useOrgListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: organizationQueryKeys.list(params),
    queryFn: () => orgListQuery(params),
    staleTime: 5 * 60 * 1000,
  });
};
