import { buildTimelineEvents } from '../../lib/contact-timeline';
import {
  useContactGroupMembershipListQuery,
  useNoteCreatorNamesQuery,
  useNotesQuery,
  usePlatformAccessQuery,
  useUserEmailListQuery,
  useUserOrganizationListQuery,
  type NoteSubjectRef,
} from '@/resources/request/client';
import type { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import type { ComMiloapisNotificationV1Alpha1Contact } from '@openapi/notification.miloapis.com/v1alpha1';
import * as React from 'react';

/**
 * Fetches everything the timeline merges (shared query keys with the overview,
 * so React Query dedupes) and derives the pure event list. Also returns the note
 * subject so the composer can write against the same resource.
 */
export function useContactTimelineEvents(
  contact: ComMiloapisNotificationV1Alpha1Contact | undefined,
  user: ComMiloapisIamV1Alpha1User | undefined,
  linked: boolean
) {
  const contactName = contact?.metadata?.name ?? '';
  const namespace = contact?.metadata?.namespace ?? '';
  const email = contact?.spec?.email ?? '';
  const userId = linked ? (user?.metadata?.name ?? '') : '';

  const noteSubject: NoteSubjectRef = {
    apiGroup: 'notification.miloapis.com',
    kind: 'Contact',
    name: contactName,
    namespace,
  };

  const notesQuery = useNotesQuery(noteSubject);
  const notes = React.useMemo(() => notesQuery.data?.items ?? [], [notesQuery.data]);
  const creatorIds = React.useMemo(
    () => [
      ...new Set(notes.map((n) => n.spec?.creatorRef?.name).filter((id): id is string => !!id)),
    ],
    [notes]
  );
  const { data: creatorNames = {} } = useNoteCreatorNamesQuery(creatorIds);

  const { data: emailData, isLoading: emailsLoading } = useUserEmailListQuery(userId, email, {
    enabled: linked && !!email,
  });
  const orgsQuery = useUserOrganizationListQuery(userId);
  const groupsQuery = useContactGroupMembershipListQuery(contactName);
  const { data: platformAccess, isLoading: accessLoading } = usePlatformAccessQuery(userId);

  const isLoading =
    notesQuery.isLoading ||
    orgsQuery.isLoading ||
    groupsQuery.isLoading ||
    emailsLoading ||
    accessLoading;

  const events = React.useMemo(
    () =>
      buildTimelineEvents({
        notes,
        creatorNames,
        emails: emailData?.items,
        orgs: orgsQuery.data?.items,
        groups: groupsQuery.data?.items,
        recipientEmail: email,
        platformAccessState: platformAccess?.spec?.state,
        platformAccessTimestamp: platformAccess?.metadata?.creationTimestamp,
        signupTimestamp: user?.metadata?.creationTimestamp ?? contact?.metadata?.creationTimestamp,
        linked,
      }),
    [
      notes,
      creatorNames,
      emailData,
      orgsQuery.data,
      groupsQuery.data,
      platformAccess,
      user,
      contact,
      email,
      linked,
    ]
  );

  return { events, isLoading, noteSubject };
}
