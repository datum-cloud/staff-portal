import { BadgeState } from '@/components/badge';
import { STATUS_ICONS } from '@/utils/config/icons.config';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisServicesV1Alpha1Service } from '@openapi/services.miloapis.com/v1alpha1';

interface Props {
  service: ComMiloapisServicesV1Alpha1Service;
}

export function DetailsCard({ service }: Props) {
  const spec = service.spec;
  const isGated = spec?.enablementPolicy?.mode === 'GatedByProvider';

  return (
    <Card className="h-full shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <STATUS_ICONS.info className="h-4 w-4" />
          <Trans>Details</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="flex flex-col gap-0.5">
            <Text size="xs" textColor="muted">
              <Trans>Service Name</Trans>
            </Text>
            <Text size="sm" className="font-mono">
              {spec?.serviceName ?? '-'}
            </Text>
          </div>
          <div className="flex flex-col gap-0.5">
            <Text size="xs" textColor="muted">
              <Trans>Display Name</Trans>
            </Text>
            <Text size="sm">{spec?.displayName ?? '-'}</Text>
          </div>
          <div className="flex flex-col gap-0.5">
            <Text size="xs" textColor="muted">
              <Trans>Phase</Trans>
            </Text>
            <div>{spec?.phase ? <BadgeState state={spec.phase} /> : <Text size="sm">-</Text>}</div>
          </div>
          <div className="flex flex-col gap-0.5">
            <Text size="xs" textColor="muted">
              <Trans>Enablement</Trans>
            </Text>
            <div>
              <BadgeState
                state={isGated ? 'warning' : 'info'}
                message={isGated ? t`Gated by Provider` : t`Self Service`}
              />
            </div>
          </div>
          <div className="col-span-2 flex flex-col gap-0.5">
            <Text size="xs" textColor="muted">
              <Trans>Owner</Trans>
            </Text>
            <Text size="sm" className="font-mono">
              {spec?.owner?.producerProjectRef?.name ?? '-'}
            </Text>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
