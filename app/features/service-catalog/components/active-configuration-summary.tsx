import { DateTime } from '@/components/date';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisServicesV1Alpha1ServiceConfiguration } from '@openapi/services.miloapis.com/v1alpha1';

interface Props {
  active: ComMiloapisServicesV1Alpha1ServiceConfiguration | undefined;
  configCount: number;
  isLoading?: boolean;
}

export function ActiveConfigurationSummary({ active, configCount, isLoading }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <Text size="xs" textColor="muted" className="tracking-wide uppercase">
        <Trans>Active Configuration</Trans>
      </Text>
      {isLoading ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <div className="bg-muted h-4 w-40 animate-pulse rounded" />
          <div className="bg-muted h-3 w-20 animate-pulse rounded" />
          <div className="bg-muted h-3 w-28 animate-pulse rounded" />
        </div>
      ) : active ? (
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <Text size="sm" className="font-mono">
            {active.metadata?.name}
          </Text>
          {active.spec?.version && (
            <Text size="xs" textColor="muted">
              <Trans>Version</Trans> <span className="font-mono">{active.spec.version}</span>
            </Text>
          )}
          {active.status?.publishedAt && (
            <Text size="xs" textColor="muted">
              <Trans>Published</Trans>{' '}
              <DateTime date={active.status.publishedAt} variant="relative" addSuffix />
            </Text>
          )}
        </div>
      ) : (
        <Text size="sm" textColor="muted">
          {configCount === 0 ? (
            <Trans>No service configurations have been registered yet.</Trans>
          ) : (
            <Trans>
              No Published configuration. Drafts are not fanned out to billing or quota.
            </Trans>
          )}
        </Text>
      )}
    </div>
  );
}
