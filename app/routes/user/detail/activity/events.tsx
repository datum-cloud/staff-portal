import { createActivityClientConfig } from '@/lib/activity-client';
import { EventsFeed, ActivityApiClient } from '@datum-cloud/activity-ui';
import { useMemo } from 'react';

export default function Page() {
  const client = useMemo(() => new ActivityApiClient(createActivityClientConfig()), []);

  return <EventsFeed client={client} pageSize={50} className="bg-card border-border border" />;
}
