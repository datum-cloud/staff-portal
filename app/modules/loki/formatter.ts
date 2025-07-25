/**
 * Audit log formatting and categorization utilities
 */
import type { ActivityCategory, FormatAuditMessageOptions } from './types';
import { logger } from '@/utils/logger';
import {
  isValid,
  parseISO,
  fromUnixTime,
  subSeconds,
  subMinutes,
  subHours,
  subDays,
  subWeeks,
} from 'date-fns';

// Cache status descriptions for better performance
const STATUS_DESCRIPTIONS: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
} as const;

// Cache verb categories for better performance
const VERB_CATEGORIES: Record<string, ActivityCategory> = {
  create: { category: 'success', icon: '➕' },
  update: { category: 'info', icon: '✏️' },
  patch: { category: 'info', icon: '🔧' },
  delete: { category: 'warning', icon: '🗑️' },
  get: { category: 'info', icon: '👁️' },
  list: { category: 'info', icon: '📋' },
  watch: { category: 'info', icon: '👀' },
} as const;

// Cache audit log level mapping
const AUDIT_LEVEL_MAP: Record<string, string> = {
  Metadata: 'info',
  Request: 'debug',
  RequestResponse: 'debug',
} as const;

/**
 * Maps Kubernetes audit log levels to standard log levels
 */
export function mapAuditLogLevel(auditLevel: string): string {
  return AUDIT_LEVEL_MAP[auditLevel] || auditLevel.toLowerCase();
}

/**
 * Categorizes audit log activities for better UX
 */
export function categorizeAuditActivity(verb: string, responseCode?: number): ActivityCategory {
  // Determine category based on HTTP response code first (more accurate)
  if (responseCode) {
    if (responseCode >= 200 && responseCode < 300) {
      return { category: 'success', icon: '✅' };
    } else if (responseCode >= 400 && responseCode < 500) {
      return { category: 'warning', icon: '⚠️' };
    } else if (responseCode >= 500) {
      return { category: 'error', icon: '❌' };
    }
  }

  // Fallback to verb-based categorization
  const lowerVerb = verb.toLowerCase();
  return VERB_CATEGORIES[lowerVerb] || { category: 'info', icon: '📝' };
}

/**
 * Formats a human-readable message for audit logs
 */
export function formatAuditMessage(auditLog: any, options: FormatAuditMessageOptions = {}): string {
  // Format verb with first letter capitalized
  const action = auditLog.verb
    ? auditLog.verb.charAt(0).toUpperCase() + auditLog.verb.slice(1).toLowerCase()
    : 'Unknown';
  const resource = auditLog.objectRef?.resource || 'resource';
  const resourceName = auditLog.objectRef?.name;
  const namespace = auditLog.objectRef?.namespace;
  const user = auditLog.user?.username || 'unknown';

  // Create a more descriptive action based on the verb
  let actionDescription = action;
  if (action === 'Create') actionDescription = 'Created';
  if (action === 'Update') actionDescription = 'Updated';
  if (action === 'Delete') actionDescription = 'Deleted';
  if (action === 'Patch') actionDescription = 'Modified';
  if (action === 'List') actionDescription = 'Listed';
  if (action === 'Get') actionDescription = 'Retrieved';
  if (action === 'Watch') actionDescription = 'Watched';

  let message = `${user} ${actionDescription.toLowerCase()} ${resource}`;

  if (resourceName) {
    message += `/${resourceName}`;
  }

  if (namespace && namespace !== 'default') {
    message += ` in namespace ${namespace}`;
  }

  /* if (stage && stage !== 'ResponseComplete') {
    message += ` (${stage})`;
  } */

  /* if (statusCode) {
    message += ` → ${statusCode}`;
    
    const description = STATUS_DESCRIPTIONS[statusCode];
    if (description) {
      message += ` ${description}`;
    }
  } */

  // Add error message if present and it's an error
  if (
    auditLog.responseStatus?.message &&
    auditLog.responseStatus?.code &&
    auditLog.responseStatus.code >= 400
  ) {
    const errorMsg = auditLog.responseStatus.message;

    // Apply truncation if enabled
    const { truncate = true, maxLength = 100, truncateSuffix = '...' } = options;

    const processedMsg =
      truncate && errorMsg.length > maxLength
        ? `${errorMsg.substring(0, maxLength)}${truncateSuffix}`
        : errorMsg;

    message += ` - ${processedMsg}`;
  }

  return message;
}

/**
 * Formats a status message with code and description
 */
export function formatStatusMessage(auditLog: any): string | undefined {
  if (!auditLog.responseStatus?.code) {
    return undefined;
  }

  const statusCode = auditLog.responseStatus.code;
  const description = STATUS_DESCRIPTIONS[statusCode] || '';
  let statusMessage = `${statusCode} ${description}`;

  return statusMessage;
}

