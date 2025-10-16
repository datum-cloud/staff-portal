import { apiRequestClient } from '@/modules/axios/axios.client';
import {
  ContactGroupCreate,
  ContactGroupCreateSchema,
  ContactGroupUpdate,
  ContactGroupUpdateSchema,
  ContactGroupResponseSchema,
  ContactGroupListResponseSchema,
  ListQueryParams,
} from '@/resources/schemas';

export const contactGroupListQuery = (params?: ListQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: '/apis/notification.miloapis.com/v1alpha1/contactgroups',
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  })
    .output(ContactGroupListResponseSchema)
    .execute();
};

export const contactGroupCreateMutation = (
  payload: ContactGroupCreate,
  namespace: string = 'default'
) => {
  return apiRequestClient({
    method: 'POST',
    url: `/apis/notification.miloapis.com/v1alpha1/namespaces/${namespace}/contactgroups`,
    data: payload,
  })
    .input(ContactGroupCreateSchema)
    .output(ContactGroupResponseSchema)
    .execute();
};

export const contactGroupUpdateMutation = (
  name: string,
  payload: ContactGroupUpdate,
  namespace: string = 'default'
) => {
  return apiRequestClient({
    method: 'PATCH',
    url: `/apis/notification.miloapis.com/v1alpha1/namespaces/${namespace}/contactgroups/${name}`,
    params: {
      fieldManager: 'datum-staff-portal',
    },
    headers: {
      'Content-Type': 'application/merge-patch+json',
    },
    data: payload,
  })
    .input(ContactGroupUpdateSchema)
    .output(ContactGroupResponseSchema)
    .execute();
};

export const contactGroupDeleteMutation = (name: string, namespace: string = 'default') => {
  return apiRequestClient({
    method: 'DELETE',
    url: `/apis/notification.miloapis.com/v1alpha1/namespaces/${namespace}/contactgroups/${name}`,
  }).execute();
};
