import { PROXY_URL } from '@/modules/axios/axios.client';
import { ActivityQueryParams, ListQueryParams } from '@/resources/schemas';
import { createActivityMiloapisComV1Alpha1AuditLogQuery } from '@openapi/activity.miloapis.com/v1alpha1';
import type { ComMiloapisGoActivityPkgApisActivityV1Alpha1AuditLogQuery } from '@openapi/activity.miloapis.com/v1alpha1';
import { subDays } from 'date-fns';

/**
 * Converts Unix timestamp (nanoseconds) to ISO 8601 string (e.g., "2024-01-01T00:00:00Z")
 */
function convertTimestampToISO(timestamp: number): string {
  const timestampMs = timestamp / 1000000; // Convert nanoseconds to milliseconds
  const date = new Date(timestampMs);
  return date.toISOString();
}

/**
 * Builds a CEL filter expression from query parameters
 */
function buildCelFilter(params: ActivityQueryParams): string | undefined {
  const conditions: string[] = [];

  // Actions filter
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

  // User filter
  if (params.user) {
    conditions.push(`objectRef.resource == '${params.user}'`);
  }

  // Response code filter
  if (params.responseCode) {
    const code = parseInt(params.responseCode, 10);
    if (!isNaN(code)) {
      conditions.push(`responseStatus.code == ${code}`);
    }
  }

  // API group filter
  if (params.apiGroup) {
    conditions.push(`objectRef.apiGroup == '${params.apiGroup}'`);
  }

  // Namespace filter
  if (params.namespace) {
    conditions.push(`objectRef.namespace == '${params.namespace}'`);
  }

  // Source IP filter
  if (params.sourceIP) {
    conditions.push(`'${params.sourceIP}' in sourceIPs`);
  }

  return conditions.length > 0 ? conditions.join(' && ') : undefined;
}

/**
 * Gets the base URL for the CRD API based on context
 */
function getBaseUrl(organization?: string, project?: string): string {
  if (project) {
    return `${PROXY_URL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${project}/control-plane`;
  } else if (organization) {
    return `${PROXY_URL}/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${organization}/control-plane`;
  }
  return PROXY_URL;
}

/**
 * Activity query with single resource support using CRD API
 */
export const activityListQuery = async (
  resourceType?: string,
  resourceId?: string,
  params?: ListQueryParams<ActivityQueryParams>
) => {
  const baseURL = getBaseUrl(
    params?.filters?.organization,
    params?.filters?.project || (resourceType === 'project' ? resourceId : undefined)
  );

  // Convert timestamps to ISO 8601 format (absolute timestamps)
  // This ensures pagination works correctly since timestamps remain constant
  const now = new Date();
  const defaultStartTime = subDays(now, 7).toISOString();
  const defaultEndTime = now.toISOString();

  const startTime = params?.filters?.start
    ? convertTimestampToISO(params.filters.start)
    : defaultStartTime;
  const endTime = params?.filters?.end ? convertTimestampToISO(params.filters.end) : defaultEndTime;

  // Build CEL filter
  const filter = buildCelFilter(params?.filters || {});

  // Build the AuditLogQuery CRD
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

  // Call the CRD API
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

  // Return raw audit events directly
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
