/**
 * Strips Kubernetes metadata noise from tool results before they are sent to Claude.
 *
 * These fields (managedFields, finalizers, resourceVersion, etc.) add significant
 * token volume with no operator-relevant content. Trimming reduces cost and keeps
 * Claude focused on user-relevant fields.
 */

const NOISE_FIELDS = new Set([
  'managedFields',
  'finalizers',
  'resourceVersion',
  'generation',
  'uid',
  'selfLink',
  'ownerReferences',
  'annotations',
]);

/**
 * Recursively removes Kubernetes noise fields from any plain object or array.
 * Non-object values are returned unchanged.
 */
export function trimK8sNoise(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(trimK8sNoise);
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (NOISE_FIELDS.has(key)) continue;
      result[key] = trimK8sNoise(val);
    }
    return result;
  }

  return value;
}
