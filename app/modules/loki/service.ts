/**
 * Main service class for Loki activity logs
 */
import { convertTimeToUserFriendly } from './formatter';
import { createLokiClient, buildLogQLQuery, executeLokiQuery } from './loki-client';
import { processLogEntries } from './parser';
import type { QueryParams, ActivityLogsResponse } from './types';
import { validateQueryParams } from './validator';
import { logger } from '@/utils/logger';

/**
 * Main service class for Loki activity logs
 */
export class LokiActivityLogsService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Fetches and processes activity logs from Loki
   */
  async getActivityLogs(queryParams: QueryParams): Promise<ActivityLogsResponse> {
    // Validate and sanitize parameters
    const validatedParams = validateQueryParams(queryParams);
    const projectName = queryParams.project;

    // Log the parameters for debugging
    logger.debug('Loki query parameters', { ...validatedParams, projectName });

    // Create Loki client
    const client = createLokiClient(this.accessToken);

    // Build LogQL query
    const logQuery = buildLogQLQuery({
      baseSelector: '{telemetry_datumapis_com_audit_log="true"}',
      projectName,
      orgName: queryParams.organization,
      // Enhanced filtering approach
      q: queryParams.q,
      user: queryParams.user,
      status: queryParams.status,
      actions: queryParams.actions,
      // Single resource support
      resourceType: queryParams.resourceType,
      resourceId: queryParams.resourceId,
      // Advanced filtering options
      responseCode: queryParams.responseCode,
      apiGroup: queryParams.apiGroup,
      namespace: queryParams.namespace,
      sourceIP: queryParams.sourceIP,
    });

    // Execute query
    const response = await executeLokiQuery(client, logQuery, {
      start: validatedParams.start,
      end: validatedParams.end,
      limit: validatedParams.limit,
    });

    // Process logs
    let logs =
      response.logs && Array.isArray(response.logs) ? processLogEntries(response.logs) : [];

    // Apply flexible search (q parameter) on server side
    if (queryParams.q) {
      const searchTerm = queryParams.q.toLowerCase();
      logs = logs.filter((log) => {
        const searchableText = [
          log.user?.username || '',
          log.verb || '',
          log.resource?.resource || '',
          log.resource?.name || '',
          log.resource?.apiGroup || '',
          log.message || '',
          log.responseStatus?.code?.toString() || '',
          log.responseStatus?.reason || '',
          log.requestUri || '',
          log.userAgent || '',
        ]
          .join(' ')
          .toLowerCase();

        return searchableText.includes(searchTerm);
      });
    }

    // Sort logs by timestamp descending (most recent first)
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Convert time parameters to ISO date strings
    const startTime = convertTimeToUserFriendly(validatedParams.start);
    const endTime = convertTimeToUserFriendly(validatedParams.end);

    // Build response
    return {
      logs,
      query: logQuery,
      timeRange: {
        start: startTime,
        end: endTime,
      },
    };
  }
}
