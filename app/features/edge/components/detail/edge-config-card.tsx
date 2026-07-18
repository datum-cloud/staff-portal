import { BadgeState } from '@/components/badge';
import { DescriptionList } from '@/components/description-list';
import { formatWafProtectionDisplay, type HttpProxy } from '@/features/edge/lib';
import { SectionCard } from '@/features/milo';
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
          <BadgeState noColor state="protection" message={formatWafProtectionDisplay(proxy)} />
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
          <BadgeState
            noColor
            state="basic-auth"
            message={
              proxy.basicAuthEnabled
                ? proxy.basicAuthUserCount
                  ? `${proxy.basicAuthUserCount} user${proxy.basicAuthUserCount !== 1 ? 's' : ''}`
                  : 'Enabled'
                : 'Disabled'
            }
          />
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
    <SectionCard title={<Trans>Configuration</Trans>}>
      <DescriptionList items={items} />
    </SectionCard>
  );
}
