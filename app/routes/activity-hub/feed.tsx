import { createActivityClientConfig } from '@/features/activity/lib/activity-client';
import {
  parseActivityFilters,
  parseTimeRange,
  serializeActivityFilters,
} from '@/features/activity/lib/activity-filters';
import {
  staffResourceLinkResolver,
  staffTenantLinkResolver,
} from '@/features/activity/lib/activity-link-resolvers';
import { activityRoutes } from '@/utils/config/routes.config';
import {
  ActivityFeed,
  ActivityApiClient,
  TenantBadge,
  type ActivityFeedFilterState,
  type TimeRange,
  type Tenant,
} from '@datum-cloud/activity-ui';
import { useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router';

// Create client with proxy URL - no loader needed
const clientConfig = createActivityClientConfig();

/**
 * Activity Feed Tab
 *
 * Supports bi-directional deep linking:
 * - URL → Component: Filters parsed from URL on mount
 * - Component → URL: Filter changes synced back to URL
 * - URL navigation: Component remounts when URL changes externally
 */
export default function ActivityFeedPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Initialize client in browser with proxy URL
  const client = new ActivityApiClient(clientConfig);

  // Parse filters from URL for initial state
  const initialFilters = useMemo(
    () => parseActivityFilters(searchParams),
    [] // Only compute on mount - component handles state after that
  );
  const initialTimeRange = useMemo(() => parseTimeRange(searchParams) || { start: 'now-7d' }, []);

  // Check if streaming is explicitly disabled (shared link)
  const streamingEnabled = searchParams.get('streaming') !== 'false';

  // Sync filter changes back to URL for deep linking
  const handleFiltersChange = useCallback(
    (filters: ActivityFeedFilterState, timeRange: TimeRange) => {
      const newParams = serializeActivityFilters(filters, timeRange, streamingEnabled);
      setSearchParams(newParams, { replace: true });
    },
    [setSearchParams, streamingEnabled]
  );

  // Handle create policy click - navigate to policy creation
  const handleCreatePolicy = () => {
    navigate(`${activityRoutes.policies.list()}?create=true`);
  };

  // Custom tenant renderer that uses programmatic navigation
  const handleTenantClick = useCallback(
    (tenant: Tenant, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const url = staffTenantLinkResolver(tenant);
      if (url) {
        navigate(url);
      }
    },
    [navigate]
  );

  const renderTenant = useCallback(
    (tenant: Tenant) => {
      const url = staffTenantLinkResolver(tenant);
      return (
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => handleTenantClick(tenant, e)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleTenantClick(tenant, e as unknown as React.MouseEvent);
            }
          }}
          className={url ? 'cursor-pointer' : ''}
          style={{ pointerEvents: 'auto' }}>
          <TenantBadge tenant={tenant} size="compact" />
        </div>
      );
    },
    [handleTenantClick]
  );

  return (
    <ActivityFeed
      client={client}
      initialFilters={initialFilters}
      initialTimeRange={initialTimeRange}
      onFiltersChange={handleFiltersChange}
      showFilters={true}
      enableStreaming={streamingEnabled}
      resourceLinkResolver={staffResourceLinkResolver}
      tenantRenderer={renderTenant}
      onCreatePolicy={handleCreatePolicy}
      pageSize={50}
      compact={true}
      className="bg-card border-border border"
    />
  );
}
