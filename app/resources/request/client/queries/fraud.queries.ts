import {
  getFraudEvaluation,
  getFraudPolicy,
  getFraudProvider,
  listFraudEvaluations,
  listFraudPolicies,
  listFraudProviders,
} from '../apis/fraud.api';
import { ListQueryParams } from '@/resources/schemas';
import { useQuery } from '@tanstack/react-query';

export const fraudQueryKeys = {
  all: ['fraud'] as const,
  policies: {
    all: () => ['fraud', 'policies'] as const,
    detail: (name: string) => ['fraud', 'policies', name] as const,
  },
  providers: {
    all: () => ['fraud', 'providers'] as const,
    detail: (name: string) => ['fraud', 'providers', name] as const,
  },
  evaluations: {
    all: () => ['fraud', 'evaluations'] as const,
    list: (params?: ListQueryParams) => ['fraud', 'evaluations', 'list', params] as const,
    detail: (name: string) => ['fraud', 'evaluations', name] as const,
  },
};

export const useFraudPolicyListQuery = () => {
  return useQuery({
    queryKey: fraudQueryKeys.policies.all(),
    queryFn: listFraudPolicies,
    staleTime: 5 * 60 * 1000,
  });
};

export const useFraudPolicyDetailQuery = (name: string) => {
  return useQuery({
    queryKey: fraudQueryKeys.policies.detail(name),
    queryFn: () => getFraudPolicy(name),
    enabled: !!name,
    staleTime: 30 * 1000,
  });
};

export const useFraudProviderListQuery = () => {
  return useQuery({
    queryKey: fraudQueryKeys.providers.all(),
    queryFn: listFraudProviders,
    staleTime: 5 * 60 * 1000,
  });
};

export const useFraudProviderDetailQuery = (name: string) => {
  return useQuery({
    queryKey: fraudQueryKeys.providers.detail(name),
    queryFn: () => getFraudProvider(name),
    enabled: !!name,
    staleTime: 30 * 1000,
  });
};

export const useFraudEvaluationListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: fraudQueryKeys.evaluations.list(params),
    queryFn: () => listFraudEvaluations(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useFraudEvaluationDetailQuery = (name: string) => {
  return useQuery({
    queryKey: fraudQueryKeys.evaluations.detail(name),
    queryFn: () => getFraudEvaluation(name),
    enabled: !!name,
    staleTime: 30 * 1000,
  });
};
