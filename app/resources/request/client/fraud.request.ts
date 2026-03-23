import { ListQueryParams } from '@/resources/schemas';
import {
  createFraudMiloapisComV1Alpha1FraudEvaluation,
  createFraudMiloapisComV1Alpha1FraudPolicy,
  createFraudMiloapisComV1Alpha1FraudProvider,
  deleteFraudMiloapisComV1Alpha1FraudEvaluation,
  deleteFraudMiloapisComV1Alpha1FraudPolicy,
  deleteFraudMiloapisComV1Alpha1FraudProvider,
  listFraudMiloapisComV1Alpha1FraudEvaluation,
  listFraudMiloapisComV1Alpha1FraudPolicy,
  listFraudMiloapisComV1Alpha1FraudProvider,
  patchFraudMiloapisComV1Alpha1FraudPolicy,
  patchFraudMiloapisComV1Alpha1FraudProvider,
  readFraudMiloapisComV1Alpha1FraudEvaluation,
  readFraudMiloapisComV1Alpha1FraudPolicy,
  readFraudMiloapisComV1Alpha1FraudProvider,
  type ComMiloapisFraudV1Alpha1FraudEvaluation,
  type ComMiloapisFraudV1Alpha1FraudEvaluationList,
  type ComMiloapisFraudV1Alpha1FraudPolicy,
  type ComMiloapisFraudV1Alpha1FraudPolicyList,
  type ComMiloapisFraudV1Alpha1FraudProvider,
  type ComMiloapisFraudV1Alpha1FraudProviderList,
} from '@openapi/fraud.miloapis.com/v1alpha1';
import { useQuery } from '@tanstack/react-query';

type FraudPolicy = ComMiloapisFraudV1Alpha1FraudPolicy;
type FraudPolicySpec = ComMiloapisFraudV1Alpha1FraudPolicy['spec'];
type FraudProvider = ComMiloapisFraudV1Alpha1FraudProvider;
type FraudProviderSpec = ComMiloapisFraudV1Alpha1FraudProvider['spec'];
type FraudEvaluation = ComMiloapisFraudV1Alpha1FraudEvaluation;

// ─── FraudPolicy ───

export const fraudPolicyListQuery =
  async (): Promise<ComMiloapisFraudV1Alpha1FraudPolicyList | null> => {
    const response = await listFraudMiloapisComV1Alpha1FraudPolicy();
    return response.data.data ?? null;
  };

export const fraudPolicyGetQuery = async (name: string): Promise<FraudPolicy | null> => {
  const response = await readFraudMiloapisComV1Alpha1FraudPolicy({
    path: { name },
  });
  return response.data.data ?? null;
};

export const fraudPolicyCreateMutation = async (name: string, spec: FraudPolicySpec) => {
  const response = await createFraudMiloapisComV1Alpha1FraudPolicy({
    body: {
      apiVersion: 'fraud.miloapis.com/v1alpha1',
      kind: 'FraudPolicy',
      metadata: { name },
      spec,
    },
  });
  return response.data.data;
};

export const fraudPolicyUpdateMutation = async (name: string, spec: Partial<FraudPolicySpec>) => {
  const response = await patchFraudMiloapisComV1Alpha1FraudPolicy({
    path: { name },
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: { spec },
  });
  return response.data.data;
};

export const fraudPolicyDeleteMutation = async (name: string) => {
  return deleteFraudMiloapisComV1Alpha1FraudPolicy({
    path: { name },
  });
};

export const useFraudPolicyListQuery = () => {
  return useQuery({
    queryKey: ['fraud', 'policies'],
    queryFn: () => fraudPolicyListQuery(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useFraudPolicyDetailQuery = (name: string) => {
  return useQuery({
    queryKey: ['fraud', 'policies', name],
    queryFn: () => fraudPolicyGetQuery(name),
    enabled: !!name,
    staleTime: 30 * 1000,
  });
};

// ─── FraudProvider ───

export const fraudProviderListQuery =
  async (): Promise<ComMiloapisFraudV1Alpha1FraudProviderList | null> => {
    const response = await listFraudMiloapisComV1Alpha1FraudProvider();
    return response.data.data ?? null;
  };

export const fraudProviderGetQuery = async (name: string): Promise<FraudProvider | null> => {
  const response = await readFraudMiloapisComV1Alpha1FraudProvider({
    path: { name },
  });
  return response.data.data ?? null;
};

export const fraudProviderCreateMutation = async (name: string, spec: FraudProviderSpec) => {
  const response = await createFraudMiloapisComV1Alpha1FraudProvider({
    body: {
      apiVersion: 'fraud.miloapis.com/v1alpha1',
      kind: 'FraudProvider',
      metadata: { name },
      spec,
    },
  });
  return response.data.data;
};

export const fraudProviderUpdateMutation = async (
  name: string,
  spec: Partial<FraudProviderSpec>
) => {
  const response = await patchFraudMiloapisComV1Alpha1FraudProvider({
    path: { name },
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: { spec },
  });
  return response.data.data;
};

export const fraudProviderDeleteMutation = async (name: string) => {
  return deleteFraudMiloapisComV1Alpha1FraudProvider({
    path: { name },
  });
};

export const useFraudProviderListQuery = () => {
  return useQuery({
    queryKey: ['fraud', 'providers'],
    queryFn: () => fraudProviderListQuery(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useFraudProviderDetailQuery = (name: string) => {
  return useQuery({
    queryKey: ['fraud', 'providers', name],
    queryFn: () => fraudProviderGetQuery(name),
    enabled: !!name,
    staleTime: 30 * 1000,
  });
};

// ─── FraudEvaluation ───

export const fraudEvaluationListQuery = async (
  params?: ListQueryParams
): Promise<ComMiloapisFraudV1Alpha1FraudEvaluationList | null> => {
  const response = await listFraudMiloapisComV1Alpha1FraudEvaluation({
    query: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
      ...(params?.search && { fieldSelector: `spec.userRef.name=${params.search}` }),
    },
  });
  return response.data.data ?? null;
};

export const fraudEvaluationGetQuery = async (name: string): Promise<FraudEvaluation | null> => {
  const response = await readFraudMiloapisComV1Alpha1FraudEvaluation({
    path: { name },
  });
  return response.data.data ?? null;
};

export const fraudEvaluationCreateMutation = async (payload: FraudEvaluation) => {
  const response = await createFraudMiloapisComV1Alpha1FraudEvaluation({
    body: payload,
  });
  return response.data.data;
};

export const fraudEvaluationDeleteMutation = async (name: string) => {
  return deleteFraudMiloapisComV1Alpha1FraudEvaluation({
    path: { name },
  });
};

export const useFraudEvaluationListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: ['fraud', 'evaluations', 'list', params],
    queryFn: () => fraudEvaluationListQuery(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useFraudEvaluationDetailQuery = (name: string) => {
  return useQuery({
    queryKey: ['fraud', 'evaluations', name],
    queryFn: () => fraudEvaluationGetQuery(name),
    enabled: !!name,
    staleTime: 30 * 1000,
  });
};
