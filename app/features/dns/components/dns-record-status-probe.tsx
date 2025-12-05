import BadgeProgrammingError from '@/components/badge/badge-programming-error';
import BadgeState from '@/components/badge/badge-state';
import { useDnsRecordStatus } from '@/features/dns/hooks/useDnsRecordStatus';
import { ExtendedControlPlaneStatus } from '@/resources/schemas';
import { useLingui } from '@lingui/react/macro';

export function DnsRecordStatusProbe({
  projectName,
  dnsRecordName,
  namespace,
  initialStatus,
}: {
  projectName: string;
  dnsRecordName: string;
  namespace: string;
  initialStatus?: ExtendedControlPlaneStatus;
}) {
  const { t } = useLingui();
  const { data, isLoading, error } = useDnsRecordStatus(projectName, dnsRecordName, namespace, {
    enabled: Boolean(dnsRecordName),
    refetchIntervalMs: 10000,
    initialStatus,
  });

  if (!dnsRecordName) return null;

  // Only show loading if we don't have initial status
  if (isLoading && !initialStatus) {
    return <BadgeState state="pending" message={t`Loading status...`} loading />;
  }

  if (error) {
    return <BadgeState state="error" tooltip={t`Failed to load DNS record status`} />;
  }

  const status = data?.status;

  // If programmed (success state), don't show badge
  if (status?.isProgrammed === true) {
    return null;
  }

  // Error state - InvalidDNSRecordSet (matches original BadgeProgrammingError behavior)
  if (status?.programmedReason === 'InvalidDNSRecordSet') {
    return (
      <BadgeProgrammingError
        isProgrammed={status?.isProgrammed}
        programmedReason={status?.programmedReason}
        statusMessage={status?.message}
        errorReasons={['InvalidDNSRecordSet']}
      />
    );
  }

  // Other states (pending, other errors, unknown) - use actual status value
  const tooltipText =
    status?.message || status?.programmedReason || t`DNS record is being validated`;

  // Use the actual status from transformed status (could be 'success', 'error', 'pending')
  // But since isProgrammed !== true, it will be 'error' or 'pending' in practice
  const badgeState = status?.status === 'error' ? 'error' : 'pending';

  return (
    <BadgeState
      state={badgeState}
      message={t`Validating`}
      loading={badgeState === 'pending'}
      tooltip={tooltipText}
    />
  );
}

export default DnsRecordStatusProbe;
