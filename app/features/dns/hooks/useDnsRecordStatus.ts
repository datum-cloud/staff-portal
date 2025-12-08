import { projectDnsRecordStatusQuery } from '@/resources/request/client';
import { ExtendedControlPlaneStatus } from '@/resources/schemas';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { useQuery } from '@tanstack/react-query';

type UseDnsRecordStatusOptions = {
  enabled?: boolean;
  refetchIntervalMs?: number | false;
  initialStatus?: ExtendedControlPlaneStatus;
};

export function useDnsRecordStatus(
  projectName: string,
  dnsRecordName: string | undefined,
  namespace: string,
  options?: UseDnsRecordStatusOptions
) {
  const baseEnabled = Boolean(dnsRecordName) && (options?.enabled ?? true);
  const refetchInterval = options?.refetchIntervalMs ?? 10000;
  const initialStatus = options?.initialStatus;

  // Only enable query (and start polling) if:
  // 1. Base conditions are met, AND
  // 2. No initial status exists, OR initial status is pending (needs polling)
  // Stop polling when:
  // - isProgrammed === true (success state)
  // - programmedReason === 'InvalidDNSRecordSet' (error state)
  const shouldPoll =
    !initialStatus ||
    (!initialStatus.isProgrammed && initialStatus.programmedReason !== 'InvalidDNSRecordSet');

  const enabled = baseEnabled && shouldPoll;

  return useQuery({
    queryKey: ['dns-records', dnsRecordName, namespace, 'status'],
    enabled,
    queryFn: async () => {
      const response = await projectDnsRecordStatusQuery(
        projectName,
        dnsRecordName as string,
        namespace
      );

      // Transform the status using the same pattern as DNS record flattening
      // The response.data is a DNSRecord, which has status.conditions
      const transformedStatus = transformControlPlaneStatus(response.status, {
        requiredConditions: ['Accepted', 'Programmed'],
        includeConditionDetails: true,
      });

      return {
        status: transformedStatus as ExtendedControlPlaneStatus,
      };
    },
    initialData: initialStatus
      ? {
          status: initialStatus,
        }
      : undefined,
    refetchInterval: enabled
      ? typeof refetchInterval === 'number'
        ? refetchInterval
        : false
      : false,
  });
}
