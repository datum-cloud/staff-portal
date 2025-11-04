/**
 * Log parsing utilities (server-side)
 *
 * This module contains server-side only functions for processing audit logs.
 * It should only be imported in server-side code to avoid bundling issues.
 */
import {
  formatAuditMessage,
  formatAuditMessageHtml,
  formatStatusMessage,
  categorizeAuditActivity,
  mapAuditLogLevel,
} from './formatter';
import type { ParsedLogLine, ActivityLogEntry } from './types';
import { logger } from '@/utils/logger';

/**
 * Safely parses a log line that might be JSON
 * Handles both regular logs and Kubernetes audit logs
 */
export function parseLogLine(logLine: string): ParsedLogLine {
  try {
    const parsed = JSON.parse(logLine);

    // Handle Kubernetes audit logs
    if (parsed.auditID && parsed.verb) {
      return {
        message: `${parsed.verb?.toUpperCase()} ${parsed.objectRef?.resource || 'resource'} by ${parsed.user?.username || 'unknown'}`,
        level: parsed.level || 'Metadata',
        parsed,
      };
    }

    // Handle regular logs
    return {
      message: parsed.message || parsed.msg || logLine,
      level: parsed.level || parsed.severity || 'info',
      parsed,
    };
  } catch {
    return {
      message: logLine,
      level: 'info',
      parsed: { message: logLine },
    };
  }
}

/**
 * Converts Loki nanosecond timestamp to ISO string
 */
