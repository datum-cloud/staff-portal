import { contactGroupListQuery } from '../apis/contact-group.api';
import { ListQueryParams } from '@/resources/schemas';
import { useQuery } from '@tanstack/react-query';

export const contactGroupQueryKeys = {
  all: ['contact-groups'] as const,
  list: (params?: ListQueryParams) => ['contact-groups', 'list', params] as const,
};

export const useContactGroupListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: contactGroupQueryKeys.list(params),
    queryFn: () => contactGroupListQuery(params),
    staleTime: 5 * 60 * 1000,
  });
};
