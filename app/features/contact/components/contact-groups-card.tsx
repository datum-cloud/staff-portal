import { BadgeState } from '@/components/badge';
import { EmptyState } from '@/components/empty-state';
import { UserAvatar } from '@/components/user-avatar';
import { SectionCard } from '@/features/milo';
import { useContactGroupMembershipListQuery } from '@/resources/request/client';
import { contactGroupRoutes } from '@/utils/config/routes.config';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { BookUser } from 'lucide-react';
import { Link } from 'react-router';

type Props = {
  contactName: string;
  className?: string;
};

/**
 * Read-only "Contact groups" card: the groups a contact belongs to, with
 * visibility. Add/remove management lands with #761.
 */
export function ContactGroupsCard({ contactName, className }: Props) {
  const query = useContactGroupMembershipListQuery(contactName);
  const items = query.data?.items ?? [];

  return (
    <SectionCard title={<Trans>Contact groups</Trans>} className={className}>
      {query.isLoading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={BookUser}
          title={<Trans>No contact groups</Trans>}
          description={<Trans>This contact isn&apos;t in any groups yet.</Trans>}
        />
      ) : (
        <ul className="divide-y">
          {items.map((m) => {
            const groupName = m.contactGroup?.metadata?.name ?? m.spec?.contactGroupRef?.name ?? '';
            const displayName = m.contactGroup?.spec?.displayName;
            const visibility = m.contactGroup?.spec?.visibility;
            return (
              <li
                key={m.metadata?.name ?? groupName}
                className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <UserAvatar name={displayName || groupName} className="size-8 shrink-0" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link to={contactGroupRoutes.detail(groupName)} className="truncate text-sm">
                    {displayName || groupName}
                  </Link>
                  <Text size="xs" textColor="muted" className="truncate">
                    {groupName}
                  </Text>
                </div>
                {visibility ? <BadgeState state={visibility} /> : null}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