/**
 * Formats an HTML message for audit logs with class names for styling
 */
export function formatAuditMessageHtml(
  auditLog: any,
  options: FormatAuditMessageOptions = {}
): string {
  // Format verb with first letter capitalized
  const action = auditLog.verb
    ? auditLog.verb.charAt(0).toUpperCase() + auditLog.verb.slice(1).toLowerCase()
    : 'Unknown';
  const resource = auditLog.objectRef?.resource || auditLog.resource?.resource || 'resource';
  const resourceName = auditLog.objectRef?.name || auditLog.resource?.name;
  const namespace = auditLog.objectRef?.namespace || auditLog.resource?.namespace;
  const user = auditLog.user?.username || 'unknown';

  // Create a more descriptive action based on the verb
  let actionDescription = action;
  if (action === 'Create') actionDescription = 'Created';
  if (action === 'Update') actionDescription = 'Updated';
  if (action === 'Delete') actionDescription = 'Deleted';
  if (action === 'Patch') actionDescription = 'Modified';
  if (action === 'List') actionDescription = 'Listed';
  if (action === 'Get') actionDescription = 'Retrieved';
  if (action === 'Watch') actionDescription = 'Watched';

  let message = `<span class="activity-log-user">${user}</span> <span class="activity-log-event">${actionDescription.toLowerCase()}</span> `;
  message += `<span class="activity-log-resource">${resource}`;

  if (resourceName) {
    message += `/${resourceName}`;
  }
  message += '</span>';

  if (namespace && namespace !== 'default') {
    message += ` in <span class="activity-log-namespace">${namespace}</span>`;
  }

  // Add error message if present and it's an error
  if (
    auditLog.responseStatus?.message &&
    auditLog.responseStatus?.code &&
    auditLog.responseStatus.code >= 400
  ) {
    const errorMsg = auditLog.responseStatus.message;

    // Apply truncation if enabled
    const { truncate = true, maxLength = 100, truncateSuffix = '...' } = options;

    const processedMsg =
      truncate && errorMsg.length > maxLength
        ? `${errorMsg.substring(0, maxLength)}${truncateSuffix}`
        : errorMsg;

    message += ` - <span class="activity-log-error-message">${processedMsg}</span>`;
  }

  return message;
}

/**
 * Converts time parameter to ISO date string using date-fns
 */
export function convertTimeToUserFriendly(timeParam: string): string {
  const now = new Date();

  // Handle empty or 'now'
  if (!timeParam || timeParam === 'now') {
    return now.toISOString();
  }

  // Handle relative time formats (1s, 30m, 24h, 7d, 2w) using date-fns
  const relativeMatch = timeParam.match(/^(\d+)([smhdw])$/);
  if (relativeMatch) {
    const [, amount, unit] = relativeMatch;
    const value = parseInt(amount, 10);

    let targetDate: Date;

    try {
      switch (unit) {
        case 's':
          targetDate = subSeconds(now, value);
          break;
        case 'm':
          targetDate = subMinutes(now, value);
          break;
        case 'h':
          targetDate = subHours(now, value);
          break;
        case 'd':
          targetDate = subDays(now, value);
          break;
        case 'w':
          targetDate = subWeeks(now, value);
          break;
        default:
          throw new Error(`Unsupported time unit: ${unit}`);
      }

      if (isValid(targetDate)) {
        return targetDate.toISOString();
      }
    } catch (error) {
      logger.warn(`Error processing relative time ${timeParam}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Handle Unix timestamp (seconds or nanoseconds) using date-fns
  const timestamp = parseInt(timeParam, 10);
  if (!isNaN(timestamp) && timestamp > 0 && timeParam === timestamp.toString()) {
    try {
      let date: Date;
      // Check if it's nanoseconds (19 digits) or seconds (10 digits)
      if (timeParam.length >= 19) {
        // Nanoseconds - convert to milliseconds for Date constructor
        date = new Date(timestamp / 1000000);
      } else {
        // Seconds - use fromUnixTime
        date = fromUnixTime(timestamp);
      }

      if (isValid(date)) {
        return date.toISOString();
      }
    } catch (error) {
      logger.warn(`Error processing Unix timestamp ${timeParam}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Handle ISO date string using date-fns
  try {
    const date = parseISO(timeParam);
    if (isValid(date)) {
      return date.toISOString();
    }
  } catch (error) {
    logger.warn(`Error parsing ISO date ${timeParam}`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Handle date-only format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(timeParam)) {
    try {
      const date = parseISO(`${timeParam}T00:00:00Z`);
      if (isValid(date)) {
        return date.toISOString();
      }
    } catch (error) {
      logger.warn(`Error parsing date ${timeParam}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Fallback to current time
  return now.toISOString();
}
