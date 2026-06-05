import { CardRowSkeleton } from './card-row-skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisServicesV1Alpha1ServiceConfiguration } from '@openapi/services.miloapis.com/v1alpha1';
import { CircleGauge } from 'lucide-react';

type QuotaLimit = NonNullable<
  NonNullable<
    NonNullable<ComMiloapisServicesV1Alpha1ServiceConfiguration['spec']>['quota']
  >['limits']
>[number];

interface Props {
  limits: QuotaLimit[];
  isLoading?: boolean;
}

export function QuotaLimitsCard({ limits, isLoading }: Props) {
  return (
    <Card className="h-full shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleGauge className="h-4 w-4" />
          <Trans>Quota</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <CardRowSkeleton count={2} />
        ) : limits.length === 0 ? (
          <Text size="sm" textColor="muted" className="italic">
            <Trans>No quota limits declared.</Trans>
          </Text>
        ) : (
          <div className="flex flex-col divide-y">
            {limits.map((q) => (
              <div key={q.name} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
                <Text size="sm" className="font-medium">
                  {q.name}
                </Text>
                <Text size="xs" textColor="muted" className="font-mono">
                  {q.metric} · default {q.defaultLimit}
                  {q.maxLimit ? ` · max ${q.maxLimit}` : ''} · {q.unit}
                </Text>
                <Text size="xs" textColor="muted">
                  <Trans>per</Trans>{' '}
                  <span className="font-mono">
                    {q.consumerType.apiGroup}/{q.consumerType.kind}
                  </span>
                </Text>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
