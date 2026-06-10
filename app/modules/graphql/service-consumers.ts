import { gqlRequest } from './client';

export interface EnrichedConsumerProject {
  /** The project's machine name (metadata.name). */
  name: string;
  /**
   * Human-readable name from the project's kubernetes.io/description
   * annotation, falling back to the machine name when unset or inaccessible.
   */
  displayName: string;
}

/**
 * A ServiceConsumer flattened and enriched by the graphql-gateway. The gateway
 * resolves each consumer project's display name server-side, so the table no
 * longer needs a per-row project lookup.
 */
export interface EnrichedServiceConsumer {
  /** metadata.name */
  name: string;
  /** spec.serviceRef.name — used to filter consumers by service. */
  serviceName: string | null;
  /** status.phase — e.g. Active, PendingApproval. */
  phase: string | null;
  /** spec.approval.decision — e.g. Approved, Denied. */
  approvalDecision: string | null;
  /** spec.approval.message */
  approvalMessage: string | null;
  /** metadata.creationTimestamp */
  requestedAt: string | null;
  consumerProject: EnrichedConsumerProject;
}

const SERVICE_CONSUMERS_QUERY = /* GraphQL */ `
  query ServiceConsumers($producerProject: ID!) {
    serviceConsumers(producerProject: $producerProject) {
      name
      serviceName
      phase
      approvalDecision
      approvalMessage
      requestedAt
      consumerProject {
        name
        displayName
      }
    }
  }
`;

/**
 * Lists the ServiceConsumers in a producer project, enriched with each
 * consumer project's display name. Resolved server-side by the gateway in a
 * single round trip (replacing the client-side consumer-list + per-project
 * lookups).
 *
 * The gateway degrades gracefully: a list failure yields an empty array, and
 * a per-project lookup failure falls back to the raw project name. Genuine
 * transport/proxy failures still throw via {@link gqlRequest}.
 */
export async function listServiceConsumers(
  producerProject: string
): Promise<EnrichedServiceConsumer[]> {
  const data = await gqlRequest<{ serviceConsumers: EnrichedServiceConsumer[] }>(
    SERVICE_CONSUMERS_QUERY,
    { producerProject }
  );
  return data.serviceConsumers;
}
