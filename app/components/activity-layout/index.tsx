import { Tabs, TabsList, TabsLinkTrigger } from '@datum-cloud/datum-ui/tabs';
import { Link, Outlet, useLocation } from 'react-router';

interface ActivityTab {
  label: string;
  value: string;
  to: string;
}

interface ActivityLayoutProps {
  basePath: string;
  tabs?: ActivityTab[];
}

function useActiveTab(basePath: string) {
  const { pathname } = useLocation();
  const rest = pathname.slice(basePath.length);
  if (rest.startsWith('/audit-logs')) return 'audit-logs';
  if (rest.startsWith('/events')) return 'events';
  return 'feed';
}

/**
 * Shared activity layout with tab navigation for Activity Feed, Events, and Audit Logs.
 * Used by project, organization, and user detail pages.
 */
const defaultTabs = (basePath: string): ActivityTab[] => [
  { label: 'Activity Feed', value: 'feed', to: basePath },
  { label: 'Events', value: 'events', to: `${basePath}/events` },
  { label: 'Audit Logs', value: 'audit-logs', to: `${basePath}/audit-logs` },
];

export function ActivityLayout({ basePath, tabs }: ActivityLayoutProps) {
  const activeTab = useActiveTab(basePath);
  const resolvedTabs = tabs ?? defaultTabs(basePath);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b px-4 pt-3">
        <Tabs value={activeTab}>
          <TabsList>
            {resolvedTabs.map((tab) => (
              <TabsLinkTrigger key={tab.value} value={tab.value} href={tab.to} linkComponent={Link}>
                {tab.label}
              </TabsLinkTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-4">
        <div className="flex h-full flex-col">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
