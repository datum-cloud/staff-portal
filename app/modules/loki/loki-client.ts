/**
 * Loki client management and query execution (Server-side)
 *
 * This file contains server-side code that interacts with the Loki API.
 * It should only be imported in server-side code due to Node.js dependencies.
 */
import type { LokiConfig, LokiQueryResponse, LogQLQueryOptions } from './types';
import { AuthenticationError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { GrafanaApi } from '@myunisoft/loki';

export const LOKI_CONFIG: LokiConfig = {
  remoteApiURL: process.env.TELEMETRY_URL || '',
  defaultLimit: 100,
  maxLimit: 1000,
  defaultTimeRange: '48h',
} as const;

/**
 * Builds LogQL query string with enhanced filtering approach supporting multiple resources
 * Based on GitHub ticket query patterns and examples
 */
export function buildLogQLQuery(options: LogQLQueryOptions): string {
  const {
    baseSelector,
    projectName,
    orgName,
    q,
    user,
    status,
    actions,
    resourceType,
    resourceId,
    responseCode,
    apiGroup,
    namespace,
    sourceIP,
  } = options;

  let query = `${baseSelector} | json`;

  query += ` | stage="ResponseComplete" | requestURI !~ ".*dryRun=All.*"`;

  // Project filter (legacy support)
  if (projectName) {
    query += ` | annotations_resourcemanager_miloapis_com_project_name="${projectName}"`;
  }

  // Organization filter
  if (orgName) {
    query += ` | annotations_resourcemanager_miloapis_com_organization_name="${orgName}"`;
  }

  // Filter for specific verbs using regex (if verbs parameter is provided)
  if (actions) {
    const actionList = actions
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter((v) => v);
    if (actionList.length > 0) {
      const actionPattern = actionList.join('|');
      query += ` | verb=~"(?i)(${actionPattern})"`;
    }
  }

  // Single resource filtering
  if (resourceType) {
    query += ` | objectRef_resource="${resourceType}"`;
  }

  if (resourceId) {
    query += ` | objectRef_name="${resourceId}"`;
  }

  // User filter
  if (user) {
    query += ` | user_username="${user}"`;
  }

  // Status filter - enhanced to support specific response codes
  if (status) {
    if (status === 'success') {
      query += ` | responseStatus_code < 400`;
    } else if (status === 'error') {
      query += ` | responseStatus_code >= 400`;
    } else {
      // Specific status code
      query += ` | responseStatus_code = ${status}`;
    }
  }

  // Specific response code filter (new)
  if (responseCode) {
    query += ` | responseStatus_code = ${responseCode}`;
  }

  // API Group filter (new)
  if (apiGroup) {
    query += ` | objectRef_apiGroup="${apiGroup}"`;
  }

  // Namespace filter (new)
  if (namespace) {
    query += ` | objectRef_namespace="${namespace}"`;
  }

  // Source IP filter (new)
  if (sourceIP) {
    query += ` | sourceIPs=~"${sourceIP}"`;
  }

  // Note: LogQL doesn't support OR conditions in filters
  // The 'q' parameter will be handled by client-side filtering
  // Only specific field filters are supported in LogQL

  return query;
}

/**
 * Creates and configures Loki client
 */
export function createLokiClient(accessToken: string): GrafanaApi {
  return new GrafanaApi({
    authentication: {
      type: 'bearer',
      token: accessToken,
    },
    remoteApiURL: LOKI_CONFIG.remoteApiURL,
  });
}

/**
 * Executes Loki query with proper error handling
 */
export async function executeLokiQuery(
  client: GrafanaApi,
  query: string,
  options: {
    start: string;
    end: string;
    limit: number;
  }
): Promise<LokiQueryResponse> {
  try {
    logger.debug('Executing LogQL query', { query, options });

    const response = (await client.Loki.queryRange(query, options)) as LokiQueryResponse;
    logger.debug('Loki response received', {
      logsCount: response.logs?.length || 0,
      timerange: response.timerange,
    });

    return response;
  } catch (error) {
    // Safely stringify and parse error object
    const safeError = (() => {
      try {
        const errorString = JSON.stringify(error);
        return JSON.parse(errorString);
      } catch {
        return error instanceof Error ? error.message : String(error);
      }
    })();

    logger.error('Loki query failed', { error: safeError });

    if ((error as any).name === 'HttpieOnHttpError') {
      if ((error as any).statusMessage === 'Unauthorized') {
        throw new AuthenticationError('Unauthorized');
      }

      throw new Error(`Failed to query Loki: ${(error as any).data}`);
    }

    throw new Error(
      `Failed to query Loki: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
