import { createGqlClient } from '@/modules/graphql/client';
import { generateQueryOp } from '@/modules/graphql/generated';
import type {
  ContactGroupMembershipEnriched,
  ContactMembershipEnriched,
} from '@/modules/graphql/generated/schema';
import {
  ContactGroupMembershipListWithContacts,
  ContactMembershipListWithContactGroups,
  ListQueryParams,
} from '@/resources/schemas';
import { mapApiError } from '@/utils/errors/error-mapper';

const client = createGqlClient({ type: 'global' });

export const contactMembershipForGroupListQuery = async (
  params?: ListQueryParams<{ fieldSelector?: string }>
): Promise<ContactGroupMembershipListWithContacts> => {
  const op = generateQueryOp({
    contactGroupMembershipsWithContacts: [
      {
        ...(params?.filters?.fieldSelector && { fieldSelector: params.filters.fieldSelector }),
        ...(params?.limit && { limit: params.limit }),
        ...(params?.cursor && { cursor: params.cursor }),
      },
      {
        continue: true,
        items: {
          name: true,
          contactRef: { name: true, namespace: true },
          contact: {
            name: true,
            namespace: true,
            email: true,
            givenName: true,
            familyName: true,
            displayName: true,
          },
        },
      },
    ],
  });
  const result = await client.query(op.query, op.variables).toPromise();
  if (result.error) throw mapApiError(result.error);
  const data = result.data?.contactGroupMembershipsWithContacts;

  return {
    metadata: { continue: data?.continue ?? undefined },
    items: (data?.items ?? []).map((item: ContactGroupMembershipEnriched) => ({
      metadata: { name: item.name },
      spec: {
        contactRef: {
          name: item.contactRef.name,
          namespace: item.contactRef.namespace,
        },
      },
      contact: item.contact
        ? {
            metadata: {
              name: item.contact.name,
              namespace: item.contact.namespace,
            },
            spec: {
              email: item.contact.email ?? undefined,
              givenName: item.contact.givenName ?? undefined,
              familyName: item.contact.familyName ?? undefined,
            },
          }
        : undefined,
    })),
  };
};

export const contactMembershipForContactListQuery = async (
  params?: ListQueryParams<{ fieldSelector?: string }>
): Promise<ContactMembershipListWithContactGroups> => {
  const op = generateQueryOp({
    contactMembershipsWithGroups: [
      {
        ...(params?.filters?.fieldSelector && { fieldSelector: params.filters.fieldSelector }),
        ...(params?.limit && { limit: params.limit }),
        ...(params?.cursor && { cursor: params.cursor }),
      },
      {
        continue: true,
        items: {
          name: true,
          contactGroupRef: { name: true, namespace: true },
          contactGroup: {
            name: true,
            namespace: true,
            displayName: true,
          },
        },
      },
    ],
  });
  const result = await client.query(op.query, op.variables).toPromise();
  if (result.error) throw mapApiError(result.error);
  const data = result.data?.contactMembershipsWithGroups;

  return {
    metadata: { continue: data?.continue ?? undefined },
    items: (data?.items ?? []).map((item: ContactMembershipEnriched) => ({
      metadata: { name: item.name },
      spec: {
        contactGroupRef: {
          name: item.contactGroupRef.name,
          namespace: item.contactGroupRef.namespace,
        },
      },
      contactGroup: item.contactGroup
        ? {
            metadata: {
              name: item.contactGroup.name,
              namespace: item.contactGroup.namespace,
            },
            spec: {
              displayName: item.contactGroup.displayName ?? undefined,
            },
          }
        : undefined,
    })),
  };
};
