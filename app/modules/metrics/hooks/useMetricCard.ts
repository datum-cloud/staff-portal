import { PrometheusError } from '@/modules/prometheus/errors';
import type { MetricCardData, MetricFormat } from '@/modules/prometheus/types';
import { useQuery } from '@tanstack/react-query';

const METRICS_ROUTE_PATH = '/api/metrics' as const;

interface StaffPortalAPIResponse<T> {
  requestId: string;
  code: string;
  data: T;
  error?: string;
  path: string;
}

async function fetchMetricCard(
  query: string,
  metricFormat: MetricFormat = 'number'
): Promise<MetricCardData> {
  const response = await fetch(METRICS_ROUTE_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'card', query, metricFormat }),
  });

  if (!response.ok) {
    throw new PrometheusError('Metrics request failed', 'network', response.status);
  }

  let data: StaffPortalAPIResponse<MetricCardData>;
  try {
    data = await response.json();
  } catch {
    throw new PrometheusError('Invalid response from metrics API', 'network', response.status);
  }

  if (data.code !== 'API_REQUEST_SUCCESS') {
    throw new PrometheusError(data.error || 'Metrics request failed', 'network', response.status);
  }

  return data.data;
}

export function useMetricCard(options: {
  query: string;
  metricFormat?: MetricFormat;
  enabled?: boolean;
  refetchInterval?: number | false;
}) {
  const { query, metricFormat = 'number', enabled = true, refetchInterval = 60000 } = options;

  return useQuery<MetricCardData, PrometheusError>({
    queryKey: ['metrics', 'card', query, metricFormat],
    queryFn: () => fetchMetricCard(query, metricFormat),
    enabled: enabled && !!query,
    refetchInterval,
    staleTime: 30000,
    gcTime: 300000,
    retry: (failureCount, error) => {
      if (
        error instanceof PrometheusError &&
        (error.statusCode === 403 || error.statusCode === 401)
      ) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
