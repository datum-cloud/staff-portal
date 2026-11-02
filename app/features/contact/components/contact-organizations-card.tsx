import { EmptyState } from '@/components/empty-state';
import { UserAvatar } from '@/components/user-avatar';
import { SectionCard } from '@/features/milo';
import { useUserOrganizationListQuery } from '@/resources/request/client';
import { orgRoutes } from '@/utils/config/routes.config';
import { startCase } from '@/utils/helpers';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { Building2, Link2Off } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';

type Props = {
  /** The contact's linked user id (`contact.spec.subject.name`), or empty when unlinked. */
  userId: string;
  className?: string;
};

/**
 * Read-only "Organizations" card: the organizations a linked user belongs to,
 * as a compact list to fit the overview's right rail. The full membership table
 * lives on the user detail view; richer management lands with #762.
 */
export function ContactOrganizationsCard({ userId, className }: Props) {
  const query = useUserOrganizationListQuery(userId);
  const memberships = useMemo(() => query.data?.items ?? [], [query.data]);

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
      ) : query.isLoading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : memberships.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={<Trans>No organizations</Trans>}
          description={<Trans>This user isn&apos;t a member of any organizations.</Trans>}
        />
      ) : (
        <ul className="divide-y">
          {memberships.map((m) => {
            const orgName = m.spec?.organizationRef?.name ?? '';
            const displayName = m.status?.organization?.displayName || orgName;
            const roles = (m.spec?.roles ?? [])
              .map((r) => (r.name ? startCase(r.name) : ''))
              .filter(Boolean);
            return (
              <li
                key={`${m.metadata?.namespace ?? ''}/${m.metadata?.name ?? ''}`}
                className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <UserAvatar name={displayName} className="size-8 shrink-0" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link to={orgRoutes.detail(orgName)} className="truncate text-sm">
                    {displayName}
                  </Link>
                  <Text size="xs" textColor="muted" className="truncate">
                    {orgName}
                  </Text>
                </div>
                {roles.length ? (
                  <Text size="xs" textColor="muted" className="shrink-0">
                    {roles.join(', ')}
                  </Text>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
