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

export type FraudPolicy = ComMiloapisFraudV1Alpha1FraudPolicy;
export type FraudPolicySpec = ComMiloapisFraudV1Alpha1FraudPolicy['spec'];
export type FraudProvider = ComMiloapisFraudV1Alpha1FraudProvider;
export type FraudProviderSpec = ComMiloapisFraudV1Alpha1FraudProvider['spec'];
export type FraudEvaluation = ComMiloapisFraudV1Alpha1FraudEvaluation;

export const listFraudPolicies =
  async (): Promise<ComMiloapisFraudV1Alpha1FraudPolicyList | null> => {
    const response = await listFraudMiloapisComV1Alpha1FraudPolicy();
    return response.data.data ?? null;
  };

export const getFraudPolicy = async (name: string): Promise<FraudPolicy | null> => {
  const response = await readFraudMiloapisComV1Alpha1FraudPolicy({
    path: { name },
  });
  return response.data.data ?? null;
};

export const createFraudPolicy = async (name: string, spec: FraudPolicySpec) => {
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

export const updateFraudPolicy = async (name: string, spec: Partial<FraudPolicySpec>) => {
  const response = await patchFraudMiloapisComV1Alpha1FraudPolicy({
    path: { name },
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: { spec },
  });
  return response.data.data;
};

export const deleteFraudPolicy = async (name: string) => {
  return deleteFraudMiloapisComV1Alpha1FraudPolicy({
    path: { name },
  });
};

export const listFraudProviders =
  async (): Promise<ComMiloapisFraudV1Alpha1FraudProviderList | null> => {
    const response = await listFraudMiloapisComV1Alpha1FraudProvider();
    return response.data.data ?? null;
  };

export const getFraudProvider = async (name: string): Promise<FraudProvider | null> => {
  const response = await readFraudMiloapisComV1Alpha1FraudProvider({
    path: { name },
  });
  return response.data.data ?? null;
};

export const createFraudProvider = async (name: string, spec: FraudProviderSpec) => {
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

export const updateFraudProvider = async (name: string, spec: Partial<FraudProviderSpec>) => {
  const response = await patchFraudMiloapisComV1Alpha1FraudProvider({
    path: { name },
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: { spec },
  });
  return response.data.data;
};

export const deleteFraudProvider = async (name: string) => {
  return deleteFraudMiloapisComV1Alpha1FraudProvider({
    path: { name },
  });
};

export const listFraudEvaluations = async (
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

export const getFraudEvaluation = async (name: string): Promise<FraudEvaluation | null> => {
  const response = await readFraudMiloapisComV1Alpha1FraudEvaluation({
    path: { name },
  });
  return response.data.data ?? null;
};

export const createFraudEvaluation = async (payload: FraudEvaluation) => {
  const response = await createFraudMiloapisComV1Alpha1FraudEvaluation({
    body: payload,
  });
  return response.data.data;
};

export const deleteFraudEvaluation = async (name: string) => {
  return deleteFraudMiloapisComV1Alpha1FraudEvaluation({
    path: { name },
  });
};
