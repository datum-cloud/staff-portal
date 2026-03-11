import { NavTabs, type NavTabItem } from '@/components/nav-tabs';
import { Outlet } from 'react-router';

interface ActivityLayoutProps {
  basePath: string;
}

/**
 * Shared activity layout with tab navigation for Activity Feed, Events, and Audit Logs.
 * Used by project, organization, and user detail pages.
 */
export function ActivityLayout({ basePath }: ActivityLayoutProps) {
  const tabs: NavTabItem[] = [
    { label: 'Activity Feed', to: `${basePath}` },
    { label: 'Events', to: `${basePath}/events` },
    { label: 'Audit Logs', to: `${basePath}/audit-logs` },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b px-4 pt-3">
        <NavTabs tabs={tabs} variant="menu" />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-4">
        <div className="flex h-full flex-col">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
