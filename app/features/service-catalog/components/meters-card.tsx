import { CardRowSkeleton } from './card-row-skeleton';
import { BadgeState } from '@/components/badge';
import { SectionCard } from '@/features/milo';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisServicesV1Alpha1ServiceConfiguration } from '@openapi/services.miloapis.com/v1alpha1';
import { Gauge } from 'lucide-react';

type Metric = NonNullable<
  NonNullable<ComMiloapisServicesV1Alpha1ServiceConfiguration['spec']>['metrics']
>[number];

interface Props {
  metrics: Metric[];
  isLoading?: boolean;
}

export function MetersCard({ metrics, isLoading }: Props) {
  return (
    <SectionCard
      className="h-full"
      title={
        <span className="flex items-center gap-2">
          <Gauge className="h-4 w-4" />
          <Trans>Meters</Trans>
        </span>
      }>
      {isLoading ? (
        <CardRowSkeleton count={2} />
      ) : metrics.length === 0 ? (
        <Text size="sm" textColor="muted" className="italic">
          <Trans>None declared.</Trans>
        </Text>
      ) : (
        <div className="flex flex-col divide-y">
          {metrics.map((m) => (
            <div key={m.name} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
              <div className="flex items-baseline gap-2">
                <Text size="sm" className="font-medium">
                  {m.displayName ?? m.name}
                </Text>
                <BadgeState state="info" message={m.kind} />
                <Text size="xs" textColor="muted" className="font-mono">
                  {m.unit}
                </Text>
              </div>
              <Text size="xs" textColor="muted" className="font-mono">
                {m.name}
              </Text>
              {m.dimensions && m.dimensions.length > 0 ? (
                <Text size="xs" textColor="muted">
                  <Trans>Rateable dimensions:</Trans>{' '}
                  <span className="font-mono">{m.dimensions.join(', ')}</span>
                </Text>
              ) : null}
              {m.description && (
                <Text size="xs" textColor="muted">
                  {m.description}
                </Text>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
