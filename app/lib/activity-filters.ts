import type {
  ActivityFeedFilterState as ActivityFeedFilters,
  EventsFeedFilterState as EventsFeedFilters,
  TimeRange,
} from '@datum-cloud/activity-ui';

/**
 * Serialize Activity Feed filters to URL search params.
 * Used to sync filter changes back to the URL for deep linking.
 */
export function serializeActivityFilters(
  filters: Partial<ActivityFeedFilters>,
  timeRange: TimeRange,
  streamingEnabled: boolean = true
): URLSearchParams {
  const params = new URLSearchParams();

  // Time range
  if (timeRange.start) {
    params.set('start', timeRange.start);
  }
  if (timeRange.end) {
    params.set('end', timeRange.end);
  }

  // Streaming flag (only set if explicitly disabled)
  if (!streamingEnabled) {
    params.set('streaming', 'false');
  }

  // Change source (skip default 'human' to keep URLs clean)
  if (filters.changeSource && filters.changeSource !== 'human') {
    params.set('changeSource', filters.changeSource);
  }

  // Actor names (comma-separated)
  if (filters.actorNames && filters.actorNames.length > 0) {
    params.set('actorNames', filters.actorNames.join(','));
  }

  // Resource kinds (comma-separated)
  if (filters.resourceKinds && filters.resourceKinds.length > 0) {
    params.set('resourceKinds', filters.resourceKinds.join(','));
  }

  // API groups (comma-separated)
  if (filters.apiGroups && filters.apiGroups.length > 0) {
    params.set('apiGroups', filters.apiGroups.join(','));
  }

  // Resource namespaces (comma-separated)
  if (filters.resourceNamespaces && filters.resourceNamespaces.length > 0) {
    params.set('resourceNamespaces', filters.resourceNamespaces.join(','));
  }

  // Resource UID (single value)
  if (filters.resourceUid) {
    params.set('resourceUid', filters.resourceUid);
  }

  // Resource name (partial match)
  if (filters.resourceName) {
    params.set('resourceName', filters.resourceName);
  }

  // Search text
  if (filters.search) {
    params.set('search', filters.search);
  }

  return params;
}

/**
 * Serialize Events Feed filters to URL search params.
 * Used to sync filter changes back to the URL for deep linking.
 */
export function serializeEventFilters(
  filters: Partial<EventsFeedFilters>,
  timeRange: TimeRange,
  streamingEnabled: boolean = true
): URLSearchParams {
  const params = new URLSearchParams();

  // Time range
  if (timeRange.start) {
    params.set('start', timeRange.start);
  }
  if (timeRange.end) {
    params.set('end', timeRange.end);
  }

  // Streaming flag (only set if explicitly disabled)
  if (!streamingEnabled) {
    params.set('streaming', 'false');
  }

  // Event type (skip default to keep URLs clean)
  if (filters.eventType && filters.eventType !== 'all') {
    params.set('eventType', filters.eventType);
  }

  // Reasons (comma-separated)
  if (filters.reasons && filters.reasons.length > 0) {
    params.set('reasons', filters.reasons.join(','));
  }

  // Namespaces (comma-separated)
  if (filters.namespaces && filters.namespaces.length > 0) {
    params.set('namespaces', filters.namespaces.join(','));
  }

  // Involved kinds (comma-separated)
  if (filters.involvedKinds && filters.involvedKinds.length > 0) {
    params.set('involvedKinds', filters.involvedKinds.join(','));
  }

  // Search text
  if (filters.search) {
    params.set('search', filters.search);
  }

  return params;
}

/**
 * Parse Activity Feed filters from URL query params
 */
export function parseActivityFilters(searchParams: URLSearchParams): Partial<ActivityFeedFilters> {
  const filters: Partial<ActivityFeedFilters> = {};

  // Change source (human/system/all) - defaults to 'human'
  const changeSource = searchParams.get('changeSource');
  if (changeSource === 'human' || changeSource === 'system' || changeSource === 'all') {
    filters.changeSource = changeSource;
  } else {
    filters.changeSource = 'human';
  }

  // Actor names (comma-separated)
  const actorNames = searchParams.get('actorNames');
  if (actorNames) {
    filters.actorNames = actorNames.split(',').filter(Boolean);
  }

  // Resource kinds (comma-separated)
  const resourceKinds = searchParams.get('resourceKinds');
  if (resourceKinds) {
    filters.resourceKinds = resourceKinds.split(',').filter(Boolean);
  }

  // API groups (comma-separated)
  const apiGroups = searchParams.get('apiGroups');
  if (apiGroups) {
    filters.apiGroups = apiGroups.split(',').filter(Boolean);
  }

  // Resource UID (single value)
  const resourceUid = searchParams.get('resourceUid');
  if (resourceUid) {
    filters.resourceUid = resourceUid;
  }

  // Search text
  const search = searchParams.get('search');
  if (search) {
    filters.search = search;
  }

  return filters;
}

/**
 * Parse Events Feed filters from URL query params
 */
export function parseEventFilters(searchParams: URLSearchParams): Partial<EventsFeedFilters> {
  const filters: Partial<EventsFeedFilters> = {};

  // Event type (Normal/Warning/all)
  const eventType = searchParams.get('eventType');
  if (eventType === 'Normal' || eventType === 'Warning' || eventType === 'all') {
    filters.eventType = eventType;
  }

  // Reasons (comma-separated, multi-select)
  const reasons = searchParams.get('reasons');
  if (reasons) {
    filters.reasons = reasons.split(',').filter(Boolean);
  }

  // Namespaces (comma-separated, multi-select)
  const namespaces = searchParams.get('namespaces');
  if (namespaces) {
    filters.namespaces = namespaces.split(',').filter(Boolean);
  }

  // Involved kinds (comma-separated, multi-select)
  const involvedKinds = searchParams.get('involvedKinds');
  if (involvedKinds) {
    filters.involvedKinds = involvedKinds.split(',').filter(Boolean);
  }

  // Search text
  const search = searchParams.get('search');
  if (search) {
    filters.search = search;
  }

  return filters;
}

/**
 * Parse time range from URL query params
 */
export function parseTimeRange(searchParams: URLSearchParams) {
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  if (!start) {
    return undefined;
  }

  return { start, end: end || undefined };
}
