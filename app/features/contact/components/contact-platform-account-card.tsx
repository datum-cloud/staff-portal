import { BadgeState } from '@/components/badge';
import { DescriptionList } from '@/components/description-list';
import { UserAvatar } from '@/components/user-avatar';
import { FraudDecisionBadge } from '@/features/fraud';
import { SectionCard } from '@/features/milo';
import {
  useFraudEvaluationListQuery,
  usePasskeyListQuery,
  usePlatformAccessQuery,
} from '@/resources/request/client';
import { userRoutes } from '@/utils/config/routes.config';
import { startCase } from '@/utils/helpers';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router';

type Props = {
  user?: ComMiloapisIamV1Alpha1User;
  className?: string;
};

/**
 * Read-only "Platform account" card: the linked user, their access state, fraud
 * verdict and passkey count. Renders nothing meaningful without a linked user,
 * so callers gate it on the contact being a platform user.
 */
export function ContactPlatformAccountCard({ user, className }: Props) {
  const userId = user?.metadata?.name ?? '';
  const { data: platformAccess, isLoading: accessLoading } = usePlatformAccessQuery(userId);
  const { data: passkeys, isLoading: passkeysLoading } = usePasskeyListQuery(userId);
  const { data: fraudData, isLoading: fraudLoading } = useFraudEvaluationListQuery(
    userId ? { search: userId } : undefined,
    { enabled: !!userId }
  );

  const accessState = platformAccess?.spec?.state;
  const decision = fraudData?.items?.[0]?.status?.decision;
  const fullName = `${user?.spec?.givenName ?? ''} ${user?.spec?.familyName ?? ''}`.trim();

  return (
    <SectionCard
      title={<Trans>Platform account</Trans>}
      className={className}
      action={
        <Link
          to={userRoutes.detail(userId)}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
          <Trans>Open user</Trans>
          <ExternalLink className="size-3.5" />
        </Link>
      }>
      <div className="mb-3 flex items-center gap-2">
        <UserAvatar
          name={fullName || userId}
          avatarUrl={user?.status?.avatarUrl}
          className="size-8"
        />
        <div className="flex min-w-0 flex-col">
          <Text size="sm" weight="medium" className="truncate">
            {fullName || userId}
          </Text>
          <Text size="xs" textColor="muted" className="truncate">
            {user?.spec?.email}
          </Text>
        </div>
      </div>
      <DescriptionList
        labelWidth="40%"
        items={[
          {
            label: <Trans>Access</Trans>,
            value: accessLoading ? (
              <Skeleton className="h-4 w-20" />
            ) : accessState ? (
              <BadgeState state={accessState} message={startCase(accessState)} />
            ) : (
              '—'
            ),
          },
          {
            label: <Trans>Fraud check</Trans>,
            value: fraudLoading ? (
              <Skeleton className="h-4 w-20" />
            ) : (
              <FraudDecisionBadge decision={decision} />
            ),
          },
          {
            label: <Trans>Passkeys</Trans>,
            value: passkeysLoading ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <Trans>{passkeys?.items?.length ?? 0} registered</Trans>
            ),
          },
        ]}
      />
    </SectionCard>
  );
}
