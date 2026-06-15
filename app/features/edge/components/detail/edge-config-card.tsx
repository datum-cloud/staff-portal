import { BadgeState } from '@/components/badge';
import { DescriptionList } from '@/components/description-list';
import { formatWafProtectionDisplay, type HttpProxy } from '@/features/edge/lib';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Trans } from '@lingui/react/macro';
import { useMemo } from 'react';

export function EdgeConfigCard({ proxy }: { proxy: HttpProxy }) {
  const items = useMemo(
    () => [
      {
        label: <Trans>Display Name</Trans>,
        value: proxy.chosenName ? (
          <span>{proxy.chosenName}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      },
      {
        label: <Trans>Host Header</Trans>,
        value: proxy.hostHeader ? (
          <span>{proxy.hostHeader}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      },
      {
        label: <Trans>Protection</Trans>,
        value: (
          <Badge type="quaternary" theme="outline" className="text-xs font-normal">
            {formatWafProtectionDisplay(proxy)}
          </Badge>
        ),
      },
      {
        label: <Trans>Force HTTPS</Trans>,
        value: (
          <BadgeState
            state={proxy.enableHttpRedirect ? 'yes' : 'no'}
            message={proxy.enableHttpRedirect ? 'Enabled' : 'Disabled'}
          />
        ),
      },
      {
        label: <Trans>Basic Authentication</Trans>,
        value: (
          <Badge type="quaternary" theme="outline" className="text-xs font-normal">
            {proxy.basicAuthEnabled
              ? proxy.basicAuthUserCount
                ? `${proxy.basicAuthUserCount} user${proxy.basicAuthUserCount !== 1 ? 's' : ''}`
                : 'Enabled'
              : 'Disabled'}
          </Badge>
        ),
      },
      {
        label: <Trans>Connector</Trans>,
        value: proxy.connector?.name ? (
          <span>{proxy.connector.name}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
        hidden: !proxy.connector?.name,
      },
      {
        label: <Trans>TLS Hostname</Trans>,
        value: proxy.tlsHostname ? (
          <span>{proxy.tlsHostname}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
        hidden: !proxy.tlsHostname,
      },
    ],
    [proxy]
  );

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>
          <Trans>Configuration</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DescriptionList items={items} />
      </CardContent>
    </Card>
  );
}
