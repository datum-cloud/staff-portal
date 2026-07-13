/**
 * Staff-portal's concrete AssistantConfig. This is the host-specific layer that
 * stays in staff-portal when the presentational pieces move to datum-ui —
 * cloud-portal will supply its own equivalent (different suggestions, tool
 * labels, model list, etc.).
 */
import {
  DEFAULT_EFFORT_ID,
  DEFAULT_MODEL_ID,
  EFFORT_OPTIONS,
  MODEL_OPTIONS,
  MODEL_SELECTOR_ENABLED,
  SUGGESTIONS,
} from './constants';
import type { AssistantConfig } from './types';
import { Brain } from 'lucide-react';

/** Tool name → progress label shown while a staff tool call is running. */
export const STAFF_TOOL_LABELS: Record<string, string> = {
  searchUsers: 'Searching users…',
  searchOrganizations: 'Searching organizations…',
  searchProjects: 'Searching projects…',
  listUsers: 'Listing users…',
  getUser: 'Fetching user details…',
  getOrganization: 'Fetching organization details…',
  getProject: 'Fetching project details…',
  listOrgProjects: 'Loading org projects…',
  listOrgMembers: 'Loading org members…',
  listUserOrganizations: 'Loading user organizations…',
  listProjectDomains: 'Loading domains…',
  listProjectDnsZones: 'Loading DNS zones…',
  listProjectEdge: 'Loading AI edge resources…',
  listProjectExportPolicies: 'Loading export policies…',
  listProjectQuotas: 'Loading quotas…',
  queryActivityLogs: 'Loading activity logs…',
  listFraudEvaluations: 'Loading fraud evaluations…',
  getFraudEvaluation: 'Fetching evaluation details…',
  listFraudPolicies: 'Loading fraud policies…',
  listBillingAccounts: 'Loading billing accounts…',
  getBillingAccount: 'Fetching billing account…',
  getProjectBillingBinding: 'Checking project billing…',
  listPaymentMethods: 'Loading payment methods…',
  queryPrometheus: 'Querying metrics…',
  queryPrometheusRange: 'Querying metrics range…',
  listSentryIssues: 'Loading Sentry issues…',
  getSentryIssue: 'Fetching Sentry issue…',
  listSentryEvents: 'Loading Sentry events…',
  searchSentryErrors: 'Searching Sentry errors…',
  getFluxStatus: 'Checking Flux status…',
  getClusterResources: 'Loading cluster resources…',
  getPodLogs: 'Fetching pod logs…',
  getPodMetrics: 'Loading pod metrics…',
  queryClusterMetrics: 'Querying cluster metrics…',
  queryClusterMetricsRange: 'Querying cluster metrics…',
  getClusterAlerts: 'Loading cluster alerts…',
  getDatumPlatformDocs: 'Reading docs…',
  getDesktopAppInfo: 'Getting app info…',
};

export const STAFF_ASSISTANT_CONFIG: AssistantConfig = {
  greeting: (name) => `Hey there${name ? `, ${name}` : ''}`,
  greetingIcon: Brain,
  suggestions: [...SUGGESTIONS],
  showReasoning: true,
  modelSelector: MODEL_SELECTOR_ENABLED
    ? {
        models: MODEL_OPTIONS,
        efforts: EFFORT_OPTIONS,
        defaultModelId: DEFAULT_MODEL_ID,
        defaultEffortId: DEFAULT_EFFORT_ID,
      }
    : false,
  toolLabels: STAFF_TOOL_LABELS,
};
