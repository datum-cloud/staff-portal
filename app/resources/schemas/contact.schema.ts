import {
  ComMiloapisNotificationV1Alpha1Contact,
  ComMiloapisNotificationV1Alpha1ContactGroup,
  ComMiloapisNotificationV1Alpha1ContactGroupMembership,
  ComMiloapisNotificationV1Alpha1ContactGroupMembershipList,
} from '@openapi/notification.miloapis.com/v1alpha1';

export type ContactGroupMembershipWithContact =
  ComMiloapisNotificationV1Alpha1ContactGroupMembership & {
    contact?: ComMiloapisNotificationV1Alpha1Contact;
  };

export type ContactGroupMembershipListWithContacts = Omit<
  ComMiloapisNotificationV1Alpha1ContactGroupMembershipList,
  'items'
> & {
  items?: ContactGroupMembershipWithContact[];
};

export type ContactMembershipWithContactGroup =
  ComMiloapisNotificationV1Alpha1ContactGroupMembership & {
    contactGroup?: ComMiloapisNotificationV1Alpha1ContactGroup;
  };

export type ContactMembershipListWithContactGroups = Omit<
  ComMiloapisNotificationV1Alpha1ContactGroupMembershipList,
  'items'
> & {
  items?: ContactMembershipWithContactGroup[];
};
