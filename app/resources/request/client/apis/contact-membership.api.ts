import { contactGroupDetailQuery } from './contact-group.api';
import { contactDetailQuery } from './contact.api';
import {
  ContactGroupMembershipListWithContacts,
  ContactMembershipListWithContactGroups,
  ListQueryParams,
} from '@/resources/schemas';
import { listNotificationMiloapisComV1Alpha1ContactGroupMembershipForAllNamespaces } from '@openapi/notification.miloapis.com/v1alpha1';

export const contactMembershipForGroupListQuery = async (
  params?: ListQueryParams<{ fieldSelector?: string }>
): Promise<ContactGroupMembershipListWithContacts> => {
  const response = await listNotificationMiloapisComV1Alpha1ContactGroupMembershipForAllNamespaces({
    query: {
      limit: params?.limit,
      continue: params?.cursor,
      ...(params?.filters?.fieldSelector && { fieldSelector: params.filters.fieldSelector }),
    },
  });
  const data = response.data.data;
  const items = data.items ?? [];
  const contacts = await Promise.all(
    items.map((m) =>
      contactDetailQuery(m.spec?.contactRef?.name ?? '', m.spec?.contactRef?.namespace ?? 'default')
    )
  );

  const contactsByName = contacts.reduce<Record<string, (typeof contacts)[number] | undefined>>(
    (acc, contact) => {
      const name = contact?.metadata?.name;
      if (name) {
        acc[name] = contact;
      }
      return acc;
    },
    {}
  );

  return {
    ...data,
    items: items.map((m) => ({
      ...m,
      contact: contactsByName[m.spec?.contactRef?.name ?? ''],
    })),
  };
};

export const contactMembershipForContactListQuery = async (
  params?: ListQueryParams<{ fieldSelector?: string }>
): Promise<ContactMembershipListWithContactGroups> => {
  const response = await listNotificationMiloapisComV1Alpha1ContactGroupMembershipForAllNamespaces({
    query: {
      limit: params?.limit,
      continue: params?.cursor,
      ...(params?.filters?.fieldSelector && { fieldSelector: params.filters.fieldSelector }),
    },
  });
  const data = response.data.data;
  const items = data.items ?? [];
  const contactGroups = await Promise.all(
    items.map((m) =>
      contactGroupDetailQuery(
        m.spec?.contactGroupRef?.name ?? '',
        m.spec?.contactGroupRef?.namespace ?? 'default'
      )
    )
  );

  const contactGroupsByName = contactGroups.reduce<
    Record<string, (typeof contactGroups)[number] | undefined>
  >((acc, contactGroup) => {
    const name = contactGroup?.metadata?.name;
    if (name) {
      acc[name] = contactGroup;
    }
    return acc;
  }, {});

  return {
    ...data,
    items: items.map((m) => ({
      ...m,
      contactGroup: contactGroupsByName[m.spec?.contactGroupRef?.name ?? ''],
    })),
  };
};
