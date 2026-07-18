import { CardRowSkeleton } from './card-row-skeleton';
import { SectionCard } from '@/features/milo';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisServicesV1Alpha1ServiceConfiguration } from '@openapi/services.miloapis.com/v1alpha1';
import { Boxes } from 'lucide-react';

type MonitoredResource = NonNullable<
  NonNullable<ComMiloapisServicesV1Alpha1ServiceConfiguration['spec']>['monitoredResourceTypes']
>[number];

interface Props {
  resources: MonitoredResource[];
  isLoading?: boolean;
}

export function MonitoredResourcesCard({ resources, isLoading }: Props) {
  return (
    <SectionCard
      className="h-full"
      title={
        <span className="flex items-center gap-2">
          <Boxes className="h-4 w-4" />
          <Trans>Monitored Resources</Trans>
        </span>
      }>
      {isLoading ? (
        <CardRowSkeleton count={2} />
      ) : resources.length === 0 ? (
        <Text size="sm" textColor="muted" className="italic">
          <Trans>None declared.</Trans>
        </Text>
      ) : (
        <div className="flex flex-col divide-y">
          {resources.map((mr) => (
            <div key={mr.type} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
              <Text size="sm" className="font-medium">
                {mr.displayName ?? mr.type}
              </Text>
              <Text size="xs" textColor="muted" className="font-mono">
                {mr.type}
              </Text>
              {mr.description && (
                <Text size="xs" textColor="muted">
                  {mr.description}
                </Text>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
