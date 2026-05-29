import { getResourceLabel } from '@/utils/helpers/resource-labels';

/**
 * K8s resource path pattern: `group.api.com "name" is reason`
 * Examples:
 *   - projects.resourcemanager.miloapis.com "x" is forbidden
 *   - domains.networking.miloapis.com "x" is invalid
 */
const K8S_RESOURCE_PATH_PATTERN = /^[\w.-]+\.[\w.-]+\.\w+ "[^"]+" (?:is \w+|not found)$/;

/**
 * Admission webhook prefix pattern.
 * Example: admission webhook "vdomain-v1alpha.kb.io" denied the request
 */
const ADMISSION_WEBHOOK_PATTERN = /^admission webhook "[^"]+" denied the request$/;

/**
 * K8s "not found" single-segment pattern: `kind.group.api.com "name" not found`.
 * Captures the resource kind (first segment) and the quoted resource name.
 */
const K8S_NOT_FOUND_PATTERN = /^(\w+)\.[\w.-]+ "([^"]+)" not found$/;

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Parse a raw K8s Status message into something a user can read.
 *
 * K8s messages are often nested with colon separators:
 *   admission webhook "x" denied the request: kind.group.com "name" is reason: actual message
 *
 * This walks backwards through the colon-separated segments, skipping
 * admission-webhook prefixes and K8s resource path segments, and returns
 * the deepest meaningful segment. "not found" messages are humanized via
 * the shared resource label map.
 *
 * Falls through unchanged for non-K8s messages.
 */
export function parseK8sMessage(raw: string): string {
  if (!raw) return raw;

  const segments = raw.split(': ');

  if (segments.length === 1) {
    const notFoundMatch = raw.match(K8S_NOT_FOUND_PATTERN);
    if (notFoundMatch) {
      const label = getResourceLabel(notFoundMatch[1]);
      return `${label} "${notFoundMatch[2]}" not found`;
    }
    return raw;
  }

  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i].trim();

    const notFoundMatch = segment.match(K8S_NOT_FOUND_PATTERN);
    if (notFoundMatch) {
      const label = getResourceLabel(notFoundMatch[1]);
      return `${label} "${notFoundMatch[2]}" not found`;
    }

    if (K8S_RESOURCE_PATH_PATTERN.test(segment)) continue;
    if (ADMISSION_WEBHOOK_PATTERN.test(segment)) continue;

    return capitalize(segment);
  }

  return capitalize(segments[segments.length - 1].trim());
}
