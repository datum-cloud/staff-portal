import { listFraudEvaluations, userGetQuery } from '@/resources/request/client';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface FraudAlertRow {
  name: string;
  userRef: string;
  userDisplay: string;
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
    queryFn: () => listFraudEvaluations({ limit: 100 }),
    refetchInterval: 60_000,
    staleTime: 30 * 1000,
  });

  const { topRows, totalCount } = useMemo(() => {
    const allItems = data?.items ?? [];
    const filtered = allItems.filter(
      (e) => e.status?.decision === 'REVIEW' || e.status?.decision === 'DEACTIVATE'
    );

    filtered.sort((a, b) => {
      const scoreA = a.status?.compositeScore;
      const scoreB = b.status?.compositeScore;
      if (scoreA == null && scoreB == null) return 0;
      if (scoreA == null) return 1;
      if (scoreB == null) return -1;
      return Number(scoreB) - Number(scoreA);
    });

    return {
      totalCount: filtered.length,
      topRows: filtered.slice(0, 5).map((e) => ({
        name: e.metadata?.name ?? '',
        userRef: e.spec?.userRef?.name ?? '',
        compositeScore:
          e.status?.compositeScore !== undefined
            ? parseFloat(String(e.status.compositeScore))
            : undefined,
        decision: e.status?.decision ?? '',
        creationTimestamp: e.metadata?.creationTimestamp ?? '',
      })),
    };
  }, [data]);

  const userQueries = useQueries({
    queries: topRows.map((row) => ({
      queryKey: ['user', row.userRef],
      queryFn: () => userGetQuery(row.userRef),
      enabled: !!row.userRef,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const alerts: FraudAlertRow[] = useMemo(
    () =>
      topRows.map((row, i) => {
        const user = userQueries[i]?.data;
        const givenName = user?.spec?.givenName;
        const familyName = user?.spec?.familyName;
        const email = user?.spec?.email;
        const fullName =
          givenName || familyName ? [givenName, familyName].filter(Boolean).join(' ') : undefined;
        return {
          ...row,
          userDisplay: fullName ?? email ?? row.userRef,
        };
      }),

    [topRows, userQueries]
  );

  return { alerts, totalCount, isLoading, isError, refetch };
}
