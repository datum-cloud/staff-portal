import { apiRequestClient } from '@/modules/axios/axios.client';
import {
  ContactCreate,
  ContactCreateSchema,
  ContactUpdate,
  ContactUpdateSchema,
  ContactResponseSchema,
  ContactListResponseSchema,
  ListQueryParams,
} from '@/resources/schemas';
import { useQuery } from '@tanstack/react-query';

export const contactListQuery = (params?: ListQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: '/apis/notification.miloapis.com/v1alpha1/contacts',
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
      ...(params?.search && { fieldSelector: `metadata.name=${params.search}` }),
    },
  })
    .output(ContactListResponseSchema)
    .execute();
};

export const contactCreateMutation = (payload: ContactCreate, namespace: string = 'default') => {
  return apiRequestClient({
    method: 'POST',
    url: `/apis/notification.miloapis.com/v1alpha1/namespaces/${namespace}/contacts`,
    data: payload,
  })
    .input(ContactCreateSchema)
    .output(ContactResponseSchema)
    .execute();
};

export const contactUpdateMutation = (
  name: string,
  payload: ContactUpdate,
  namespace: string = 'default'
) => {
  return apiRequestClient({
    method: 'PATCH',
    url: `/apis/notification.miloapis.com/v1alpha1/namespaces/${namespace}/contacts/${name}`,
    params: {
      fieldManager: 'datum-staff-portal',
    },
    headers: {
      'Content-Type': 'application/merge-patch+json',
    },
    data: payload,
  })
    .input(ContactUpdateSchema)
    .output(ContactResponseSchema)
    .execute();
};

export const contactDeleteMutation = (name: string, namespace: string = 'default') => {
  return apiRequestClient({
    method: 'DELETE',
    url: `/apis/notification.miloapis.com/v1alpha1/namespaces/${namespace}/contacts/${name}`,
  }).execute();
};

export const useContactListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: ['contacts', 'list', params],
    queryFn: () => contactListQuery(params),
    staleTime: 5 * 60 * 1000,
  });
};
