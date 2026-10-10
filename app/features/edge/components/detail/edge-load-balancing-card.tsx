import { BadgeState } from '@/components/badge';
import { DescriptionList } from '@/components/description-list';
import { formatDuration, loadBalancerLabel, type HttpProxy } from '@/features/edge/lib';
import { SectionCard } from '@/features/milo';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { useMemo } from 'react';

export function EdgeLoadBalancingCard({ proxy }: { proxy: HttpProxy }) {
  const traffic = proxy.traffic;

  const items = useMemo(() => {
    if (!traffic) return [];
    const passive = traffic.passive;
    return [
      {
        label: <Trans>Algorithm</Trans>,
        value: (
          <span>
            {loadBalancerLabel(traffic.loadBalancerType)}
            {!traffic.loadBalancerExplicit && (
              <Text as="span" textColor="muted">
                {' '}
                <Trans>(default)</Trans>
              </Text>
            )}
          </span>
        ),
      },
      {
        label: <Trans>Hash On</Trans>,
        value: <span>{traffic.hashOn}</span>,
        hidden: !traffic.hashOn,
      },
      {
        label: <Trans>Passive Health Checks</Trans>,
        value: (
          <BadgeState state={passive ? 'yes' : 'no'} message={passive ? 'Enabled' : 'Disabled'} />
        ),
      },
      {
        label: <Trans>Consecutive 5xx</Trans>,
        value: <span>{passive?.consecutive5xxErrors}</span>,
        hidden: !passive,
      },
      {
        label: <Trans>Base Ejection</Trans>,
        value: <span>{passive && formatDuration(passive.baseEjectionTime)}</span>,
        hidden: !passive,
      },
      {
        label: <Trans>Max Ejected</Trans>,
        value: <span>{passive?.maxEjectionPercent}%</span>,
        hidden: !passive,
      },
    ];
  }, [traffic]);

  return (
    <SectionCard
      title={<Trans>Load Balancing</Trans>}
      description={
        traffic?.passive ? (
          <Trans>
            An endpoint that returns {traffic.passive.consecutive5xxErrors} 5xx responses in a row
            stops getting traffic for {formatDuration(traffic.passive.baseEjectionTime)}, longer
            each time it repeats.
          </Trans>
        ) : undefined
      }>
      <DescriptionList items={items} />
    </SectionCard>
  );
}