export function parseLokiTimestamp(timestamp: string): string {
  try {
    // Loki timestamps are in nanoseconds
    const nanoseconds = parseInt(timestamp, 10);
    const milliseconds = Math.floor(nanoseconds / 1000000);
    return new Date(milliseconds).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * In-memory cache for API discovery information
 * Stores resource discovery data fetched from Kubernetes API
 * Maps "{apiGroup}/{apiVersion}" -> { plural -> singular name mappings }
 */
const apiDiscoveryMemoryCache: Record<string, Record<string, string>> = {};

/**
 * Fetches API discovery information from Kubernetes API (server-side only)
 * Queries GET /apis/{apiGroup}/{apiVersion} to get resource metadata
 *
 * Returns mapping of plural resource names to their singular forms
 * e.g., { "resourcegrants": "resourcegrant", "httpproxies": "httproxy" }
 *
 * @param apiGroup - The API group (e.g., 'milo.miloapis.com')
 * @param apiVersion - The API version (e.g., 'v1alpha1')
 * @param accessToken - Access token for authenticated requests
 * @returns Mapping of plural resource names to their singular forms
 */
async function fetchApiDiscovery(
  apiGroup: string,
  apiVersion: string,
  accessToken: string
): Promise<Record<string, string>> {
  const cacheKey = `${apiGroup}/${apiVersion}`;

  // Check memory cache first
  if (apiDiscoveryMemoryCache[cacheKey]) {
    return apiDiscoveryMemoryCache[cacheKey];
  }

  try {
    // Determine if apiGroup contains a dot (e.g., 'milo.miloapis.com' vs 'core')
    // For core API group, use 'api/v1', otherwise use 'apis/{apiGroup}/{apiVersion}'
    const discoveryUrl =
      apiGroup === 'core' ? `/api/${apiVersion}` : `/apis/${apiGroup}/${apiVersion}`;

    // Import http client only when needed (server-side only)
    const { http } = await import('@/modules/axios/axios.server');

    const response = await http.get(discoveryUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = response.data;
    const discoveryMap: Record<string, string> = {};

    // Parse resource discovery response
    // The response contains a 'resources' array with resource metadata
    // Build a map where:
    // - Keys are plural names, values are singular names (for singularization)
    // - We also add entries for singular -> plural (for pluralization)
    if (data.resources && Array.isArray(data.resources)) {
      data.resources.forEach((resource: any) => {
        if (resource.name && resource.singularName) {
          const plural = resource.name.toLowerCase();
          const singular = resource.singularName.toLowerCase();

          // Map plural to singular for singularization
          discoveryMap[plural] = singular;

          // Map singular to plural for pluralization (prefixed with special marker to avoid conflicts)
          // This allows us to look up the plural form when given a singular form
          discoveryMap[`__plural:${singular}`] = plural;
        }
      });
    }

    // Cache the result for future use
    apiDiscoveryMemoryCache[cacheKey] = discoveryMap;
    return discoveryMap;
  } catch (error) {
    logger.warn(`Failed to fetch API discovery for ${cacheKey}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    // Return empty object on error - heuristics will be used as fallback
    return {};
  }
}

/**
 * Processes a single log entry and converts it to ActivityLogEntry
 * Optionally uses API discovery for accurate resource name singularization
 *
 * @param logLine - The log line to process
 * @param accessToken - Optional access token for API discovery (server-side only)
 */
export async function processLogEntry(
  logLine: string,
  accessToken?: string
): Promise<ActivityLogEntry> {
  const { parsed } = parseLogLine(logLine);

  // Extract audit log information
  const auditLog = parsed;
  const isAuditLog = auditLog.auditID && auditLog.verb;

  // Use the timestamp from the audit log itself
  const timestamp = auditLog.requestReceivedTimestamp || auditLog.stageTimestamp;
  const formattedTimestamp = timestamp
    ? new Date(timestamp).toISOString()
    : new Date().toISOString();

  let message = '';
  let category: 'success' | 'error' | 'warning' | 'info' = 'info';
  let icon = '';

  // Fetch API discovery if we have an access token and this is an audit log
  let discoveryMap: Record<string, string> | undefined;
  if (isAuditLog && accessToken) {
    const apiGroup = auditLog.objectRef?.apiGroup || '';
    const apiVersion = auditLog.objectRef?.apiVersion || '';

    if (apiGroup && apiVersion) {
      try {
        discoveryMap = await fetchApiDiscovery(apiGroup, apiVersion, accessToken);
      } catch (error) {
        logger.warn('Failed to fetch API discovery', {
          error: error instanceof Error ? error.message : String(error),
          apiGroup,
          apiVersion,
        });
        // Continue processing without discovery map - heuristics will be used
      }
    }
  }

  if (isAuditLog) {
    // Use the formatted audit message with API discovery if available
    // Hide error messages in the main message for table display (shown in Status column instead)
    message = formatAuditMessage(
      auditLog,
      { truncate: false, hideErrorMessage: true },
      discoveryMap
    );

    // Get activity category and icon
    const activityInfo = categorizeAuditActivity(
      auditLog.verb || '',
      auditLog.responseStatus?.code
    );
    category = activityInfo.category;
    icon = activityInfo.icon;
  } else {
    message = auditLog.message || auditLog.msg || logLine;
  }

  // Create status message if available
  const statusMessage = isAuditLog ? formatStatusMessage(auditLog) : undefined;

  const activityEntry: ActivityLogEntry = {
    timestamp: formattedTimestamp,
    message,
    formattedMessage: isAuditLog
      ? formatAuditMessageHtml(auditLog, { truncate: false, hideErrorMessage: true }, discoveryMap)
      : undefined,
    statusMessage,
    level: isAuditLog ? mapAuditLogLevel(auditLog.level || 'Metadata') : auditLog.level || 'info',
    // labels: {}, // No stream labels in this response format
    raw: logLine,
    category: isAuditLog ? category : undefined,
    icon: isAuditLog ? icon : undefined,
  };

  // Add audit log specific fields if available
  if (isAuditLog) {
    activityEntry.auditId = auditLog.auditID;
    activityEntry.verb = auditLog.verb;
    activityEntry.requestUri = auditLog.requestURI;
    activityEntry.sourceIPs = auditLog.sourceIPs;
    activityEntry.userAgent = auditLog.userAgent;
    activityEntry.stage = auditLog.stage;
    activityEntry.annotations = auditLog.annotations;

    if (auditLog.user) {
      activityEntry.user = {
        username: auditLog.user.username,
        uid: auditLog.user.uid,
        groups: auditLog.user.groups || [],
      };
    }

    if (auditLog.objectRef) {
      activityEntry.resource = {
        apiGroup: auditLog.objectRef.apiGroup,
        apiVersion: auditLog.objectRef.apiVersion,
        resource: auditLog.objectRef.resource,
        namespace: auditLog.objectRef.namespace,
        name: auditLog.objectRef.name,
      };
    }

    if (auditLog.responseStatus) {
      activityEntry.responseStatus = {
        code: auditLog.responseStatus.code,
        message: auditLog.responseStatus.message,
        reason: auditLog.responseStatus.reason,
      };
    }
  }

  return activityEntry;
}

/**
 * Processes multiple log entries with error handling
 * Optionally uses API discovery for accurate resource name singularization
 *
 * @param logs - Array of log line strings to process
 * @param accessToken - Optional access token for API discovery (server-side only)
 */
export async function processLogEntries(
  logs: string[],
  accessToken?: string
): Promise<ActivityLogEntry[]> {
  const processedLogs: ActivityLogEntry[] = [];

  for (const logLine of logs) {
    try {
      const entry = await processLogEntry(logLine, accessToken);
      processedLogs.push(entry);
    } catch (error) {
      logger.error('Error parsing log entry', {
        error: error instanceof Error ? error.message : String(error),
        logLine,
      });
      // Add raw entry if parsing fails
      processedLogs.push({
        timestamp: new Date().toISOString(),
        message: logLine,
        level: 'unknown',
        labels: {},
        raw: logLine,
      });
    }
  }

  return processedLogs;
}
