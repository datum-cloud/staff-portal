import { projectDomainStatusQuery } from '@/resources/request/client';
import { useQuery } from '@tanstack/react-query';

type UseDomainStatusOptions = {
  enabled?: boolean;
  refetchIntervalMs?: number | false;
  namespace?: string;
};

export function useDomainStatus(
  projectName: string,
  domainName: string | undefined,
  options?: UseDomainStatusOptions
) {
  const namespace = options?.namespace ?? 'default';
  const enabled = Boolean(domainName) && (options?.enabled ?? true);
  const refetchInterval = options?.refetchIntervalMs ?? 10000;

  return useQuery({
    queryKey: ['projects', projectName, 'domains', namespace, domainName, 'status'],
    enabled,
    queryFn: () => projectDomainStatusQuery(projectName, domainName as string, namespace),
    refetchInterval: enabled
      ? typeof refetchInterval === 'number'
        ? refetchInterval
        : false
      : false,
  });
}
