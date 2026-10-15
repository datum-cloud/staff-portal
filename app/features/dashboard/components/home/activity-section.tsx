import { HomeColumn } from './home-column';
import { createActivityClientConfig } from '@/features/activity/lib/activity-client';
import {
  staffResourceLinkResolver,
  staffTenantLinkResolver,
} from '@/features/activity/lib/activity-link-resolvers';
import { activityRoutes } from '@/utils/config/routes.config';
import { ActivityApiClient, ActivityFeed } from '@datum-cloud/activity-ui';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';
import { useMemo, useState } from 'react';

type Source = 'human' | 'all';

const SOURCES: { value: Source; label: React.ReactNode }[] = [
  { value: 'human', label: <Trans>Changes</Trans> },
  { value: 'all', label: <Trans>All</Trans> },
];

/**
 * Platform-wide activity, like cloud-portal's project home Activity column:
 * people's changes by default, or everything including system activity.
 */
export function ActivitySection() {
  const [source, setSource] = useState<Source>('human');
  const client = useMemo(() => new ActivityApiClient(createActivityClientConfig()), []);

  return (
    <HomeColumn
      title={<Trans>Activity</Trans>}
      href={activityRoutes.feed()}
      bodyClassName="h-auto"
      action={
        <div role="group" aria-label="Show" className="bg-muted flex rounded-md p-0.5">
          {SOURCES.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-pressed={source === s.value}
              onClick={() => setSource(s.value)}
              className={cn(
                'rounded px-2 py-0.5 text-xs transition-colors',
                source === s.value
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}>
              {s.label}
            </button>
          ))}
        </div>
      }>
      {/* Remount on source change so the feed refetches with the new filter. */}
      <ActivityFeed
        key={source}
        client={client}
        initialFilters={{ changeSource: source }}
        initialTimeRange={{ start: 'now-7d' }}
        showFilters={false}
        compact
        pageSize={10}
        infiniteScroll={false}
        resourceLinkResolver={staffResourceLinkResolver}
        tenantLinkResolver={staffTenantLinkResolver}
        className="shadow-none"
      />
    </HomeColumn>
  );
}
