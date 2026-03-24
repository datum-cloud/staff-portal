import { createActivityClientConfig } from '@/features/activity/lib/activity-client';
import {
  parseEventFilters,
  parseTimeRange,
  serializeEventFilters,
} from '@/features/activity/lib/activity-filters';
import {
  EventsFeed,
  ActivityApiClient,
  type EventsFeedFilterState,
  type TimeRange,
} from '@datum-cloud/activity-ui';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

// Create client with proxy URL - no loader needed
const clientConfig = createActivityClientConfig();

/**
 * Events Tab
 *
 * Supports bi-directional deep linking:
 * - URL → Component: Filters parsed from URL on mount
 * - Component → URL: Filter changes synced back to URL
 * - URL navigation: Component remounts when URL changes externally
 */
export default function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize client in browser with proxy URL
  const client = new ActivityApiClient(clientConfig);

  // Parse filters from URL for initial state
  const initialFilters = useMemo(
    () => parseEventFilters(searchParams),
    [] // Only compute on mount - component handles state after that
  );
  const initialTimeRange = useMemo(() => parseTimeRange(searchParams) || { start: 'now-24h' }, []);

  // Check if streaming is explicitly disabled (shared link)
  const streamingEnabled = searchParams.get('streaming') !== 'false';

  // Sync filter changes back to URL for deep linking
  const handleFiltersChange = useCallback(
    (filters: EventsFeedFilterState, timeRange: TimeRange) => {
      const newParams = serializeEventFilters(filters, timeRange, streamingEnabled);
      setSearchParams(newParams, { replace: true });
    },
    [setSearchParams, streamingEnabled]
  );

  // Generate a stable key from URL params to force remount on external URL changes
  const componentKey = searchParams.toString();

  return (
    <EventsFeed
      key={componentKey}
      client={client}
      initialFilters={initialFilters}
      initialTimeRange={initialTimeRange}
      onFiltersChange={handleFiltersChange}
      showFilters={true}
      enableStreaming={streamingEnabled}
      pageSize={50}
      className="bg-card border-border border"
    />
  );
}
