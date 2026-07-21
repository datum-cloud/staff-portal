import { BadgeState } from '@/components/badge';
import { DescriptionList } from '@/components/description-list';
import { DisplayId, DisplayName } from '@/components/display';
import { getActiveProjectBinding, getBillingAccountDisplayName } from '@/features/billing/utils';
import { SectionCard } from '@/features/milo';
import {
  useBillingAccountBindingListForOrgQuery,
  useBillingAccountListForOrgQuery,
} from '@/resources/request/client';
import { billingAccountRoutes } from '@/utils/config/routes.config';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';
import { useMemo } from 'react';

type Props = {
  orgName: string;
  projectName: string;
  className?: string;
};

export function ProjectBillingCard({ orgName, projectName, className }: Props) {
  const bindingsQuery = useBillingAccountBindingListForOrgQuery(orgName);
  const accountsQuery = useBillingAccountListForOrgQuery(orgName);
  const isLoading = bindingsQuery.isPending || accountsQuery.isPending;

  const bound = useMemo(() => {
    const bindings = bindingsQuery.data?.items ?? [];
    const accounts = accountsQuery.data?.items ?? [];
    const activeBinding = getActiveProjectBinding(bindings, projectName);
    const accountName = activeBinding?.spec?.billingAccountRef?.name ?? '';
    const account = accounts.find((item) => item.metadata?.name === accountName);
    return { accountName, account };
  }, [accountsQuery.data?.items, bindingsQuery.data?.items, projectName]);

  return (
    <SectionCard className={cn(className)} title={<Trans>Billing</Trans>}>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-24" />
        </div>
      ) : bound.account ? (
        <DescriptionList
          items={[
            {
              label: <Trans>Account</Trans>,
              value: (
                <DisplayName
                  displayName={getBillingAccountDisplayName(bound.account)}
                  to={billingAccountRoutes.detail(orgName, bound.account.metadata?.name ?? '')}
                />
              ),
            },
            {
              label: <Trans>ID</Trans>,
              value: <DisplayId value={bound.account.metadata?.name ?? ''} />,
            },
            {
              label: <Trans>Status</Trans>,
              value: <BadgeState state={bound.account.status?.phase ?? 'Unknown'} />,
            },
          ]}
        />
      ) : bound.accountName ? (
        <Text size="sm">
          {bound.accountName} <Trans>(cross-org)</Trans>
        </Text>
      ) : (
        <Text size="sm" textColor="muted">
          <Trans>No billing account assigned</Trans>
        </Text>
      )}
    </SectionCard>
  );
}
