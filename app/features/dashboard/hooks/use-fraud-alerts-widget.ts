import { listFraudEvaluations } from '@/resources/request/client';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface FraudAlertRow {
  name: string;
  userRef: string;
  compositeScore: number | undefined;
  decision: string;
  creationTimestamp: string;
}

interface UseFraudAlertsWidgetResult {
  alerts: FraudAlertRow[];
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useFraudAlertsWidget(): UseFraudAlertsWidgetResult {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'fraud-alerts'],
    // Limit to 100 records per refresh. The fraud API does not support a
    // fieldSelector for status.decision, so client-side filtering is required.
    // 100 is a practical upper bound for a 60 s auto-refresh widget; evaluations
    // beyond this limit are a known gap and should be revisited if volume grows.
    queryFn: () => listFraudEvaluations({ limit: 100 }),
    refetchInterval: 60_000,
    staleTime: 30 * 1000,
  });

  const { alerts, totalCount } = useMemo(() => {
    const allItems = data?.items ?? [];
    const filtered = allItems.filter(
      (e) => e.status?.decision === 'REVIEW' || e.status?.decision === 'DEACTIVATE'
    );

    // Sort by compositeScore descending (highest risk first); undefined scores sort last
    filtered.sort((a, b) => {
      const scoreA = a.status?.compositeScore;
      const scoreB = b.status?.compositeScore;
      if (scoreA == null && scoreB == null) return 0;
      if (scoreA == null) return 1; // undefined sorts last
      if (scoreB == null) return -1;
      return Number(scoreB) - Number(scoreA);
    });

    const totalCount = filtered.length;
    const rows: FraudAlertRow[] = filtered.slice(0, 5).map((e) => ({
      name: e.metadata?.name ?? '',
      userRef: e.spec?.userRef?.name ?? '',
      compositeScore:
        e.status?.compositeScore !== undefined
          ? parseFloat(String(e.status.compositeScore))
          : undefined,
      decision: e.status?.decision ?? '',
      creationTimestamp: e.metadata?.creationTimestamp ?? '',
    }));

    return { alerts: rows, totalCount };
  }, [data]);

  return { alerts, totalCount, isLoading, isError, refetch };
}
