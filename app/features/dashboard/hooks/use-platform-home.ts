import { useFraudAlertsWidget } from './use-fraud-alerts-widget';
import { usePendingApprovalsWidget } from './use-pending-approvals-widget';
import { httpClient } from '@/modules/axios/axios.client';
import { activityListQuery } from '@/resources/request/client';
import type { EmailDelivery, PlatformGrowth } from '@/server/routes/platform';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface RecentCreate {
  name: string;
  displayName: string;
  secondary?: string;
  avatarUrl?: string;
  createdAt: string;
}

/**
 * Latest successful creates of a platform resource, newest first, read from
 * the audit log (list APIs can't sort by creation time).
 */
export function useRecentCreates(resourceType: 'users' | 'organizations', limit = 5) {
  return useQuery({
    queryKey: ['dashboard', 'recent-creates', resourceType, limit],
    queryFn: async () => {
      const res = await activityListQuery(undefined, undefined, {
        filters: {
          actions: 'create',
          resourceType,
          responseCode: '200,201',
          start: 'now-30d',
          end: 'now',
        },
        // Ask for a few extra: dry-runs and replays carry no object and are skipped.
        limit: limit * 2,
      });

      const seen = new Set<string>();
      const rows: RecentCreate[] = [];
      for (const log of res.data.logs) {
        const obj = log.responseObject as any;
        const name = obj?.metadata?.name;
        if (!name || seen.has(name)) continue;
        seen.add(name);

        if (resourceType === 'users') {
          const fullName = [obj.spec?.givenName, obj.spec?.familyName].filter(Boolean).join(' ');
          rows.push({
            name,
            displayName: fullName || obj.spec?.email || name,
            secondary: fullName ? obj.spec?.email : undefined,
            avatarUrl: obj.status?.avatarUrl,
            createdAt: obj.metadata?.creationTimestamp ?? log.requestReceivedTimestamp ?? '',
          });
        } else {
          rows.push({
            name,
            displayName: obj.metadata?.annotations?.['kubernetes.io/display-name'] || name,
            createdAt: obj.metadata?.creationTimestamp ?? log.requestReceivedTimestamp ?? '',
          });
        }
        if (rows.length === limit) break;
      }
      return rows;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60_000,
  });
}

export type ReviewItem =
  | {
      kind: 'fraud';
      key: string;
      name: string;
      userDisplay: string;
      decision: string;
      score?: number;
      createdAt: string;
    }
  | {
      kind: 'approval';
      key: string;
      name: string;
      userDisplay: string;
      createdAt: string;
    };

/**
 * One queue of things staff need to act on: fraud evaluations flagged for
 * deactivation or review, then users waiting for platform access. Fraud comes
 * first (deactivate, then review, each by score); approvals oldest-first, since
 * the longest wait is the most urgent.
 */
export function useReviewQueue(limit = 5) {
  const fraud = useFraudAlertsWidget();
  const approvals = usePendingApprovalsWidget();

  const items = useMemo<ReviewItem[]>(() => {
    const decisionRank = (d: string) => (d === 'DEACTIVATE' ? 0 : 1);
    const fraudItems: ReviewItem[] = [...fraud.alerts]
      .sort(
        (a, b) =>
          decisionRank(a.decision) - decisionRank(b.decision) ||
          (b.compositeScore ?? -1) - (a.compositeScore ?? -1)
      )
      .map((a) => ({
        kind: 'fraud',
        key: `fraud:${a.name}`,
        name: a.name,
        userDisplay: a.userDisplay,
        decision: a.decision,
        score: a.compositeScore,
        createdAt: a.creationTimestamp,
      }));

    const approvalItems: ReviewItem[] = [...approvals.approvals]
      .sort((a, b) => a.creationTimestamp.localeCompare(b.creationTimestamp))
      .map((a) => ({
        kind: 'approval',
        key: `approval:${a.name}`,
        name: a.name,
        userDisplay: [a.givenName, a.familyName].filter(Boolean).join(' ') || a.email || a.name,
        createdAt: a.creationTimestamp,
      }));

    return [...fraudItems, ...approvalItems].slice(0, limit);
  }, [fraud.alerts, approvals.approvals, limit]);

  return {
    items,
    fraudCount: fraud.totalCount,
    approvalCount: approvals.totalCount,
    totalCount: fraud.totalCount + approvals.totalCount,
    isLoading: fraud.isLoading || approvals.isLoading,
    isError: fraud.isError && approvals.isError,
  };
}

export function usePlatformGrowth() {
  return useQuery({
    queryKey: ['dashboard', 'platform-growth'],
    queryFn: async () => {
      const { data } = await httpClient.get('/api/platform/growth', { baseURL: '' });
      return data?.data as PlatformGrowth;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useEmailDelivery() {
  return useQuery({
    queryKey: ['dashboard', 'email-delivery'],
    queryFn: async () => {
      const { data } = await httpClient.get('/api/platform/email-delivery', { baseURL: '' });
      return data?.data as EmailDelivery;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
