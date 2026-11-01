import type { Route } from './+types/layout';
import { ContactTypeBadge } from '@/features/contact';
import { DetailShell, type EntityNav } from '@/features/milo';
import { authenticator } from '@/modules/auth';
import { contactDetailQuery, userDetailQuery } from '@/resources/request/server';
import { ContactDetailLoaderData } from '@/routes/marketing/contact/shared';
import { ENTITY_ICONS, TAB_ICONS } from '@/utils/config/icons.config';
import { contactRoutes } from '@/utils/config/routes.config';
import { Avatar, AvatarFallback } from '@datum-cloud/datum-ui/avatar';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import { useLoaderData } from 'react-router';

/** Adornment for not-yet-shipped entity tabs. `handle` is module scope (no hooks), so this is a plain element. */
const SOON_BADGE = (
  <Badge type="secondary" theme="light" className="text-3xs px-1.5 py-0 font-medium">
    Soon
  </Badge>
);

export const handle = {
  breadcrumb: (data: ContactDetailLoaderData) => {
    const displayName = [data.contact?.spec?.givenName, data.contact?.spec?.familyName]
      .filter(Boolean)
      .join(' ');
    const contactName = data.contact?.metadata?.name ?? '';

    return <span>{displayName || contactName}</span>;
  },
  // `handle` is module scope (no hooks, no `useLingui` macro — see
  // entity-scoped-left-nav.md's i18n gap, tracked as a follow-up), so these
  // labels are plain strings, same as `NAV_SECTIONS`.
  entityNav: (
    data: ContactDetailLoaderData,
    params: { namespace?: string; contactName?: string }
  ): EntityNav => {
    const namespace = params.namespace ?? data?.contact?.metadata?.namespace ?? '';
    const contactName = params.contactName ?? data?.contact?.metadata?.name ?? '';
    const displayName =
      [data?.contact?.spec?.givenName, data?.contact?.spec?.familyName].filter(Boolean).join(' ') ||
      contactName;

    return {
      backTo: { label: 'Contacts', href: contactRoutes.list() },
      title: displayName,
      icon: ENTITY_ICONS.contact,
      groups: [
        {
          items: [
            {
              label: 'Overview',
              href: contactRoutes.detail(namespace, contactName),
              icon: TAB_ICONS.overview,
            },
            {
              label: 'Notes',
              href: contactRoutes.notes(namespace, contactName),
              icon: ENTITY_ICONS.note,
              disabled: true,
              badge: SOON_BADGE,
            },
            {
              label: 'Contact Groups',
              href: contactRoutes.group(namespace, contactName),
              icon: ENTITY_ICONS.contactGroup,
            },
            {
              label: 'Emails sent',
              href: contactRoutes.emailsSent(namespace, contactName),
              icon: ENTITY_ICONS.emailActivity,
              disabled: true,
              badge: SOON_BADGE,
            },
            {
              label: 'Activity',
              href: contactRoutes.activity(namespace, contactName),
              icon: ENTITY_ICONS.activity,
              disabled: true,
              badge: SOON_BADGE,
            },
          ],
        },
      ],
    };
  },
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const contact = await contactDetailQuery(
    session?.accessToken ?? '',
    params?.contactName ?? '',
    params?.namespace ?? ''
  );

  let user: ComMiloapisIamV1Alpha1User | undefined;
  if (contact?.spec?.subject?.name && contact?.spec?.subject?.kind === 'User') {
    user = await userDetailQuery(session?.accessToken ?? '', contact?.spec?.subject?.name ?? '');
  }

  return { contact, user };
};

export default function Layout() {
  const data = useLoaderData<typeof loader>();

  const contactName = data?.contact?.metadata?.name ?? '';
  const displayName =
    [data?.contact?.spec?.givenName, data?.contact?.spec?.familyName].filter(Boolean).join(' ') ||
    contactName;
  const initials =
    displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || '?';

  return (
    <DetailShell
      icon={
        <Avatar className="size-10 rounded-xl">
          <AvatarFallback className="rounded-xl">{initials}</AvatarFallback>
        </Avatar>
      }
      name={
        <span className="flex items-center gap-2">
          {displayName}
          <ContactTypeBadge contact={data?.contact} />
        </span>
      }
      subtitle={data?.contact?.spec?.email}
    />
  );
}
