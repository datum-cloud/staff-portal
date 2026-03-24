import { contactMembershipForContactListQuery } from '../apis/contact-membership.api';
import { contactListQuery } from '../apis/contact.api';
import { ListQueryParams } from '@/resources/schemas';
import { useQuery } from '@tanstack/react-query';

export const contactQueryKeys = {
  all: ['contacts'] as const,
  list: (params?: ListQueryParams) => ['contacts', 'list', params] as const,
  bySubjectUser: (userId: string) => ['contacts', 'subject-user', userId] as const,
  groups: {
    all: (contactName: string) => ['contacts', contactName, 'groups'] as const,
    list: (contactName: string) => ['contacts', contactName, 'groups', 'list'] as const,
  },
};

export const useContactAllListQuery = () => {
  return useQuery({
    queryKey: contactQueryKeys.list(),
    queryFn: () => contactListQuery(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useContactListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: contactQueryKeys.list(params),
    queryFn: () => contactListQuery(params),
    staleTime: 5 * 60 * 1000,
    enabled: !!params?.search,
  });
};

export const useContactBySubjectUserQuery = (userId: string) => {
  return useQuery({
    queryKey: contactQueryKeys.bySubjectUser(userId),
    queryFn: () =>
      contactListQuery({
        limit: 1,
        filters: { fieldSelector: `spec.subject.name=${userId}` },
      }),
    enabled: !!userId,
  });
};

export const useContactGroupMembershipListQuery = (contactName: string) => {
  return useQuery({
    queryKey: contactQueryKeys.groups.list(contactName),
    queryFn: () =>
      contactMembershipForContactListQuery({
        filters: { fieldSelector: `spec.contactRef.name=${contactName}` },
      }),
    enabled: !!contactName,
  });
};
