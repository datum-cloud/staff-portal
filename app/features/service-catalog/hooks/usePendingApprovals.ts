import type { GqlServiceConsumer } from '@/resources/gql/service-consumer.gql';
import { useServiceConsumersEnrichedQuery } from '@/resources/request/client';
import { useMemo } from 'react';

const byRequestedAt = (a: GqlServiceConsumer, b: GqlServiceConsumer): number => {
  // Undated requests sort last rather than passing as the oldest.
  if (!a.requestedAt || !b.requestedAt) return a.requestedAt ? -1 : b.requestedAt ? 1 : 0;
  return a.requestedAt.localeCompare(b.requestedAt);
};

/**
 * A service's consumers still awaiting the producer's decision, oldest first.
 * Shared by the Approvals nav badge, the Overview card and the Approvals tab
 * so they agree on what "pending" means, and so react-query dedupes their
 * gateway call.
 */
export function usePendingApprovals(
  producerProject: string | undefined,
  serviceName: string,
  canonicalName: string | undefined
) {
  // The consumer's serviceRef may hold either the Service's metadata.name or
  // its canonical spec.serviceName, so ask the gateway for both.
  const serviceNames = [...new Set([serviceName, canonicalName].filter((n): n is string => !!n))];
  const query = useServiceConsumersEnrichedQuery(producerProject, serviceNames);

  const pending = useMemo(
    () =>
      (query.data ?? [])
        .filter((c) => c.phase === 'PendingApproval' && !c.approvalDecision)
        .sort(byRequestedAt),
    [query.data]
  );

  return { ...query, pending };
}
