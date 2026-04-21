import { PROXY_URL } from '@/modules/axios/axios.client';
import { ActivityQueryParams, ListQueryParams } from '@/resources/schemas';
import { createActivityMiloapisComV1Alpha1AuditLogQuery } from '@openapi/activity.miloapis.com/v1alpha1';
import type { ComMiloapisGoActivityPkgApisActivityV1Alpha1AuditLogQuery } from '@openapi/activity.miloapis.com/v1alpha1';
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
