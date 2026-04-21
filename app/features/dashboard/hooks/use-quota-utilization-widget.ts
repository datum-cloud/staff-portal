import { orgListQuery, orgQuotaBucketListQuery, userGetQuery } from '@/resources/request/client';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface QuotaBucketRow {
  orgName: string;
  orgDisplayName: string;
  ownerEmail: string;
  resourceType: string;
  allocated: number;
  limit: number;
  percentage: number;
}

interface OrgInfo {
  name: string;
  displayName: string;
  ownerUserRef: string;
}

interface UseQuotaUtilizationWidgetResult {
  buckets: QuotaBucketRow[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useQuotaUtilizationWidget(): UseQuotaUtilizationWidgetResult {
  const {
    data: orgData,
    isLoading: orgsLoading,
    isError: orgsError,
  } = useQuery({
    queryKey: ['dashboard', 'quota-utilization', 'orgs'],
    queryFn: () => orgListQuery({ limit: 50 }),
    staleTime: 5 * 60 * 1000,
  });

  const orgs = useMemo<OrgInfo[]>(() => {
    return (orgData?.items ?? [])
      .filter((org) => org.metadata?.name)
      .map((org) => {
        const ownerRef = org.metadata?.ownerReferences?.find((r) => r.kind === 'User');
        return {
          name: org.metadata!.name!,
          displayName:
            org.metadata?.annotations?.['kubernetes.io/display-name'] || org.metadata!.name!,
          ownerUserRef: ownerRef?.name ?? '',
        };
      });
  }, [orgData]);

  const orgNames = useMemo(() => orgs.map((o) => o.name), [orgs]);

  const {
    data: bucketResults,
    isLoading: bucketsLoading,
    isError: bucketsError,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', 'quota-utilization', 'buckets', orgNames],
    queryFn: async () => {
      const results = await Promise.allSettled(
        orgNames.map(async (orgName) => {
          const data = await orgQuotaBucketListQuery(orgName);
          return { orgName, items: data?.items ?? [] };
        })
      );

      return results
        .filter(
          (r): r is PromiseFulfilledResult<{ orgName: string; items: any[] }> =>
            r.status === 'fulfilled'
        )
        .map((r) => r.value);
    },
    enabled: orgNames.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const preliminaryBuckets = useMemo(() => {
    if (!bucketResults) return [];

    const rows: Array<{
      orgName: string;
      orgDisplayName: string;
      ownerUserRef: string;
      resourceType: string;
      allocated: number;
      limit: number;
      percentage: number;
    }> = [];

    const orgMap = new Map(orgs.map((o) => [o.name, o]));

    for (const { orgName, items } of bucketResults) {
      const orgInfo = orgMap.get(orgName);
      for (const bucket of items) {
        const allocated = bucket.status?.allocated ?? 0;
        const limit = bucket.status?.limit ?? 0;
        if (limit === 0) continue;

        const percentage = Math.round((allocated / limit) * 100);
        if (percentage < 70) continue;

        rows.push({
          orgName,
          orgDisplayName: orgInfo?.displayName ?? orgName,
          ownerUserRef: orgInfo?.ownerUserRef ?? '',
          resourceType: bucket.spec?.resourceType ?? '',
          allocated,
          limit,
          percentage,
        });
      }
    }

    rows.sort((a, b) => b.percentage - a.percentage);
    return rows.slice(0, 5);
  }, [bucketResults, orgs]);

  const uniqueOwnerRefs = useMemo(
    () => [...new Set(preliminaryBuckets.map((b) => b.ownerUserRef).filter(Boolean))],
    [preliminaryBuckets]
  );

  const ownerQueries = useQueries({
    queries: uniqueOwnerRefs.map((userRef) => ({
      queryKey: ['user', userRef],
      queryFn: () => userGetQuery(userRef),
      enabled: !!userRef,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const buckets = useMemo<QuotaBucketRow[]>(() => {
    const ownerMap = new Map<string, string>();
    uniqueOwnerRefs.forEach((ref, i) => {
      const user = ownerQueries[i]?.data;
      if (user?.spec?.email) {
        ownerMap.set(ref, user.spec.email);
      }
    });

    return preliminaryBuckets.map((row) => ({
      orgName: row.orgName,
      orgDisplayName: row.orgDisplayName,
      ownerEmail: ownerMap.get(row.ownerUserRef) ?? '',
      resourceType: row.resourceType,
      allocated: row.allocated,
      limit: row.limit,
      percentage: row.percentage,
    }));
  }, [preliminaryBuckets, uniqueOwnerRefs, ownerQueries]);

  return {
    buckets,
    isLoading: orgsLoading || bucketsLoading,
    isError: orgsError || bucketsError,
    refetch,
  };
}
