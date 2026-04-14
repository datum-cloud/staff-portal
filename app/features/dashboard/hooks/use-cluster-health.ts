import { httpClient } from '@/modules/axios/axios.client';
import { useQuery } from '@tanstack/react-query';

export interface ClusterEntry {
  name: string;
  region?: string;
  nodesReady: boolean;
  gatewayHealthy: boolean | null;
  memoryPressure: boolean;
  diskPressure: boolean;
  pidPressure: boolean;
  requestRate: number | null;
  certExpiryDays: number | null;
  restartingContainers: number;
}

export interface ClusterHealthData {
  clusters: ClusterEntry[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
  };
}

function parseResponse(raw: any): ClusterHealthData {
  const payload = raw?.data;
  if (!payload?.clusters) {
    return { clusters: [], summary: { total: 0, healthy: 0, unhealthy: 0 } };
  }
  return payload;
}

export function useClusterHealth() {
  return useQuery({
    queryKey: ['dashboard', 'cluster-health'],
    queryFn: async () => {
      const { data } = await httpClient.post('/api/cluster/health', {}, { baseURL: '' });
      return parseResponse(data);
    },
    staleTime: 60 * 1000,
    refetchInterval: 60_000,
    retry: 1,
  });
}
