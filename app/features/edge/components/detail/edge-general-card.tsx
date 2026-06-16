import { BadgeCondition, BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DescriptionList } from '@/components/description-list';
import { DisplayText } from '@/components/display';
import {
  getCertificatesReadyCondition,
  getCertificatesReadyDisplay,
  type HttpProxy,
} from '@/features/edge/lib';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Trans } from '@lingui/react/macro';
import { useMemo } from 'react';

export function EdgeGeneralCard({ proxy }: { proxy: HttpProxy }) {
  const hostname = proxy.canonicalHostname ?? proxy.status?.hostnames?.[0];

  const items = useMemo(() => {
    const certCondition = getCertificatesReadyCondition(proxy.status);
    const certDisplay = getCertificatesReadyDisplay(certCondition);

    return [
      {
        label: <Trans>Status</Trans>,
        value: <BadgeCondition status={proxy.status} multiple={false} showMessage />,
      },
      {
        label: <Trans>TLS Certificates</Trans>,
        value:
          certDisplay === undefined ? (
            <span className="text-muted-foreground text-sm">—</span>
          ) : certDisplay === 'ready' ? (
            <BadgeState state="success" message={certCondition?.message || 'Ready'} />
          ) : certDisplay === 'failed' ? (
            <BadgeState state="error" message={certCondition?.message || 'Failed'} />
          ) : (
            <BadgeState state="warning" message={certCondition?.message || 'Pending'} />
          ),
      },
      {
        label: <Trans>Resource Name</Trans>,
        value: <DisplayText value={proxy.name} withCopy />,
      },
      {
        label: <Trans>Default Hostname</Trans>,
        value: hostname ? <DisplayText value={hostname} withCopy /> : '—',
        hidden: !hostname,
      },
      {
        label: <Trans>Created</Trans>,
        value: <DateTime date={proxy.createdAt} variant="both" />,
      },
    ];
  }, [proxy, hostname]);

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>
          <Trans>General</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DescriptionList items={items} />
      </CardContent>
    </Card>
  );
}
