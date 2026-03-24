import type {
  ActivityFeedFilterState as ActivityFeedFilters,
  EventsFeedFilterState as EventsFeedFilters,
  TimeRange,
} from '@datum-cloud/activity-ui';

export function serializeActivityFilters(
  filters: Partial<ActivityFeedFilters>,
  timeRange: TimeRange,
  streamingEnabled: boolean = true
): URLSearchParams {
  const params = new URLSearchParams();
  if (timeRange.start) params.set('start', timeRange.start);
  if (timeRange.end) params.set('end', timeRange.end);
  if (!streamingEnabled) params.set('streaming', 'false');
  if (filters.changeSource && filters.changeSource !== 'human') {
    params.set('changeSource', filters.changeSource);
  }
  if (filters.actorNames?.length) params.set('actorNames', filters.actorNames.join(','));
  if (filters.resourceKinds?.length) params.set('resourceKinds', filters.resourceKinds.join(','));
  if (filters.apiGroups?.length) params.set('apiGroups', filters.apiGroups.join(','));
  if (filters.resourceNamespaces?.length) {
    params.set('resourceNamespaces', filters.resourceNamespaces.join(','));
  }
  if (filters.resourceUid) params.set('resourceUid', filters.resourceUid);
  if (filters.resourceName) params.set('resourceName', filters.resourceName);
  if (filters.search) params.set('search', filters.search);
  return params;
}

export function serializeEventFilters(
  filters: Partial<EventsFeedFilters>,
  timeRange: TimeRange,
  streamingEnabled: boolean = true
): URLSearchParams {
  const params = new URLSearchParams();
  if (timeRange.start) params.set('start', timeRange.start);
  if (timeRange.end) params.set('end', timeRange.end);
  if (!streamingEnabled) params.set('streaming', 'false');
  if (filters.eventType && filters.eventType !== 'all') params.set('eventType', filters.eventType);
  if (filters.reasons?.length) params.set('reasons', filters.reasons.join(','));
  if (filters.namespaces?.length) params.set('namespaces', filters.namespaces.join(','));
  if (filters.involvedKinds?.length) params.set('involvedKinds', filters.involvedKinds.join(','));
  if (filters.search) params.set('search', filters.search);
  return params;
}

export function parseActivityFilters(searchParams: URLSearchParams): Partial<ActivityFeedFilters> {
  const filters: Partial<ActivityFeedFilters> = {};
  const changeSource = searchParams.get('changeSource');
  if (changeSource === 'human' || changeSource === 'system' || changeSource === 'all') {
    filters.changeSource = changeSource;
  } else {
    filters.changeSource = 'human';
  }

  const actorNames = searchParams.get('actorNames');
  if (actorNames) filters.actorNames = actorNames.split(',').filter(Boolean);
  const resourceKinds = searchParams.get('resourceKinds');
  if (resourceKinds) filters.resourceKinds = resourceKinds.split(',').filter(Boolean);
  const apiGroups = searchParams.get('apiGroups');
  if (apiGroups) filters.apiGroups = apiGroups.split(',').filter(Boolean);
  const resourceNamespaces = searchParams.get('resourceNamespaces');
  if (resourceNamespaces)
    filters.resourceNamespaces = resourceNamespaces.split(',').filter(Boolean);
  const resourceUid = searchParams.get('resourceUid');
  if (resourceUid) filters.resourceUid = resourceUid;
  const resourceName = searchParams.get('resourceName');
  if (resourceName) filters.resourceName = resourceName;
  const search = searchParams.get('search');
  if (search) filters.search = search;
  return filters;
}

export function parseEventFilters(searchParams: URLSearchParams): Partial<EventsFeedFilters> {
  const filters: Partial<EventsFeedFilters> = {};
  const eventType = searchParams.get('eventType');
  if (eventType === 'Normal' || eventType === 'Warning' || eventType === 'all') {
    filters.eventType = eventType;
  }
  const reasons = searchParams.get('reasons');
  if (reasons) filters.reasons = reasons.split(',').filter(Boolean);
  const namespaces = searchParams.get('namespaces');
  if (namespaces) filters.namespaces = namespaces.split(',').filter(Boolean);
  const involvedKinds = searchParams.get('involvedKinds');
  if (involvedKinds) filters.involvedKinds = involvedKinds.split(',').filter(Boolean);
  const search = searchParams.get('search');
  if (search) filters.search = search;
  return filters;
}

export function parseTimeRange(searchParams: URLSearchParams) {
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  if (!start) return undefined;
  return { start, end: end || undefined };
}
