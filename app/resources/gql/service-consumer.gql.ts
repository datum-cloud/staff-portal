import { runGqlQuery } from '@/modules/graphql/client';

/**
 * GraphQL operation for a producer project's service consumers, backed by the
 * gateway, plus the resource's types. The gateway resolves each consumer
 * project's display name + owning org server-side (one round trip).
 * `listServiceConsumers` reshapes the rows (null normalization) into
 * `GqlServiceConsumer` — a transform, so the types are hand-written.
 */

/**
 * Lists the ServiceConsumers in a producer project, enriched with each consumer
 * project's display name and owning organization. Pass serviceNames to keep only
 * those services' consumers before enrichment.
 */
export const serviceConsumersOp = (producerProject: string, serviceNames?: string[]) =>
  runGqlQuery('StaffServiceConsumers', {
    serviceConsumers: [
      { producerProject, ...(serviceNames?.length ? { serviceNames } : {}) },
      {
        name: true,
        serviceName: true,
        phase: true,
        approvalDecision: true,
        approvalMessage: true,
        requestedAt: true,
        consumerProject: {
          name: true,
          displayName: true,
          organizationName: true,
          organizationDisplayName: true,
        },
      },
    ],
  });

export interface GqlConsumerProject {
  /** The project's machine name (metadata.name). */
  name: string;
  /**
   * Human-readable name from the project's kubernetes.io/description
   * annotation, falling back to the machine name when unset or inaccessible.
   */
  displayName: string;
  /** The owning organization's machine name; empty when the project is inaccessible. */
  organizationName: string;
  /** The owning organization's display name, falling back to organizationName. */
  organizationDisplayName: string;
}

/**
 * A ServiceConsumer flattened and enriched by the graphql-gateway. The gateway
 * resolves each consumer project's display name server-side, so the table no
 * longer needs a per-row project lookup.
 */
export interface GqlServiceConsumer {
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
  consumerProject: GqlConsumerProject;
}
