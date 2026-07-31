import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DisplayName } from '@/components/display';
import { SectionCard } from '@/features/milo';
import {
  useOrganizationBusinessNamesQuery,
  useUserOrganizationListQuery,
} from '@/resources/request/client';
import { orgRoutes } from '@/utils/config/routes.config';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { useMemo } from 'react';

type Props = {
  /** The contact's linked user id (`contact.spec.subject.name`), or empty when unlinked. */
  userId: string;
  className?: string;
};

export function ContactOrganizationsCard({ userId, className }: Props) {
  const tableQuery = useUserOrganizationListQuery(userId);
  const memberships = useMemo(() => tableQuery.data?.items ?? [], [tableQuery.data]);

  const orgNames = useMemo(
    () => memberships.map((m) => m.spec?.organizationRef?.name ?? '').filter(Boolean),
    [memberships]
  );
  const { data: businessNames = {} } = useOrganizationBusinessNamesQuery(orgNames);

  return (
    <SectionCard className={className} title={<Trans>Organizations</Trans>}>
      {!userId ? (
        <Text textColor="muted" size="sm">
          <Trans>
            This contact isn&apos;t linked to a platform user, so organization memberships
            aren&apos;t available.
          </Trans>
        </Text>
      ) : tableQuery.isLoading ? (
        <Text textColor="muted" size="sm">
          <Trans>Loading…</Trans>
        </Text>
      ) : memberships.length === 0 ? (
        <Text textColor="muted" size="sm">
          <Trans>This user isn&apos;t a member of any organizations.</Trans>
        </Text>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="py-2 pr-3 font-medium">
                  <Trans>Organization</Trans>
                </th>
                <th className="py-2 pr-3 font-medium">
                  <Trans>Role</Trans>
                </th>
                <th className="py-2 pr-3 font-medium">
                  <Trans>Business name</Trans>
                </th>
                <th className="py-2 pr-3 font-medium">
                  <Trans>Type</Trans>
                </th>
                <th className="py-2 font-medium">
                  <Trans>Joined</Trans>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {memberships.map((m) => {
                const orgName = m.spec?.organizationRef?.name ?? '';
                const displayName = m.status?.organization?.displayName;
                const roles = (m.spec?.roles ?? []).map((r) => r.name).filter(Boolean);
                return (
                  <tr key={`${m.metadata?.namespace ?? ''}/${m.metadata?.name ?? ''}`}>
                    <td className="py-2 pr-3">
                      <DisplayName
                        displayName={displayName || orgName}
                        name={orgName}
                        to={orgRoutes.detail(orgName)}
                      />
                    </td>
                    <td className="py-2 pr-3">{roles.length ? roles.join(', ') : '—'}</td>
                    <td className="py-2 pr-3">{businessNames[orgName] ?? '—'}</td>
                    <td className="py-2 pr-3">
                      <BadgeState state={m.status?.organization?.type ?? ''} />
                    </td>
                    <td className="py-2">
                      <DateTime date={m.metadata?.creationTimestamp} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
