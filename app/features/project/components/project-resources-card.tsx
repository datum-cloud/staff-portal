import { SectionCard } from '@/features/milo';
import {
  useProjectDnsListQuery,
  useProjectDomainListQuery,
  useProjectEdgeListQuery,
} from '@/resources/request/client';
import { projectRoutes } from '@/utils/config/routes.config';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';
import { Link } from 'react-router';

type Props = {
  projectName: string;
  className?: string;
};

function CountRow({
  label,
  count,
  to,
  isLoading,
}: {
  label: React.ReactNode;
  count: number;
  to: string;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <Text size="sm">{label}</Text>
      {isLoading ? (
        <Skeleton className="h-4 w-10" />
      ) : (
        <Link
          to={to}
          className="text-muted-foreground hover:text-foreground text-sm tabular-nums underline-offset-2 hover:underline">
          {count}
        </Link>
      )}
    </div>
  );
}

export function ProjectResourcesCard({ projectName, className }: Props) {
  const edgesQuery = useProjectEdgeListQuery(projectName);
  const dnsQuery = useProjectDnsListQuery(projectName);
  const domainsQuery = useProjectDomainListQuery(projectName);

  const edgeCount = edgesQuery.data?.items?.length ?? 0;
  const dnsCount = dnsQuery.data?.items?.length ?? 0;
  const domainCount = domainsQuery.data?.items?.length ?? 0;

  return (
    <SectionCard
      className={cn(className)}
      title={<Trans>Resources</Trans>}
      description={<Trans>Counts for resources in this project</Trans>}>
      <div className="divide-border divide-y">
        <CountRow
          label={<Trans>Application Load Balancer</Trans>}
          count={edgeCount}
          to={projectRoutes.edge.list(projectName)}
          isLoading={edgesQuery.isPending}
        />
        <CountRow
          label={<Trans>DNS</Trans>}
          count={dnsCount}
          to={projectRoutes.dns.list(projectName)}
          isLoading={dnsQuery.isPending}
        />
        <CountRow
          label={<Trans>Domains</Trans>}
          count={domainCount}
          to={projectRoutes.domain.list(projectName)}
          isLoading={domainsQuery.isPending}
        />
      </div>
    </SectionCard>
  );
}
