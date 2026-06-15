/** HTTPProxy-level condition: true when all HTTPS hostnames have ready TLS certificates */
export const HTTP_PROXY_CONDITION_CERTIFICATES_READY = 'CertificatesReady';

export const CertificatesReadyReason = {
  AllCertificatesReady: 'AllCertificatesReady',
  CertificatesPending: 'CertificatesPending',
  CertificatesFailed: 'CertificatesFailed',
} as const;

/** Per-hostname condition: whether a TLS certificate has been provisioned for this hostname */
export const HOSTNAME_CONDITION_CERTIFICATE_READY = 'CertificateReady';

export const CertificateReadyReason = {
  CertificateIssued: 'CertificateIssued',
  Pending: 'Pending',
  ProvisioningFailed: 'ProvisioningFailed',
  ChallengeInProgress: 'ChallengeInProgress',
} as const;

export type ConditionLike = {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  reason: string;
  message: string;
};

export type HttpProxyStatusLike = { conditions?: ConditionLike[] };

export type HostnameStatusLike = { hostname: string; conditions?: ConditionLike[] };

export function getCertificatesReadyCondition(
  status: HttpProxyStatusLike | null | undefined
): ConditionLike | undefined {
  return status?.conditions?.find((c) => c.type === HTTP_PROXY_CONDITION_CERTIFICATES_READY);
}

export function getCertificateReadyCondition(
  hostnameStatus: HostnameStatusLike | null | undefined
): ConditionLike | undefined {
  return hostnameStatus?.conditions?.find((c) => c.type === HOSTNAME_CONDITION_CERTIFICATE_READY);
}

export function getCertificatesReadyDisplay(
  condition: ConditionLike | undefined
): 'ready' | 'pending' | 'failed' | undefined {
  if (!condition) return undefined;
  if (
    condition.status === 'True' &&
    condition.reason === CertificatesReadyReason.AllCertificatesReady
  ) {
    return 'ready';
  }
  if (condition.reason === CertificatesReadyReason.CertificatesFailed) return 'failed';
  return 'pending';
}

export function getCertificateReadyDisplay(
  condition: ConditionLike | undefined
): 'ready' | 'pending' | 'failed' | 'challenge' | undefined {
  if (!condition) return undefined;
  if (
    condition.status === 'True' &&
    condition.reason === CertificateReadyReason.CertificateIssued
  ) {
    return 'ready';
  }
  if (condition.reason === CertificateReadyReason.ProvisioningFailed) return 'failed';
  if (condition.reason === CertificateReadyReason.ChallengeInProgress) return 'challenge';
  return 'pending';
}
