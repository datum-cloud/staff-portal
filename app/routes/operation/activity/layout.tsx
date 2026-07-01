import AppActionBar from '@/components/app-actiobar';
import { SubLayout } from '@/components/sub-layout';
import { activityRoutes } from '@/utils/config/routes.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { t } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { Check, FileSearch, ListChecks, ScrollText, Share2, SquareActivity } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <Trans>Activity</Trans>,
};

/**
 * Activity hub layout with vertical sub-navigation.
 */
export default function ActivityLayout() {
  const { t: tLingui } = useLingui();
  const [copied, setCopied] = useState(false);

  const menuItems = [
    {
      title: tLingui`Feed`,
      href: activityRoutes.feed(),
      icon: SquareActivity,
    },
    {
      title: tLingui`Events`,
      href: activityRoutes.events(),
      icon: FileSearch,
    },
    {
      title: tLingui`Audit Logs`,
      href: activityRoutes.auditLogs(),
      icon: ScrollText,
    },
    {
      title: tLingui`Policies`,
      href: activityRoutes.policies.list(),
      icon: ListChecks,
    },
  ];

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
    <SubLayout>
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
      <SubLayout.SidebarLeft>
        <SubLayout.SidebarMenu menuItems={menuItems} />
      </SubLayout.SidebarLeft>
      <SubLayout.Content>
        <Outlet />
      </SubLayout.Content>
    </SubLayout>
  );
}
