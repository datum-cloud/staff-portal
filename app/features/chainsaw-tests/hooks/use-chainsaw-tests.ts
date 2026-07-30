import { httpClient } from '@/modules/axios/axios.client';
import { useQuery } from '@tanstack/react-query';

export interface ChainsawTestRun {
  timestamp: number;
  passed: boolean;
}

export interface ChainsawTestRow {
  key: string;
  test: string;
  suite: string;
  environment: string;
  history: ChainsawTestRun[];
  latest: ChainsawTestRun | null;
  grafanaUrl: string;
  docsUrl: string;
}

export interface ChainsawTestsData {
  tests: ChainsawTestRow[];
  githubActionsUrl: string;
}

function parseResponse(raw: any): ChainsawTestsData {
  const payload = raw?.data;
  if (!payload?.tests) {
    return { tests: [], githubActionsUrl: '' };
  }
  return payload;
}

export function useChainsawTests() {
  return useQuery({
    queryKey: ['dashboard', 'chainsaw-tests'],
    queryFn: async () => {
      const { data } = await httpClient.post('/api/chainsaw-tests', {}, { baseURL: '' });
      return parseResponse(data);
    },
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });
}
