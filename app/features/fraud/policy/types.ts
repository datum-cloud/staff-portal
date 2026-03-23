import type { ComMiloapisFraudV1Alpha1FraudPolicy } from '@openapi/fraud.miloapis.com/v1alpha1';

export type FraudPolicy = ComMiloapisFraudV1Alpha1FraudPolicy;
export type FraudPolicySpec = ComMiloapisFraudV1Alpha1FraudPolicy['spec'];
export type Stage = ComMiloapisFraudV1Alpha1FraudPolicy['spec']['stages'][number];
