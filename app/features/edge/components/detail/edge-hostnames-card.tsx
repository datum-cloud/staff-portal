import { ButtonCopy } from '@/components/button';
import {
  getCertificateReadyCondition,
  getCertificateReadyDisplay,
  type HttpProxy,
} from '@/features/edge/lib';
import { STATUS_ICONS } from '@/utils/config/icons.config';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { Lock } from 'lucide-react';
import { useMemo } from 'react';

type HostnameRow = {
  hostname: string;
  isSystem: boolean;
  verified: boolean;
  dnsProgrammed: boolean;
  certStatus: ReturnType<typeof getCertificateReadyDisplay>;
  certCondition: ReturnType<typeof getCertificateReadyCondition>;
  message?: string;
};

function StatusSeparator() {
  return (
    <span className="text-muted-foreground/60" aria-hidden>
      ·
    </span>
  );
}

function PendingStatus({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <Tooltip message={tooltip}>
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
        <STATUS_ICONS.loading className="size-3 shrink-0 animate-spin" aria-hidden />
        {label}
      </span>
    </Tooltip>
  );
}

function HostnameProvisioningStatus({ val }: { val: HostnameRow }) {
  if (val.isSystem) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px]">
      {val.verified ? (
        <Tooltip message={t`This hostname has been verified by Datum`}>
          <span className="font-medium text-green-600 dark:text-green-400">
            <Trans>Hostname Verified</Trans>
          </span>
        </Tooltip>
      ) : val.message ? (
        <Tooltip message={val.message}>
          <span className="font-medium text-red-600 dark:text-red-400">
            <Trans>Unverified</Trans>
          </span>
        </Tooltip>
      ) : (
        <PendingStatus
          label={t`Verifying hostname`}
          tooltip={t`Waiting for hostname ownership verification to complete`}
        />
      )}

      <StatusSeparator />

      {val.dnsProgrammed ? (
        <Tooltip message={t`DNS records have been programmed for this hostname`}>
          <span className="font-medium text-green-600 dark:text-green-400">
            <Trans>DNS Ready</Trans>
          </span>
        </Tooltip>
      ) : (
        <PendingStatus
          label={t`Configuring DNS`}
          tooltip={t`Programming DNS records for this hostname`}
        />
      )}

      <StatusSeparator />

      {val.certStatus === 'ready' ? (
        <Tooltip message={t`TLS certificate is issued and ready for this hostname`}>
          <span className="font-medium text-green-600 dark:text-green-400">
            <Trans>TLS Ready</Trans>
          </span>
        </Tooltip>
      ) : val.certStatus === 'failed' ? (
        <Tooltip message={val.certCondition?.message || t`TLS certificate provisioning failed`}>
          <span className="font-medium text-red-600 dark:text-red-400">
            <Trans>TLS Failed</Trans>
          </span>
        </Tooltip>
      ) : val.certStatus === 'challenge' ? (
        <PendingStatus
          label={t`Solving ACME challenge`}
          tooltip={
            val.certCondition?.message ||
            t`Completing ACME challenge with the certificate authority`
          }
        />
      ) : (
        <PendingStatus
          label={t`Issuing TLS certificate`}
          tooltip={
            val.certCondition?.message ||
            t`Requesting a TLS certificate from the certificate authority`
          }
        />
      )}
    </div>
  );
}

export function EdgeHostnamesCard({ proxy }: { proxy: HttpProxy }) {
  const systemHostnames = proxy.status?.hostnames ?? [];

  const hostnames = useMemo(() => {
    const customHostnames = proxy.hostnames ?? [];
    const statuses = proxy.hostnameStatuses ?? [];

    return customHostnames.map((hostname): HostnameRow => {
      const isSystem = systemHostnames.includes(hostname);
      const hostnameStatus = statuses.find((hs) => hs.hostname === hostname);
      const availableCondition = hostnameStatus?.conditions?.find((c) => c.type === 'Available');
      const dnsCondition = hostnameStatus?.conditions?.find(
        (c) => c.type === 'DNSRecordProgrammed'
      );
      const certCondition = getCertificateReadyCondition(hostnameStatus);
      const certStatus = getCertificateReadyDisplay(certCondition);

      const verified = availableCondition?.status === 'True';
      const dnsProgrammed = dnsCondition?.status === 'True';
      const message =
        availableCondition?.status === 'False' ? availableCondition.message : undefined;

      return {
        hostname,
        isSystem,
        verified,
        dnsProgrammed,
        certStatus,
        certCondition,
        message,
      };
    });
  }, [proxy.hostnames, proxy.hostnameStatuses, systemHostnames]);

  const defaultHostnames = systemHostnames.filter(
    (hostname) => !proxy.hostnames?.includes(hostname)
  );

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>
          <Trans>Hostnames</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {proxy.tlsHostname && (
          <div className="border-input bg-background flex items-center gap-2 rounded-md border p-2.5">
            <Lock className="text-muted-foreground size-3.5 shrink-0 self-start" />
            <div className="flex min-w-0 flex-col">
              <span className="text-muted-foreground text-[11px] font-medium">
                <Trans>TLS Hostname</Trans>
              </span>
              <Tooltip message={proxy.tlsHostname}>
                <span className="truncate text-sm font-medium">{proxy.tlsHostname}</span>
              </Tooltip>
            </div>
          </div>
        )}

        {defaultHostnames.length > 0 && (
          <div className="flex flex-col gap-2">
            <Text textColor="muted" className="text-xs font-medium uppercase">
              <Trans>System</Trans>
            </Text>
            {defaultHostnames.map((hostname) => (
              <div
                key={hostname}
                className="border-input bg-background flex items-center justify-between gap-2 rounded-md border p-2">
                <Tooltip message={hostname}>
                  <span className="min-w-0 truncate text-sm font-medium">{hostname}</span>
                </Tooltip>
                <ButtonCopy value={hostname} />
              </div>
            ))}
          </div>
        )}

        {hostnames.length > 0 ? (
          <div className="flex flex-col gap-2">
            {defaultHostnames.length > 0 && (
              <Text textColor="muted" className="text-xs font-medium uppercase">
                <Trans>Custom</Trans>
              </Text>
            )}
            {hostnames.map((val) => (
              <div
                key={val.hostname}
                className="border-input bg-background flex flex-col gap-1.5 rounded-md border p-2.5">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <Tooltip message={val.hostname}>
                    <span className="min-w-0 truncate text-sm font-medium">{val.hostname}</span>
                  </Tooltip>
                  <ButtonCopy value={val.hostname} />
                </div>
                <HostnameProvisioningStatus val={val} />
              </div>
            ))}
          </div>
        ) : defaultHostnames.length === 0 ? (
          <Text textColor="muted" className="text-sm">
            <Trans>No hostnames configured</Trans>
          </Text>
        ) : null}
      </CardContent>
    </Card>
  );
}
