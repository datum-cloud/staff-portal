import type { ComMiloapisFraudV1Alpha1FraudEvaluation } from '@openapi/fraud.miloapis.com/v1alpha1';

export type FraudEvaluation = ComMiloapisFraudV1Alpha1FraudEvaluation;
export type FraudEvaluationStatus = NonNullable<ComMiloapisFraudV1Alpha1FraudEvaluation['status']>;
export type StageResult = NonNullable<FraudEvaluationStatus['stageResults']>[number];
export type ProviderResult = NonNullable<StageResult['providerResults']>[number];
export type HistoryEntry = NonNullable<FraudEvaluationStatus['history']>[number];
