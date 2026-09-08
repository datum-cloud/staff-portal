import AppActionBar from '@/components/app-actiobar';
import { DetailShell, type EntityTab } from '@/features/milo';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { activityRoutes } from '@/utils/config/routes.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { t } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { FileSearch, ListChecks, ScrollText, SquareActivity } from 'lucide-react';
import { useState } from 'react';

export const handle = {
  breadcrumb: () => <Trans>Activity</Trans>,
};

/**
 * Activity hub: section header + horizontal Feed / Events / Audit Logs / Policies
 * tabs, following the detail-page shell (#777). Replaces the legacy left-sidebar
 * SubLayout so the hub matches the rest of the migrated nav.
 */
export default function ActivityLayout() {
  const { t: tLingui } = useLingui();
  const [copied, setCopied] = useState(false);

  const tabs: EntityTab[] = [
    { label: tLingui`Feed`, href: activityRoutes.feed(), icon: SquareActivity },
    { label: tLingui`Events`, href: activityRoutes.events(), icon: FileSearch },
    { label: tLingui`Audit Logs`, href: activityRoutes.auditLogs(), icon: ScrollText },
    { label: tLingui`Policies`, href: activityRoutes.policies.list(), icon: ListChecks },
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
    <>
      <AppActionBar>
        <Button
          type="secondary"
          theme="outline"
          size="small"
          onClick={handleShare}
          title={t`Copy shareable link with current filters`}>
          {copied ? (
            <>
              <ACTION_ICONS.check className="mr-2 h-4 w-4" />
              {t`Copied!`}
            </>
          ) : (
            <>
              <ACTION_ICONS.share className="mr-2 h-4 w-4" />
              {t`Share`}
            </>
          )}
        </Button>
      </AppActionBar>
      <DetailShell
        icon={
          <div className="bg-muted flex size-10 items-center justify-center rounded-md">
            <SquareActivity className="size-5" />
          </div>
        }
        name={t`Activity`}
        tabs={tabs}
      />
    </>
  );
}
