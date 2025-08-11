import BadgeState from '@/components/badge/badge-state';
import { Text } from '@/components/typography';
import { useDomainStatus } from '@/features/domain/hooks/useDomainStatus';
import { cn } from '@/modules/shadcn/lib/utils';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/modules/shadcn/ui/hover-card';
import { useLingui } from '@lingui/react/macro';

// Map condition type to friendly title
function getConditionTitle(conditionType: string): string {
  switch (conditionType) {
    case 'Verified':
      return 'Domain Verification';
    case 'VerifiedDNS':
      return 'DNS Verification';
    case 'VerifiedHTTP':
      return 'HTTP Verification';
    default:
      return conditionType;
  }
}

export function DomainStatusProbe({
  projectName,
  domainName,
}: {
  projectName: string;
  domainName: string;
}) {
  const { t } = useLingui();
  const { data, isLoading, error } = useDomainStatus(projectName, domainName, {
    enabled: Boolean(domainName),
    refetchIntervalMs: 10000,
  });

  if (!domainName) return null;

  if (isLoading) {
    return <BadgeState state="pending" message={t`Loading status...`} loading />;
  }

  if (error) {
    return <BadgeState state="error" message={t`Failed to load status`} />;
  }

  const status = data?.data?.status;
  const conditions = (status?.conditions ?? []) as Array<{
    type: string;
    status: 'True' | 'False' | 'Unknown';
    lastTransitionTime?: string;
    reason?: string;
    message?: string;
    observedGeneration?: number;
  }>;

  const priorityConditions = conditions.filter(
    (condition) =>
      ['Verified', 'VerifiedDNS', 'VerifiedHTTP'].includes(condition.type) &&
      condition.status !== 'True'
  );

  const isActive = Boolean(conditions[0]?.status === 'True');

  // Always show pending until fully active, mirroring the reference component
  const badgeState = isActive ? 'success' : 'pending';
  const message = isActive ? t`Verified` : t`Verification in progress...`;

  return (
    <HoverCard openDelay={300}>
      <HoverCardTrigger asChild>
        <span
          className={cn(
            'inline-flex cursor-pointer items-center gap-1',
            isActive ? 'pointer-events-none' : ''
          )}>
          <BadgeState state={badgeState} message={message} loading={!isActive} />
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        className={cn('w-96', priorityConditions.length > 0 && 'border-yellow-500 bg-yellow-50')}>
        {priorityConditions.length > 0 ? (
          <div className="space-y-1.5">
            <Text size="sm" weight="semibold" textColor="warning">
              {t`Pending Validation Checks:`}
            </Text>
            <ul className="ml-4 list-disc space-y-1">
              {priorityConditions.map((condition) => (
                <li key={condition.type} className="text-sm text-black">
                  <Text as="span" size="sm" weight="semibold" className="mr-1">
                    {getConditionTitle(condition.type)}:
                  </Text>
                  <Text as="span" size="sm">
                    {condition.type === 'Verified'
                      ? t`Update your DNS provider with the provided record, or use the HTTP token method.`
                      : condition.message}
                  </Text>
                </li>
              ))}
            </ul>

            <Text as="p" size="xs" textColor="muted">
              {t`These items are checked every few minutes. If you've already made changes, they should resolve shortly.`}
            </Text>
          </div>
        ) : (
          <Text size="sm" textColor="muted">
            {t`Domain verification is in progress. This may take a few minutes.`}
          </Text>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

export default DomainStatusProbe;
