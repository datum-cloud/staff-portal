import {
  createFraudEvaluation,
  createFraudPolicy,
  createFraudProvider,
  deleteFraudEvaluation,
  deleteFraudPolicy,
  deleteFraudProvider,
  type FraudEvaluation,
  type FraudPolicySpec,
  type FraudProviderSpec,
  getFraudEvaluation,
  getFraudPolicy,
  getFraudProvider,
  listFraudEvaluations,
  listFraudPolicies,
  listFraudProviders,
  updateFraudPolicy,
  updateFraudProvider,
} from '../apis/fraud.api';
import { ListQueryParams } from '@/resources/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

// Treat 404 as "service not deployed" and return empty lists so the
// UI shows an empty-state rather than a "Resource not found" error.
function notFoundAsEmpty<T>(fn: () => Promise<T>, empty: T) {
  return async (): Promise<T> => {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.response?.status ?? err?.status ?? err?.code;
      if (status === 404 || status === 503) return empty;
      throw err;
    }
  };
}

export const useFraudPolicyListQuery = () => {
  return useQuery({
    queryKey: fraudQueryKeys.policies.all(),
    queryFn: notFoundAsEmpty(listFraudPolicies, { items: [] }),
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
    queryFn: notFoundAsEmpty(listFraudProviders, { items: [] }),
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
    queryFn: notFoundAsEmpty(() => listFraudEvaluations(params), { items: [] }),
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

export const useCreateFraudEvaluationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FraudEvaluation) => createFraudEvaluation(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: fraudQueryKeys.evaluations.all() });
    },
  });
};

export const useDeleteFraudEvaluationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => deleteFraudEvaluation(name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: fraudQueryKeys.evaluations.all() });
    },
  });
};

export const useCreateFraudProviderMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, spec }: { name: string; spec: FraudProviderSpec }) =>
      createFraudProvider(name, spec),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: fraudQueryKeys.providers.all() });
    },
  });
};

export const useUpdateFraudProviderMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, spec }: { name: string; spec: Partial<FraudProviderSpec> }) =>
      updateFraudProvider(name, spec),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: fraudQueryKeys.providers.all() });
      await queryClient.invalidateQueries({
        queryKey: fraudQueryKeys.providers.detail(variables.name),
      });
    },
  });
};

export const useDeleteFraudProviderMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => deleteFraudProvider(name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: fraudQueryKeys.providers.all() });
    },
  });
};

export const useCreateFraudPolicyMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, spec }: { name: string; spec: FraudPolicySpec }) =>
      createFraudPolicy(name, spec),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: fraudQueryKeys.policies.all() });
    },
  });
};

export const useUpdateFraudPolicyMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, spec }: { name: string; spec: Partial<FraudPolicySpec> }) =>
      updateFraudPolicy(name, spec),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: fraudQueryKeys.policies.all() });
      await queryClient.invalidateQueries({
        queryKey: fraudQueryKeys.policies.detail(variables.name),
      });
    },
  });
};

export const useDeleteFraudPolicyMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => deleteFraudPolicy(name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: fraudQueryKeys.policies.all() });
    },
  });
};
