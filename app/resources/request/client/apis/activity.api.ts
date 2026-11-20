import { buildActivityFilter } from '@/modules/assistant/tools/activity-query';
import { PROXY_URL } from '@/modules/axios/axios.client';
import { ActivityQueryParams, ListQueryParams } from '@/resources/schemas';
import { walkCursorPages } from '@/utils/helpers/pagination.helper';
import {
  createActivityMiloapisComV1Alpha1AuditLogQuery,
  createActivityMiloapisComV1Alpha1EventQuery,
} from '@openapi/activity.miloapis.com/v1alpha1';
import type {
  ComMiloapisGoActivityPkgApisActivityV1Alpha1AuditLogQuery,
  IoK8sApiEventsV1Event,
  IoK8sApiserverPkgApisAuditV1Event,
} from '@openapi/activity.miloapis.com/v1alpha1';
import { subDays } from 'date-fns';

function convertTimestampToISO(timestamp: number): string {
  const timestampMs = timestamp / 1000000;
  const date = new Date(timestampMs);
  return date.toISOString();
}

function buildCelFilter(params: ActivityQueryParams): string | undefined {
  const conditions: string[] = [];
  conditions.push(`objectRef.apiGroup != 'activity.miloapis.com'`);

  if (params.actions) {
    const actions = params.actions
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
    if (actions.length === 1) {
      conditions.push(`verb == '${actions[0]}'`);
    } else if (actions.length > 1) {
      const actionList = actions.map((a) => `'${a}'`).join(', ');
      conditions.push(`verb in [${actionList}]`);
    }
  }

  if (params.user) {
    conditions.push(`user.username == '${params.user}'`);
  }

  if (params.responseCode) {
    const codes = params.responseCode
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => parseInt(c, 10))
      .filter((c) => !isNaN(c));
    if (codes.length === 1) {
      conditions.push(`responseStatus.code == ${codes[0]}`);
    } else if (codes.length > 1) {
      conditions.push(`responseStatus.code in [${codes.join(', ')}]`);
    }
  }

  if (params.resourceType) {
    const resources = params.resourceType
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
    if (resources.length === 1) {
      conditions.push(`objectRef.resource == '${resources[0]}'`);
    } else if (resources.length > 1) {
      const resourceList = resources.map((r) => `'${r}'`).join(', ');
      conditions.push(`objectRef.resource in [${resourceList}]`);
    }
  }

  if (params.apiGroup) {
    const groups = params.apiGroup
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean);
    if (groups.length === 1) {
      conditions.push(`objectRef.apiGroup == '${groups[0]}'`);
    } else if (groups.length > 1) {
      const groupList = groups.map((g) => `'${g}'`).join(', ');
      conditions.push(`objectRef.apiGroup in [${groupList}]`);
    }
  }

  if (params.namespace) {
    conditions.push(`objectRef.namespace == '${params.namespace}'`);
  }

  if (params.resourceName) {
    conditions.push(`objectRef.name == '${params.resourceName}'`);
  }

  if (params.sourceIP) {
    conditions.push(`'${params.sourceIP}' in sourceIPs`);
  }

  return conditions.length > 0 ? conditions.join(' && ') : undefined;
}

function getBaseUrl(organization?: string, project?: string): string {
  if (project) {
    return `${PROXY_URL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${project}/control-plane`;
  } else if (organization) {
    return `${PROXY_URL}/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${organization}/control-plane`;
  }
  return PROXY_URL;
}

