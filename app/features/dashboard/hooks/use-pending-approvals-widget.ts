import { userListQuery } from '@/resources/request/client';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface PendingApprovalRow {
  name: string;
  email: string;
  givenName: string;
  familyName: string;
  creationTimestamp: string;
}

interface UsePendingApprovalsWidgetResult {
  approvals: PendingApprovalRow[];
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function usePendingApprovalsWidget(): UsePendingApprovalsWidgetResult {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'pending-approvals'],
    queryFn: () => userListQuery({ filters: { registrationApproval: 'Pending' }, limit: 5 }),
    refetchInterval: 60_000,
    staleTime: 30 * 1000,
  });

  const { approvals, totalCount } = useMemo(() => {
    const items = data?.items ?? [];
    const totalCount = items.length + (data?.metadata?.remainingItemCount ?? 0);

    const rows: PendingApprovalRow[] = items.map((user) => ({
      name: user.metadata?.name ?? '',
      email: user.spec?.email ?? '',
      givenName: user.spec?.givenName ?? '',
      familyName: user.spec?.familyName ?? '',
      creationTimestamp: user.metadata?.creationTimestamp ?? '',
    }));

    return { approvals: rows, totalCount };
  }, [data]);

  return { approvals, totalCount, isLoading, isError, refetch };
}
