import AppActionBar from '@/components/app-actiobar';
import AppNavigation from '@/components/app-navigation';
import { activityRoutes } from '@/utils/config/routes.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Tabs, TabsList, TabsLinkTrigger } from '@datum-cloud/datum-ui/tabs';
import { t } from '@lingui/core/macro';
import { Share2, Check } from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';

function useActiveTab() {
  const { pathname } = useLocation();
  if (pathname.startsWith(activityRoutes.policies.list())) return 'policies';
  if (pathname.startsWith(activityRoutes.auditLogs())) return 'audit-logs';
  if (pathname.startsWith(activityRoutes.events())) return 'events';
  return 'feed';
}

/**
 * Activity hub layout with horizontal tab navigation
 */
export default function ActivityLayout() {
  const activeTab = useActiveTab();
  const [copied, setCopied] = useState(false);
  const activityTabs = [
    { label: t`Activity Feed`, value: 'feed', to: activityRoutes.feed() },
    { label: t`Events`, value: 'events', to: activityRoutes.events() },
    { label: t`Audit Logs`, value: 'audit-logs', to: activityRoutes.auditLogs() },
    { label: t`Manage Policies`, value: 'policies', to: activityRoutes.policies.list() },
  ];

  // Handle share button click - copy current URL to clipboard
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Inject menu navigation into the app toolbar navigation slot */}
      <AppNavigation>
        <Tabs value={activeTab}>
          <TabsList>
            {activityTabs.map((tab) => (
              <TabsLinkTrigger key={tab.value} value={tab.value} href={tab.to} linkComponent={Link}>
                {tab.label}
              </TabsLinkTrigger>
            ))}
          </TabsList>
        </Tabs>
      </AppNavigation>

      {/* Inject share button into the app toolbar actions slot */}
      <AppActionBar>
        <Button
          type="secondary"
          theme="outline"
          size="small"
          onClick={handleShare}
          title={t`Copy shareable link with current filters`}>
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              {t`Copied!`}
            </>
          ) : (
            <>
              <Share2 className="mr-2 h-4 w-4" />
              {t`Share`}
            </>
          )}
        </Button>
      </AppActionBar>

      {/* Tab Content - flex-1 min-h-0 allows child to scroll within bounds */}
      <div className="min-h-0 flex-1 overflow-hidden px-4 py-4">
        <div className="mx-auto flex h-full max-w-7xl flex-col">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
