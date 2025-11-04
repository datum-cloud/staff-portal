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

// Cache status descriptions for better performance (for tooltips)
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

// Categorical status labels per GitHub issue #403
const CATEGORICAL_STATUS_LABELS: Record<number, string> = {
  // Success: 200-299
  200: 'Success',
  201: 'Success',
  204: 'Success',
  // Client Error: 400-499
  400: 'Client Error',
  401: 'Client Error',
  403: 'Client Error',
  404: 'Client Error',
  409: 'Client Error',
  // Server Error: 500+
  500: 'Server Error',
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
 * Uses HTTP status codes as primary indicator per GitHub issue #403
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
 * Gets categorical status label for HTTP response code
 * Per GitHub issue #403: Success | Client Error | Server Error
 */
export function getCategoricalStatusLabel(responseCode?: number): string | undefined {
  if (!responseCode) return undefined;

  // Check the lookup table first
  if (responseCode in CATEGORICAL_STATUS_LABELS) {
    return CATEGORICAL_STATUS_LABELS[responseCode as keyof typeof CATEGORICAL_STATUS_LABELS];
  }

  // Apply range-based categorization if not in lookup table
  if (responseCode >= 200 && responseCode < 300) {
    return 'Success';
  } else if (responseCode >= 400 && responseCode < 500) {
    return 'Client Error';
  } else if (responseCode >= 500) {
    return 'Server Error';
  }

  return undefined;
}

/**
 * Determines if a resource is organization-level or project-level
 *
 * Organization resources:
 * - Have NO project annotation (resourcemanager.miloapis.com/project-name is absent)
 * - Use namespace format: organization-{org-name}
 *
 * Project resources:
 * - Have the project annotation (resourcemanager.miloapis.com/project-name is present)
 * - Use namespace format: {project-namespace}
 *
 * Per GitHub issue #403:
 * - Omit namespace for organization-level resources (redundant)
 * - Include namespace for project-level resources (clarity)
 */
function isOrganizationResource(auditLog: any): boolean {
  // Check if the project annotation is present
  // If there's a project annotation, it's a project-level resource
  const projectAnnotation = auditLog.annotations?.['resourcemanager.miloapis.com/project-name'];

  // If project annotation exists, it's NOT an organization resource
  if (projectAnnotation) {
    return false;
  }

  // Fallback: check namespace for organization- prefix (for backward compatibility)
  // This handles cases where annotations might not be present
  const namespace = auditLog.objectRef?.namespace || auditLog.resource?.namespace;
  return namespace ? namespace.startsWith('organization-') : false;
}

/**
 * Formats a human-readable message for audit logs
 * Uses natural, humanized language instead of technical templates
 *
 * Per GitHub issue #403:
 * - Omit namespace for organization-level resources (no project annotation)
 * - Include namespace for project-level resources (has project annotation)
 *
 * @param auditLog - The audit log entry
 * @param options - Formatting options (truncate, maxLength, truncateSuffix)
 * @param discoveryMap - Optional mapping from API discovery for accurate singularization
 */
export function formatAuditMessage(
  auditLog: any,
  options: FormatAuditMessageOptions = {},
  discoveryMap?: Record<string, string>
): string {
  const resource = auditLog.objectRef?.resource || 'resource';
  const resourceName = auditLog.objectRef?.name;
  const namespace = auditLog.objectRef?.namespace;
  const user = auditLog.user?.username || 'unknown';
  const verb = auditLog.verb?.toLowerCase() || 'unknown';

  // Humanize resource type names using API discovery if available
  const resourceLabel = humanizeResourceType(resource, discoveryMap);

  // Build the main message with natural language
  let message: string;

  if (resourceName) {
    // With resource name: "john@example.com created the HTTPProxy myproxy"
    message = `${user} ${verb}d the ${resourceLabel} ${resourceName}`;
  } else {
    // Without resource name (list operations): "john@example.com listed HTTPProxies"
    message = `${user} ${getPastTenseVerb(verb)} ${pluralizeResource(resourceLabel, discoveryMap)}`;
  }

  // Add namespace context for project-level resources
  if (namespace && !isOrganizationResource(auditLog)) {
    message += ` in the ${namespace} namespace`;
  }

  // Add error message if present and it's an error
  // Present as regular body text on new line per issue #403
  const { hideErrorMessage = false } = options;
  if (
    !hideErrorMessage &&
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

    message += `\n${processedMsg}`;
  }

  return message;
}

/**
 * Converts a plural resource name to its singular form using API discovery
 *
 * Requires API discovery mapping - no heuristics or static fallbacks.
 * The mapping must be provided from Kubernetes API discovery.
 *
 * @param resource - The plural resource name (e.g., 'httpproxies', 'resourcegrants')
 * @param discoveryMap - Mapping from API discovery (plural -> singular), required
 * @returns The singular resource name, or the original if no mapping found
 */
function singularizeResource(resource: string, discoveryMap?: Record<string, string>): string {
  const normalized = resource.toLowerCase();

  // Use API discovery mapping if available
  if (discoveryMap && discoveryMap[normalized]) {
    return discoveryMap[normalized];
  }

  // If no discovery map, return original (don't guess)
  return normalized;
}

/**
 * Converts resource type names using the singular form from API discovery
 *
 * e.g., "resourcegrants" -> "resourcegrant" (via API discovery)
 *       "httpproxies" -> "httproxy" (via API discovery)
 *
 * The singular form from the Kubernetes API is used as-is for display.
 * This ensures accuracy and consistency with Kubernetes terminology.
 *
 * @param resource - The resource name (plural or singular)
 * @param discoveryMap - Mapping from API discovery for singularization (required)
 */
function humanizeResourceType(resource: string, discoveryMap?: Record<string, string>): string {
  // Use only the singular form from API discovery
  return singularizeResource(resource, discoveryMap);
}

/**
 * Converts a verb to its past tense form
 * e.g., "create" -> "created", "list" -> "listed"
 */
function getPastTenseVerb(verb: string): string {
  const pastTenseMap: Record<string, string> = {
    create: 'created',
    update: 'updated',
    patch: 'modified',
    delete: 'deleted',
    list: 'listed',
    get: 'retrieved',
    watch: 'watched',
  };

  return pastTenseMap[verb.toLowerCase()] || `${verb}ed`;
}

/**
 * Pluralizes a resource type name using API discovery
 *
 * Gets the exact plural form from the API discovery map.
 * Falls back to English rules if discovery is unavailable.
 *
 * e.g., "resourcegrant" -> "resourcegrants" (via API discovery)
 *       "httproxy" -> "httpproxies" (via API discovery)
 *
 * @param resource - The resource name (plural or singular)
 * @param discoveryMap - Mapping from API discovery (includes __plural: entries)
 */
function pluralizeResource(resource: string, discoveryMap?: Record<string, string>): string {
  // Get the singular form from API discovery
  const singular = humanizeResourceType(resource, discoveryMap);

  // Check if we have the plural form in discovery map
  // We use the special __plural: prefix to look up the plural form
  const pluralKey = `__plural:${singular}`;
  if (discoveryMap && discoveryMap[pluralKey]) {
    return discoveryMap[pluralKey];
  }

  // Fallback to English pluralization rules if no discovery map
  if (singular.endsWith('y')) {
    // y -> ies: "policy" -> "policies"
    return singular.slice(0, -1) + 'ies';
  } else if (
    singular.endsWith('s') ||
    singular.endsWith('x') ||
    singular.endsWith('z') ||
    singular.endsWith('ch') ||
    singular.endsWith('sh')
  ) {
    // s, x, z, ch, sh -> es
    return singular + 'es';
  } else if (singular.endsWith('o')) {
    // o -> oes: "hero" -> "heroes"
    return singular + 'es';
  } else {
    // Default: add 's'
    return singular + 's';
  }
}

/**
 * Formats a status message with categorical label
 * Per GitHub issue #403: Display categorical labels (Success | Client Error | Server Error)
 * The detailed status code is available via tooltip/hover
 */
export function formatStatusMessage(auditLog: any): string | undefined {
  if (!auditLog.responseStatus?.code) {
    return undefined;
  }

  const statusCode = auditLog.responseStatus.code;
  const categoricalLabel = getCategoricalStatusLabel(statusCode);

  if (!categoricalLabel) {
    return undefined;
  }

  // Return categorical label (Success | Client Error | Server Error)
  // The specific code can be shown in a tooltip: e.g., "403 Forbidden"
  return categoricalLabel;
}

/**
 * Formats an HTML message for audit logs with class names for styling
 * Uses natural, humanized language with styled spans for key information
 *
 * Per GitHub issue #403:
 * - Omit namespace for organization-level resources (no project annotation)
 * - Include namespace for project-level resources for clarity
 * - Error messages on new lines
 *
 * @param auditLog - The audit log entry
 * @param options - Formatting options (truncate, maxLength, truncateSuffix)
 * @param discoveryMap - Optional mapping from API discovery for accurate singularization
 */
export function formatAuditMessageHtml(
  auditLog: any,
  options: FormatAuditMessageOptions = {},
  discoveryMap?: Record<string, string>
): string {
  const resource = auditLog.objectRef?.resource || auditLog.resource?.resource || 'resource';
  const resourceName = auditLog.objectRef?.name || auditLog.resource?.name;
  const namespace = auditLog.objectRef?.namespace || auditLog.resource?.namespace;
  const user = auditLog.user?.username || 'unknown';
  const verb = auditLog.verb?.toLowerCase() || 'unknown';

  // Humanize resource type names using API discovery if available
  const resourceLabel = humanizeResourceType(resource, discoveryMap);

  // Build the main message with natural language and HTML styling
  let message: string;

  if (resourceName) {
    // With resource name: "john@example.com created the HTTPProxy myproxy"
    message =
      `<span class="activity-log-user">${user}</span> ` +
      `<span class="activity-log-event">${verb}d</span> the ` +
      `<span class="activity-log-resource">${resourceLabel} ${resourceName}</span>`;
  } else {
    // Without resource name (list operations): "john@example.com listed HTTPProxies"
    message =
      `<span class="activity-log-user">${user}</span> ` +
      `<span class="activity-log-event">${getPastTenseVerb(verb)}</span> ` +
      `<span class="activity-log-resource">${pluralizeResource(resourceLabel, discoveryMap)}</span>`;
  }

  // Add namespace context for project-level resources
  if (namespace && !isOrganizationResource(auditLog)) {
    message += ` in the <span class="activity-log-namespace">${namespace}</span> namespace`;
  }

  // Add error message if present and it's an error
  // Present as regular body text on new line per issue #403
  const { hideErrorMessage = false } = options;
  if (
    !hideErrorMessage &&
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

    // Error message on new line per #403
    message += `<br/><span class="activity-log-error-message">${processedMsg}</span>`;
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
