import AppNavigation from '@/components/app-navigation';
import { complianceRoutes } from '@/utils/config/routes.config';
import { Tabs, TabsList, TabsLinkTrigger } from '@datum-cloud/datum-ui/tabs';
import { Trans } from '@lingui/react/macro';
import { Link, Outlet, useLocation } from 'react-router';

const complianceTabs = [
  { label: 'Vendors', value: 'vendors', to: complianceRoutes.vendors.list() },
  { label: 'Subprocessors', value: 'subprocessors', to: complianceRoutes.subprocessors.list() },
];

function useActiveTab() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/compliance/subprocessors')) return 'subprocessors';
  return 'vendors';
}

export const handle = {
  breadcrumb: () => <Trans>Compliance</Trans>,
};

export default function ComplianceLayout() {
  const activeTab = useActiveTab();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AppNavigation>
        <Tabs value={activeTab}>
          <TabsList>
            {complianceTabs.map((tab) => (
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
