import AppNavigation from '@/components/app-navigation';
import { fraudRoutes } from '@/utils/config/routes.config';
import { Tabs, TabsList, TabsLinkTrigger } from '@datum-cloud/datum-ui/tabs';
import { Trans } from '@lingui/react/macro';
import { Link, Outlet, useLocation } from 'react-router';

const fraudTabs = [
  { label: 'Evaluations', value: 'evaluations', to: fraudRoutes.evaluations.list() },
  { label: 'Providers', value: 'providers', to: fraudRoutes.providers.list() },
  { label: 'Policy', value: 'policy', to: fraudRoutes.policy() },
];

function useActiveTab() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/fraud/providers')) return 'providers';
  if (pathname.startsWith('/fraud/policy')) return 'policy';
  return 'evaluations';
}

export const handle = {
  breadcrumb: () => <Trans>Fraud & Abuse</Trans>,
};

export default function FraudLayout() {
  const activeTab = useActiveTab();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AppNavigation>
        <Tabs value={activeTab}>
          <TabsList>
            {fraudTabs.map((tab) => (
              <TabsLinkTrigger key={tab.value} value={tab.value} href={tab.to} linkComponent={Link}>
                {tab.label}
              </TabsLinkTrigger>
            ))}
          </TabsList>
        </Tabs>
      </AppNavigation>

      <div className="min-h-0 flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
