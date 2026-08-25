/**
 * Resolve a Project's human-readable name from its metadata.
 *
 * Projects carry their name in two annotations. cloud-portal historically
 * wrote only `kubernetes.io/description`, and now writes `display-name` too,
 * so operator-facing surfaces must check both or they render raw resource IDs
 * for every project created before that change.
 *
 * The chain matches cloud-portal's `toProject` and graphql-gateway's
 * `Project.displayName`. `||` (not `??`) so a blank annotation falls through
 * instead of surfacing as an empty name.
 */
export function projectDisplayName(
  metadata: { name?: string; annotations?: Record<string, string> } | undefined
): string {
  const annotations = metadata?.annotations;
  return (
    annotations?.['kubernetes.io/display-name'] ||
    annotations?.['kubernetes.io/description'] ||
    metadata?.name ||
    ''
  );
}
