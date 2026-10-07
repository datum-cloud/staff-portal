import { useServiceConsumersEnrichedQuery } from '@/resources/request/client';
import { Text } from '@datum-cloud/datum-ui/typography';

interface Props {
  producerProject: string | undefined;
  serviceName: string;
  canonicalName: string;
}

/**
 * Small count chip rendered on the Approvals nav item showing how many
 * PendingApproval ServiceConsumers are waiting on the producer project.
 *
 * Uses the same gateway query (and query key) as the Approvals and Consumers
 * tabs, so react-query dedupes it with them. The gateway filters by service
 * server-side; the raw REST list returned every consumer of every service the
 * producer project owns, managedFields included (1.3 MB for datum-cloud).
 */
export function PendingApprovalsBadge({ producerProject, serviceName, canonicalName }: Props) {
  // The consumer's serviceRef may hold either the Service's metadata.name or
  // its canonical spec.serviceName, so ask the gateway for both.
  const serviceNames = [...new Set([serviceName, canonicalName].filter((n): n is string => !!n))];
  const { data } = useServiceConsumersEnrichedQuery(producerProject, serviceNames);
  const count = (data ?? []).filter(
    (c) => c.phase === 'PendingApproval' && !c.approvalDecision
  ).length;

  if (count === 0) return null;

  return (
    <Text
      size="xs"
      weight="medium"
      textColor="primary"
      className="bg-primary/10 inline-flex min-w-5 items-center justify-center rounded-full px-1.5">
      {count}
    </Text>
  );
}
