import AppNavigation from '@/components/app-navigation';
import { supportRoutes } from '@/utils/config/routes.config';
import { Tabs, TabsList, TabsLinkTrigger } from '@datum-cloud/datum-ui/tabs';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { Link, Outlet, useLocation } from 'react-router';

function useActiveTab() {
  const { pathname } = useLocation();
  if (pathname.startsWith(supportRoutes.knowledgeBase())) return 'knowledge-base';
  return 'tickets';
}

export const handle = {
  breadcrumb: () => <Trans>Support</Trans>,
};

export default function SupportLayout() {
  const activeTab = useActiveTab();

  return (
    <>
      <AppNavigation>
        <Tabs value={activeTab}>
          <TabsList>
            <TabsLinkTrigger value="tickets" href={supportRoutes.list()} linkComponent={Link}>
              {t`Tickets`}
            </TabsLinkTrigger>
            <TabsLinkTrigger
              value="knowledge-base"
              href={supportRoutes.knowledgeBase()}
              linkComponent={Link}>
              {t`Knowledge Base`}
            </TabsLinkTrigger>
          </TabsList>
        </Tabs>
      </AppNavigation>
      <Outlet />
    </>
  );
}
