import type { Route } from './+types/overview';
import {
  ClusterHealthWidget,
  FraudAlertsWidget,
  KpiCounterCard,
  PendingApprovalsWidget,
  QuotaUtilizationWidget,
  RecentUsersWidget,
} from '@/features/dashboard';
import { useResourceCount } from '@/features/dashboard/hooks/use-resource-count';
import { useEnv } from '@/hooks/use-env';
import {
  listFraudEvaluations,
  orgListQuery,
  projectListQuery,
  userListQuery,
} from '@/resources/request/client';
import { ENTITY_ICONS } from '@/utils/config/icons.config';
import { fraudRoutes, orgRoutes, projectRoutes, userRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const meta: Route.MetaFunction = () => {
  return metaObject('Overview');
};

export const handle = {
  breadcrumb: () => <Trans>Overview</Trans>,
};

export default function Page() {
  const env = useEnv();

  const userCount = useResourceCount({
    queryKey: ['dashboard', 'kpi', 'users'],
    queryFn: () => userListQuery({ limit: 1 }),
  });

  const orgCount = useResourceCount({
    queryKey: ['dashboard', 'kpi', 'organizations'],
    queryFn: () => orgListQuery({ limit: 1 }),
  });

  const projectCount = useResourceCount({
    queryKey: ['dashboard', 'kpi', 'projects'],
    queryFn: () => projectListQuery({ limit: 1 }),
  });

  const fraudCount = useResourceCount({
    queryKey: ['dashboard', 'kpi', 'fraud-evaluations'],
    queryFn: () => listFraudEvaluations({ limit: 1 }),
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {/* Row 1: KPI counters */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCounterCard
          label={<Trans>Users</Trans>}
          icon={<ENTITY_ICONS.user size={16} />}
          count={userCount.count}
          isLoading={userCount.isLoading}
          isError={userCount.isError}
          href={userRoutes.list()}
        />
        <KpiCounterCard
          label={<Trans>Organizations</Trans>}
          icon={<ENTITY_ICONS.organization size={16} />}
          count={orgCount.count}
          isLoading={orgCount.isLoading}
          isError={orgCount.isError}
          href={orgRoutes.list()}
        />
        <KpiCounterCard
          label={<Trans>Projects</Trans>}
          icon={<ENTITY_ICONS.project size={16} />}
          count={projectCount.count}
          isLoading={projectCount.isLoading}
          isError={projectCount.isError}
          href={projectRoutes.list()}
        />
        <KpiCounterCard
          label={<Trans>Fraud Evaluations</Trans>}
          icon={<ENTITY_ICONS.fraud size={16} />}
          count={fraudCount.count}
          isLoading={fraudCount.isLoading}
          isError={fraudCount.isError}
          href={fraudRoutes.evaluations.list()}
        />
      </div>

      {/* Row 2: Cluster health (requires MCP) */}
      {env?.MCP_ENABLED && <ClusterHealthWidget />}

      {/* Row 3: Alert widgets */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <FraudAlertsWidget />
        <PendingApprovalsWidget />
      </div>

      {/* Row 4: Quota utilization + recent users */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <QuotaUtilizationWidget />
        <RecentUsersWidget />
      </div>
    </div>
  );
}
