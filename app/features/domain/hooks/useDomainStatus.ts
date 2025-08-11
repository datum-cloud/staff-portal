import { projectDomainStatusQuery } from '@/resources/request/client';
import { useQuery } from '@tanstack/react-query';

type UseDomainStatusOptions = {
  enabled?: boolean;
  refetchIntervalMs?: number | false;
};

export function useDomainStatus(
  projectName: string,
  domainName: string | undefined,
  options?: UseDomainStatusOptions
) {
  const enabled = Boolean(domainName) && (options?.enabled ?? true);
  const refetchInterval = options?.refetchIntervalMs ?? 10000;

  return useQuery({
    queryKey: ['domains', domainName, 'status'],
    enabled,
    queryFn: () => projectDomainStatusQuery(projectName, domainName as string),
    refetchInterval: enabled
      ? typeof refetchInterval === 'number'
        ? refetchInterval
        : false
      : false,
  });
}
