import { projectDomainStatusQuery } from '@/resources/request/client';
import { ControlPlaneStatus } from '@/resources/schemas';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { ComDatumapisNetworkingV1AlphaDomain } from '@openapi/networking.datumapis.com/v1alpha';
import { useQuery } from '@tanstack/react-query';

type UseDomainStatusOptions = {
  enabled?: boolean;
  refetchIntervalMs?: number | false;
  initialDomainStatus?: ComDatumapisNetworkingV1AlphaDomain['status'];
};

export function useDomainStatus(
  projectName: string,
  domainName: string | undefined,
  namespace: string,
  options?: UseDomainStatusOptions
) {
  const baseEnabled = Boolean(domainName) && (options?.enabled ?? true);
  const refetchInterval = options?.refetchIntervalMs ?? 10000;
  const initialDomainStatus = options?.initialDomainStatus;

  // Transform initial status to check if we should poll
  const initialTransformedStatus = initialDomainStatus
    ? transformControlPlaneStatus(initialDomainStatus)
    : undefined;

  // Only enable query (and start polling) if:
  // 1. Base conditions are met, AND
  // 2. No initial status exists, OR initial status is pending (needs polling)
  // Stop polling when:
  // - status === ControlPlaneStatus.Success (verified)
  // - status === ControlPlaneStatus.Error (error state)
  const shouldPoll =
    !initialTransformedStatus || initialTransformedStatus.status === ControlPlaneStatus.Pending;

  const enabled = baseEnabled && shouldPoll;

  return useQuery({
    queryKey: ['domains', domainName, namespace, 'status'],
    enabled,
    queryFn: () => projectDomainStatusQuery(projectName, domainName as string, namespace),
    initialData: initialDomainStatus
      ? {
          status: initialDomainStatus,
          spec: {
            domainName: domainName as string,
          },
        }
      : undefined,
    refetchInterval: enabled
      ? typeof refetchInterval === 'number'
        ? refetchInterval
        : false
      : false,
  });
}
