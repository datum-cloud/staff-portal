import {
  contactGroupMembershipsOp,
  contactMembershipsOp,
} from '@/resources/gql/contact-membership.gql';
import {
  ContactGroupMembershipListWithContacts,
  ContactGroupMembershipWithContact,
  ContactMembershipListWithContactGroups,
  ContactMembershipWithContactGroup,
  ListQueryParams,
} from '@/resources/schemas';

export const contactMembershipForGroupListQuery = async (
  params?: ListQueryParams<{ fieldSelector?: string }>
): Promise<ContactGroupMembershipListWithContacts> => {
  const data = (
    await contactGroupMembershipsOp({
      fieldSelector: params?.filters?.fieldSelector,
      limit: params?.limit,
      cursor: params?.cursor,
    })
  )?.contactGroupMembershipsWithContacts;

  return {
    metadata: { continue: data?.continue ?? undefined },
    items: (data?.items ?? []).map((item) => ({
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
    })) as ContactGroupMembershipWithContact[],
  };
};

export const contactMembershipForContactListQuery = async (
  params?: ListQueryParams<{ fieldSelector?: string }>
): Promise<ContactMembershipListWithContactGroups> => {
  const data = (
    await contactMembershipsOp({
      fieldSelector: params?.filters?.fieldSelector,
      limit: params?.limit,
      cursor: params?.cursor,
    })
  )?.contactMembershipsWithGroups;

  return {
    metadata: { continue: data?.continue ?? undefined },
    items: (data?.items ?? []).map((item) => ({
      metadata: { name: item.name, creationTimestamp: item.creationTimestamp ?? undefined },
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
              visibility: item.contactGroup.visibility as 'public' | 'private' | undefined,
            },
            status: item.contactGroup.status
              ? {
                  conditions: (item.contactGroup.status.conditions ?? []).map((c) => ({
                    type: c.type,
                    status: c.status as 'True' | 'False' | 'Unknown',
                    reason: c.reason ?? '',
                    message: c.message ?? '',
                    lastTransitionTime: c.lastTransitionTime ?? '',
                    observedGeneration: c.observedGeneration ?? undefined,
                  })),
                }
              : undefined,
          }
        : undefined,
    })) as ContactMembershipWithContactGroup[],
  };
};
