import type { Route } from './+types/index';
import { useAssistantOptional } from '@/features/assistant';
import {
  ActivitySection,
  AttentionBanner,
  GrowthSection,
  HealthSection,
  HomeHeader,
  NeedsReviewColumn,
  NewOrgsColumn,
  NewUsersColumn,
  type AttentionItem,
} from '@/features/dashboard';
import { useReviewQueue } from '@/features/dashboard/hooks/use-platform-home';
import { useQuotaUtilizationWidget } from '@/features/dashboard/hooks/use-quota-utilization-widget';
import { useEnv } from '@/hooks';
import { useApp } from '@/providers/app.provider';
import { fraudRoutes, orgRoutes, userRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import { useEffect } from 'react';

export const meta: Route.MetaFunction = () => {
  return metaObject('Home');
};

export const handle = {
  breadcrumb: () => <Trans>Home</Trans>,
};

// Quota at or above this share of its limit counts as needing attention.
const QUOTA_ATTENTION_PCT = 90;

export default function Page() {
  const env = useEnv();
  const { user } = useApp();
  const assistant = useAssistantOptional();
  const review = useReviewQueue();
  const quota = useQuotaUtilizationWidget();

  // The assistant docks open on the landing page unless the person closed it.
  const openAssistant = assistant?.openByDefault;
  useEffect(() => {
    openAssistant?.();
  }, [openAssistant]);

  const nearLimit = quota.buckets.filter((b) => b.percentage >= QUOTA_ATTENTION_PCT);
  const attention: AttentionItem[] = [
    {
      key: 'approvals',
      count: review.approvalCount,
      label: <Trans>pending approvals</Trans>,
      href: userRoutes.list(),
    },
    {
      key: 'fraud',
      count: review.fraudCount,
      label: <Trans>fraud reviews</Trans>,
      href: fraudRoutes.evaluations.list(),
    },
    {
      key: 'quota',
      count: nearLimit.length,
      label: <Trans>quotas near their limit</Trans>,
      href: nearLimit[0] ? orgRoutes.quota.usage(nearLimit[0].orgName) : orgRoutes.list(),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
      <HomeHeader givenName={user?.spec?.givenName} environment={env?.SENTRY_ENV} />

      <AttentionBanner items={attention} isLoading={review.isLoading || quota.isLoading} />

      <div className="grid grid-cols-1 gap-8 @xl/main:grid-cols-2 @4xl/main:grid-cols-3">
        <NewUsersColumn />
        <NewOrgsColumn />
        <NeedsReviewColumn />
      </div>

      <GrowthSection />

      <HealthSection
        clustersEnabled={!!env?.MCP_ENABLED}
        quotaBuckets={quota.buckets}
        quotaLoading={quota.isLoading}
      />

      <ActivitySection />
    </div>
  );
}
