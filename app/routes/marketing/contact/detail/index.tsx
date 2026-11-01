import { getContactDetailMetadata, useContactDetailData } from '../shared';
import type { Route } from './+types/index';
import { DateTime } from '@/components/date';
import {
  ContactAboutCard,
  ContactGroupsCard,
  ContactOrganizationsCard,
  ContactPlatformAccountCard,
  ContactSummaryStrip,
  ContactTimeline,
  StatTile,
  isPlatformUser,
} from '@/features/contact';
import { fraudDecisionColor } from '@/features/fraud';
import {
  useContactGroupMembershipListQuery,
  useFraudEvaluationListQuery,
  usePlatformAccessQuery,
  useUserEmailListQuery,
  useUserOrganizationListQuery,
} from '@/resources/request/client';
import { metaObject, startCase } from '@/utils/helpers';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';
import * as React from 'react';

/** Big-text colour for a platform-access state, mirroring the state badge palette. */
const ACCESS_STATE_COLOR: Record<string, string> = {
  Approved: 'text-green-600 dark:text-green-400',
  Pending: 'text-yellow-600 dark:text-yellow-400',
  Rejected: 'text-red-600 dark:text-red-400',
  Suspended: 'text-amber-600 dark:text-amber-400',
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { contactName } = getContactDetailMetadata(matches);
  return metaObject(`Overview - ${contactName}`);
};

/** Counts memberships whose role name contains the given keyword (e.g. "owner", "editor"). */
function countRole(
  memberships: { spec?: { roles?: { name?: string }[] } }[],
  keyword: string
): number {
  return memberships.filter((m) =>
    (m.spec?.roles ?? []).some((r) => (r.name ?? '').toLowerCase().includes(keyword))
  ).length;
}

export default function Page() {
  const data = useContactDetailData();
  const contact = data?.contact;
  const user = data?.user;
  const contactName = contact?.metadata?.name ?? '';
  const email = contact?.spec?.email ?? '';
  const linked = isPlatformUser(contact);
  const userId = linked ? (user?.metadata?.name ?? '') : '';

  // Contact-scoped (available for prospects too).
  const groupsQuery = useContactGroupMembershipListQuery(contactName);
  const groupCount = groupsQuery.data?.items?.length ?? 0;

  // User-only stats (omitted for a prospect).
  const { data: platformAccess, isLoading: accessLoading } = usePlatformAccessQuery(userId);
  const accessState = platformAccess?.spec?.state;

  const orgsQuery = useUserOrganizationListQuery(userId);
  const orgs = React.useMemo(() => orgsQuery.data?.items ?? [], [orgsQuery.data]);
  const orgCount = orgs.length;
  const ownerCount = countRole(orgs, 'owner');
  const editorCount = countRole(orgs, 'editor');
  const orgHint = [
    ownerCount ? `Owner of ${ownerCount}` : null,
    editorCount ? `editor of ${editorCount}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const { data: fraudData, isLoading: fraudLoading } = useFraudEvaluationListQuery(
    userId ? { search: userId } : undefined,
    { enabled: !!userId }
  );
  const latestEval = fraudData?.items?.[0];

  const { data: emails, isLoading: emailsLoading } = useUserEmailListQuery(userId, email, {
    enabled: linked && !!email,
  });
  const emailCount = emails?.items?.length ?? 0;

  return (
    <div className="m-4 flex flex-col gap-4">
      <ContactSummaryStrip>
        {linked && (
          <StatTile
            label={<Trans>Platform access</Trans>}
            loading={accessLoading}
            value={
              accessState ? (
                <span className={ACCESS_STATE_COLOR[accessState] ?? ''}>
                  {startCase(accessState)}
                </span>
              ) : (
                '—'
              )
            }
            hint={
              user?.metadata?.creationTimestamp ? (
                <span>
                  <Trans>Signed up</Trans> <DateTime date={user.metadata.creationTimestamp} />
                </span>
              ) : undefined
            }
          />
        )}
        {linked && (
          <StatTile
            label={<Trans>Organizations</Trans>}
            loading={orgsQuery.isLoading}
            value={orgCount}
            hint={orgHint || undefined}
          />
        )}
        <StatTile
          label={<Trans>Contact groups</Trans>}
          loading={groupsQuery.isLoading}
          value={groupCount}
        />
        {linked && (
          <StatTile label={<Trans>Emails sent</Trans>} loading={emailsLoading} value={emailCount} />
        )}
        {linked && (
          <StatTile
            label={<Trans>Fraud check</Trans>}
            loading={fraudLoading}
            value={
              latestEval?.status?.decision ? (
                <span className={cn(fraudDecisionColor(latestEval.status.decision))}>
                  {startCase(latestEval.status.decision)}
                </span>
              ) : (
                '—'
              )
            }
            hint={
              latestEval?.status?.lastEvaluationTime ? (
                <span>
                  <Trans>Evaluated</Trans> <DateTime date={latestEval.status.lastEvaluationTime} />
                </span>
              ) : undefined
            }
          />
        )}
      </ContactSummaryStrip>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main column — read-only activity timeline (#759). */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <ContactTimeline contact={contact} user={user} linked={linked} />
        </div>

        {/* Right rail — read-only context cards (interactions land with #760 / #761 / #762). */}
        <div className="flex flex-col gap-4">
          <ContactAboutCard contact={contact} />
          {linked && <ContactPlatformAccountCard user={user} />}
          {linked && <ContactOrganizationsCard userId={userId} />}
          <ContactGroupsCard contactName={contactName} />
        </div>
      </div>
    </div>
  );
}
