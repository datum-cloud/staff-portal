import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DisplayName } from '@/components/display';
import { EmptyState } from '@/components/empty-state';
import { SectionCard } from '@/features/milo';
import {
  useOrganizationBusinessNamesQuery,
  useUserOrganizationListQuery,
} from '@/resources/request/client';
import { orgRoutes } from '@/utils/config/routes.config';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Trans } from '@lingui/react/macro';
import { Building2, Link2Off } from 'lucide-react';
import { useMemo } from 'react';

type Props = {
  /** The contact's linked user id (`contact.spec.subject.name`), or empty when unlinked. */
  userId: string;
  className?: string;
};

const COLUMNS = ['Organization', 'Role', 'Business name', 'Type', 'Joined'];

function OrganizationsTableSkeleton() {
  return (
    <div className="overflow-x-auto" aria-busy="true">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left text-xs">
            {COLUMNS.map((c) => (
              <th key={c} className="py-2 pr-3 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {Array.from({ length: 3 }).map((_, i) => (
            <tr key={i}>
              <td className="py-2.5 pr-3">
                <Skeleton className="h-3.5 w-32" />
              </td>
              <td className="py-2.5 pr-3">
                <Skeleton className="h-3.5 w-20" />
              </td>
              <td className="py-2.5 pr-3">
                <Skeleton className="h-3.5 w-24" />
              </td>
              <td className="py-2.5 pr-3">
                <Skeleton className="h-4 w-16 rounded-full" />
              </td>
              <td className="py-2.5">
                <Skeleton className="h-3.5 w-20" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
        <EmptyState
          icon={Link2Off}
          title={<Trans>Not linked to a user</Trans>}
          description={
            <Trans>
              This contact isn&apos;t linked to a platform user, so organization memberships
              aren&apos;t available.
            </Trans>
          }
        />
      ) : tableQuery.isLoading ? (
        <OrganizationsTableSkeleton />
      ) : memberships.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={<Trans>No organizations</Trans>}
          description={<Trans>This user isn&apos;t a member of any organizations.</Trans>}
        />
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