export const getPreviousActivity = async (activity: any, baseURL?: string): Promise<any | null> => {
  const resourceType = activity?.objectRef?.resource;
  const resourceName = activity?.objectRef?.name;
  const resourceNamespace = activity?.objectRef?.namespace;
  const currentAuditId = activity?.auditID;

  if (!resourceType || !resourceName) {
    return null;
  }

  try {
    const url = baseURL || PROXY_URL;
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const startTime = thirtyDaysAgo.toISOString();
    const endTime = now.toISOString();

    const response = await createActivityMiloapisComV1Alpha1AuditLogQuery({
      baseURL: url,
      body: {
        apiVersion: 'activity.miloapis.com/v1alpha1',
        kind: 'AuditLogQuery',
        metadata: {
          name: `query-prev-${Date.now()}`,
        },
        spec: {
          startTime,
          endTime,
          limit: 10,
          filter: `objectRef.resource == '${resourceType}' && objectRef.name == '${resourceName}' && user.username.startsWith('system:') == false && objectRef.apiGroup != 'activity.miloapis.com'${
            resourceNamespace ? ` && objectRef.namespace == '${resourceNamespace}'` : ''
          }`,
        },
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const results = response.data?.data?.status?.results || [];
    const previousActivity = results.find(
      (result: any) => result?.auditID && result.auditID !== currentAuditId
    );

    return previousActivity || null;
  } catch (error) {
    console.error('Failed to fetch previous activity:', error);
    return null;
  }
};

export const activityListQuery = async (
  resourceType?: string,
  resourceId?: string,
  params?: ListQueryParams<ActivityQueryParams>
) => {
  const baseURL = getBaseUrl(
    params?.filters?.organization,
    params?.filters?.project || (resourceType === 'project' ? resourceId : undefined)
  );

  const now = new Date();
  const defaultStartTime = subDays(now, 7).toISOString();
  const defaultEndTime = now.toISOString();

  const startTime = params?.filters?.start
    ? typeof params.filters.start === 'string'
      ? params.filters.start
      : convertTimestampToISO(params.filters.start)
    : defaultStartTime;
  const endTime = params?.filters?.end
    ? typeof params.filters.end === 'string'
      ? params.filters.end
      : convertTimestampToISO(params.filters.end)
    : defaultEndTime;

  const filter = buildCelFilter(params?.filters || {});

  const auditLogQuery: ComMiloapisGoActivityPkgApisActivityV1Alpha1AuditLogQuery = {
    apiVersion: 'activity.miloapis.com/v1alpha1',
    kind: 'AuditLogQuery',
    metadata: {
      name: `query-${Date.now()}`,
    },
    spec: {
      startTime,
      endTime,
      limit: params?.limit || 100,
      ...(params?.cursor && { continue: params.cursor }),
      ...(filter && { filter }),
    },
  };

  const response = await createActivityMiloapisComV1Alpha1AuditLogQuery({
    baseURL,
    body: auditLogQuery,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const status = response.data?.data?.status;
  if (!status) {
    throw new Error('No status in AuditLogQuery response');
  }

  const responseData = {
    logs: status.results || [],
    query: '',
    timeRange: {
      start: status.effectiveStartTime || '',
      end: status.effectiveEndTime || '',
    },
    nextPageToken: status.continue || undefined,
    hasNextPage: !!status.continue,
  };

  return { ...response.data, data: responseData };
};

/** A control plane whose events can be queried: an organization's or a project's. */
export type EventScope = { kind: 'organization' | 'project'; name: string };

const eventScopeBaseURL = ({ kind, name }: EventScope) =>
  `${PROXY_URL}/apis/resourcemanager.miloapis.com/v1alpha1/${
    kind === 'organization' ? 'organizations' : 'projects'
  }/${encodeURIComponent(name)}/control-plane`;

// The API's maximum page; a day of warnings for one control plane rarely needs more.
const WARNING_EVENTS_PAGE_LIMIT = 1000;
// Safety net against a runaway walk.
const WARNING_EVENTS_MAX_PAGES = 5;

/**
 * Warning events from the last 24 hours on one control plane, through
 * EventQuery (staff can't list live events). A query only covers its own
 * control plane: an organization's doesn't include its projects' events.
 */
export const warningEventsQuery = (scope: EventScope, signal?: AbortSignal) =>
  walkCursorPages<IoK8sApiEventsV1Event>(
    async (cursor) => {
      const response = await createActivityMiloapisComV1Alpha1EventQuery({
        baseURL: eventScopeBaseURL(scope),
        signal,
        // The generated SDK sends `*/*`, which the API rejects.
        headers: { 'Content-Type': 'application/json' },
        body: {
          apiVersion: 'activity.miloapis.com/v1alpha1',
          kind: 'EventQuery',
          metadata: { name: `warning-events-${Date.now()}` },
          spec: {
            startTime: 'now-24h',
            endTime: 'now',
            fieldSelector: 'type=Warning',
            limit: WARNING_EVENTS_PAGE_LIMIT,
            ...(cursor && { continue: cursor }),
          },
        },
      });
      const status = response.data.data?.status;
      return {
        items: (status?.results ?? []).map((record) => record.event),
        continueToken: status?.continue,
      };
    },
    { maxPages: WARNING_EVENTS_MAX_PAGES }
  );

// A few more than the overview shows, so failed requests can be dropped and
// still leave enough.
const RECENT_CHANGES_LIMIT = 20;

/**
 * The newest changes from the last 24 hours on one control plane, through
 * AuditLogQuery: writes only, no `system:` users and no activity or auth
 * queries (the same rules as the assistant's activity tool).
 */
export const recentChangesQuery = async (
  scope: EventScope,
  signal?: AbortSignal
): Promise<IoK8sApiserverPkgApisAuditV1Event[]> => {
  const now = new Date();
  const response = await createActivityMiloapisComV1Alpha1AuditLogQuery({
    baseURL: eventScopeBaseURL(scope),
    signal,
    // The generated SDK sends `*/*`, which the API rejects.
    headers: { 'Content-Type': 'application/json' },
    body: {
      apiVersion: 'activity.miloapis.com/v1alpha1',
      kind: 'AuditLogQuery',
      metadata: { name: `recent-changes-${now.getTime()}` },
      spec: {
        startTime: subDays(now, 1).toISOString(),
        endTime: now.toISOString(),
        limit: RECENT_CHANGES_LIMIT,
        filter: buildActivityFilter({}),
      },
    },
  });
  return response.data.data?.status?.results ?? [];
};
