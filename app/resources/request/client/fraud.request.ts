import { ListQueryParams } from '@/resources/schemas';
import type {
  FraudEvaluation,
  FraudPolicy,
  FraudPolicySpec,
  FraudProvider,
  FraudProviderSpec,
  KubernetesList,
} from '@/resources/types/fraud.types';
import { client } from '@openapi/shared/client.gen';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@datum-cloud/datum-ui/toast';
import { t } from '@lingui/core/macro';

const FRAUD_API_BASE = '/apis/fraud.miloapis.com/v1alpha1';

// ─── FraudPolicy ───

export const fraudPolicyListQuery = async (): Promise<KubernetesList<FraudPolicy> | null> => {
  const response = await client.get({
    url: `${FRAUD_API_BASE}/fraudpolicies`,
  });
  return (response.data as any)?.data ?? response.data ?? null;
};

export const fraudPolicyGetQuery = async (name: string): Promise<FraudPolicy | null> => {
  const response = await client.get({
    url: `${FRAUD_API_BASE}/fraudpolicies/${name}`,
  });
  return (response.data as any)?.data ?? response.data ?? null;
};

export const fraudPolicyCreateMutation = async (name: string, spec: FraudPolicySpec) => {
  const response = await client.post({
    url: `${FRAUD_API_BASE}/fraudpolicies`,
    body: {
      apiVersion: 'fraud.miloapis.com/v1alpha1',
      kind: 'FraudPolicy',
      metadata: { name },
      spec,
    },
  });
  return (response.data as any)?.data ?? response.data;
};

export const fraudPolicyUpdateMutation = async (name: string, spec: Partial<FraudPolicySpec>) => {
  const response = await client.patch({
    url: `${FRAUD_API_BASE}/fraudpolicies/${name}`,
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: { spec },
  });
  return (response.data as any)?.data ?? response.data;
};

export const fraudPolicyDeleteMutation = async (name: string) => {
  return client.delete({
    url: `${FRAUD_API_BASE}/fraudpolicies/${name}`,
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

export const fraudProviderListQuery = async (): Promise<KubernetesList<FraudProvider> | null> => {
  const response = await client.get({
    url: `${FRAUD_API_BASE}/fraudproviders`,
  });
  return (response.data as any)?.data ?? response.data ?? null;
};

export const fraudProviderGetQuery = async (name: string): Promise<FraudProvider | null> => {
  const response = await client.get({
    url: `${FRAUD_API_BASE}/fraudproviders/${name}`,
  });
  return (response.data as any)?.data ?? response.data ?? null;
};

export const fraudProviderCreateMutation = async (name: string, spec: FraudProviderSpec) => {
  const response = await client.post({
    url: `${FRAUD_API_BASE}/fraudproviders`,
    body: {
      apiVersion: 'fraud.miloapis.com/v1alpha1',
      kind: 'FraudProvider',
      metadata: { name },
      spec,
    },
  });
  return (response.data as any)?.data ?? response.data;
};

export const fraudProviderUpdateMutation = async (
  name: string,
  spec: Partial<FraudProviderSpec>
) => {
  const response = await client.patch({
    url: `${FRAUD_API_BASE}/fraudproviders/${name}`,
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: { spec },
  });
  return (response.data as any)?.data ?? response.data;
};

export const fraudProviderDeleteMutation = async (name: string) => {
  return client.delete({
    url: `${FRAUD_API_BASE}/fraudproviders/${name}`,
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
): Promise<KubernetesList<FraudEvaluation> | null> => {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.cursor) searchParams.set('continue', params.cursor);
  if (params?.search) searchParams.set('fieldSelector', `spec.userRef.name=${params.search}`);

  const qs = searchParams.toString();
  const response = await client.get({
    url: `${FRAUD_API_BASE}/fraudevaluations${qs ? `?${qs}` : ''}`,
  });
  return (response.data as any)?.data ?? response.data ?? null;
};

export const fraudEvaluationGetQuery = async (name: string): Promise<FraudEvaluation | null> => {
  const response = await client.get({
    url: `${FRAUD_API_BASE}/fraudevaluations/${name}`,
  });
  return (response.data as any)?.data ?? response.data ?? null;
};

export const fraudEvaluationCreateMutation = async (payload: FraudEvaluation) => {
  const response = await client.post({
    url: `${FRAUD_API_BASE}/fraudevaluations`,
    body: payload,
  });
  return (response.data as any)?.data ?? response.data;
};

export const fraudEvaluationDeleteMutation = async (name: string) => {
  return client.delete({
    url: `${FRAUD_API_BASE}/fraudevaluations/${name}`,
  });
};

export const useFraudEvaluationListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: ['fraud', 'evaluations', params],
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
