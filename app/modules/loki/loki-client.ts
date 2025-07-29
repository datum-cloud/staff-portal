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
 * Builds LogQL query string with hybrid filtering approach
 */
export function buildLogQLQuery(options: LogQLQueryOptions): string {
  const { baseSelector, projectName, q, user, resource, status, actions } = options;

  let query = `${baseSelector} | json`;

  // Project filter (legacy support)
  if (projectName) {
    query += ` | annotations_resourcemanager_miloapis_com_project_name="${projectName}"`;
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

  // Note: LogQL doesn't support OR conditions in filters
  // The 'q' parameter will be handled by client-side filtering
  // Only specific field filters are supported in LogQL

  // Specific field filters (AND conditions)
  if (user) {
    query += ` | user_username="${user}"`;
  }

  if (resource) {
    query += ` | objectRef_resource="${resource}"`;
  }

  if (status) {
    // Handle status filter - can be 'success', 'error', or specific codes
    if (status === 'success') {
      query += ` | responseStatus_code < 400`;
    } else if (status === 'error') {
      query += ` | responseStatus_code >= 400`;
    } else {
      // Specific status code
      query += ` | responseStatus_code = ${status}`;
    }
  }

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

    console.log('response', JSON.stringify(response.logs));
    return response;
  } catch (error) {
    logger.error('Loki query failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof Error && error.message === 'Unauthorized') {
      throw new AuthenticationError('Unauthorized');
    }

    throw new Error(
      `Failed to query Loki: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
