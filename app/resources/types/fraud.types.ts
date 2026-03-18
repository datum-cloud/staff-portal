import type { IoK8sApimachineryPkgApisMetaV1ObjectMeta } from '@openapi/iam.miloapis.com/v1alpha1';

// FraudPolicy types
export type FraudPolicy = {
  apiVersion?: string;
  kind?: string;
  metadata?: IoK8sApimachineryPkgApisMetaV1ObjectMeta;
  spec: FraudPolicySpec;
  status?: FraudPolicyStatus;
};

export type FraudPolicySpec = {
  stages: Stage[];
  enforcement: EnforcementConfig;
  triggers?: TriggerConfig[];
  historyRetention?: HistoryRetention;
};

export type Stage = {
  name: string;
  providers: StageProvider[];
  thresholds: Threshold[];
  required?: boolean;
  shortCircuit?: ShortCircuitConfig;
};

export type StageProvider = {
  providerRef: { name: string };
};

export type Threshold = {
  minScore: number;
  action: 'REVIEW' | 'DEACTIVATE';
};

export type ShortCircuitConfig = {
  skipWhenBelow: number;
};

export type EnforcementConfig = {
  mode: 'OBSERVE' | 'AUTO';
};

export type TriggerConfig = {
  type: 'Event' | 'Manual';
  event?: string;
};

export type HistoryRetention = {
  maxEntries: number;
};

export type FraudPolicyStatus = {
  conditions?: Condition[];
};

// FraudProvider types
export type FraudProvider = {
  apiVersion?: string;
  kind?: string;
  metadata?: IoK8sApimachineryPkgApisMetaV1ObjectMeta;
  spec: FraudProviderSpec;
  status?: FraudProviderStatus;
};

export type FraudProviderSpec = {
  type: 'maxmind';
  config: FraudProviderConfig;
  failurePolicy?: 'FailOpen' | 'FailClosed';
};

export type FraudProviderConfig = {
  endpoint?: string;
  credentialsPath?: string;
  credentialsRef?: {
    name: string;
    namespace?: string;
    accountIDKey?: string;
    licenseKeyKey?: string;
  };
};

export type FraudProviderStatus = {
  conditions?: Condition[];
  lastSuccessfulCall?: string;
};

// FraudEvaluation types
export type FraudEvaluation = {
  apiVersion?: string;
  kind?: string;
  metadata?: IoK8sApimachineryPkgApisMetaV1ObjectMeta;
  spec: FraudEvaluationSpec;
  status?: FraudEvaluationStatus;
};

export type FraudEvaluationSpec = {
  userRef: { name: string };
  policyRef: { name: string; resourceVersion?: string };
};

export type FraudEvaluationStatus = {
  phase?: 'Pending' | 'Running' | 'Completed' | 'Error';
  compositeScore?: string;
  decision?: 'ACCEPTED' | 'REVIEW' | 'DEACTIVATE';
  enforcementAction?: 'OBSERVED' | 'ENFORCED';
  trigger?: string;
  lastEvaluationTime?: string;
  stageResults?: StageResult[];
  history?: HistoryEntry[];
  conditions?: Condition[];
};

export type StageResult = {
  name: string;
  skipped?: boolean;
  providerResults?: ProviderResult[];
};

export type ProviderResult = {
  provider: string;
  score: string;
  error?: string;
  failurePolicyApplied?: string;
  rawResponse?: string;
  duration?: string;
};

export type HistoryEntry = {
  timestamp: string;
  compositeScore: string;
  decision: string;
  trigger?: string;
};

// Shared
export type Condition = {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
};

// Kubernetes list wrapper
export type KubernetesList<T> = {
  apiVersion?: string;
  kind?: string;
  metadata?: { continue?: string; resourceVersion?: string };
  items: T[];
};
