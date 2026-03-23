import { contactListQuery } from '../apis/contact.api';
import { ListQueryParams } from '@/resources/schemas';
import { useQuery } from '@tanstack/react-query';

export const contactQueryKeys = {
  all: ['contacts'] as const,
  list: (params?: ListQueryParams) => ['contacts', 'list', params] as const,
};

export const useContactListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: contactQueryKeys.list(params),
    queryFn: () => contactListQuery(params),
    staleTime: 5 * 60 * 1000,
    enabled: !!params?.search,
  });
};
