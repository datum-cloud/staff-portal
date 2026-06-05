import { consumerMatchesService } from '../utils/consumer-matches-service';
import { useServiceConsumersInProjectQuery } from '@/resources/request/client';

interface Props {
  producerProject: string | undefined;
  serviceName: string;
  canonicalName: string;
}

/**
 * Small count chip rendered on the Approvals nav item showing how many
 * PendingApproval ServiceConsumers are waiting on the producer project.
 * The query is deduplicated by react-query so the Approvals tab itself
 * doesn't refetch.
 */
export function PendingApprovalsBadge({ producerProject, serviceName, canonicalName }: Props) {
  const { data } = useServiceConsumersInProjectQuery(producerProject);
  const count = (data?.items ?? []).filter(
    (c) =>
      consumerMatchesService(c, serviceName, canonicalName) &&
      c.status?.phase === 'PendingApproval' &&
      !c.spec?.approval
  ).length;

  if (count === 0) return null;

  return (
    <span className="bg-primary/10 text-primary inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium">
      {count}
    </span>
  );
}
