import { projectRoutes } from '@/utils/config/routes.config';
import type {
  ComDatumapisComputeV1AlphaInstance,
  ComDatumapisComputeV1AlphaWorkload,
} from '@openapi/compute.datumapis.com/v1alpha';

/**
 * Compute status for the organization overview (#765): raw Workloads and
 * Instances from one project, mapped to the fields the overview reads, with
 * links into the compute plugin's pages. Deciding what counts as an issue is
 * #766's job; this only reports what the API says.
 */

/** Label the compute controllers stamp on each Instance with its Workload's name. */
export const WORKLOAD_NAME_LABEL = 'compute.datumapis.com/workload-name';
/** Label carrying the Instance's location, used when `spec.location` is missing. */
export const INSTANCE_LOCATION_LABEL = 'compute.datumapis.com/location';

export interface ComputeCondition {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
}

/** An Instance's readiness, read from its `Ready` condition (Instance has no phase). */
export type InstanceReadiness = 'Ready' | 'NotReady' | 'Unknown';

export interface WorkloadStatus {
  name: string;
  namespace: string;
  /** Instances ready now, against how many the Workload wants. */
  ready: number;
  desired: number;
  conditions: ComputeCondition[];
  createdAt?: string;
  /** The plugin's workload detail page. */
  href: string;
}

export interface InstanceStatus {
  name: string;
  namespace: string;
  workloadName?: string;
  location?: string;
  readiness: InstanceReadiness;
  /** The `Ready` condition's reason and message, e.g. `ImageUnavailable`. */
  reason?: string;
  message?: string;
  /** When the `Ready` condition last changed. */
  since?: string;
  conditions: ComputeCondition[];
  createdAt?: string;
  /** The plugin's workload detail page for this Instance's Workload, if known. */
  workloadHref?: string;
  /** The plugin's instance detail page, if the Workload is known. */
  href?: string;
}

export interface ProjectComputeStatus {
  workloads: WorkloadStatus[];
  instances: InstanceStatus[];
  /** True when a list stopped at its page limit, so totals are a floor. */
  hasMore: boolean;
}

type RawCondition = {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
};

export function toConditions(raw: readonly RawCondition[] | undefined): ComputeCondition[] {
  return (raw ?? []).map(({ type, status, reason, message, lastTransitionTime }) => ({
    type,
    status,
    ...(reason && { reason }),
    ...(message && { message }),
    ...(lastTransitionTime && { lastTransitionTime }),
  }));
}

export function findCondition(
  conditions: readonly ComputeCondition[],
  type: string
): ComputeCondition | undefined {
  return conditions.find((condition) => condition.type === type);
}

function readinessOf(ready: ComputeCondition | undefined): InstanceReadiness {
  if (ready?.status === 'True') return 'Ready';
  if (ready?.status === 'False') return 'NotReady';
  return 'Unknown';
}

/** The compute plugin's workload detail page. */
export function workloadDetailPath(
  projectName: string,
  pluginSlug: string,
  workloadName: string
): string {
  return projectRoutes.plugin.page(projectName, pluginSlug, encodeURIComponent(workloadName));
}

/** The compute plugin's instance detail page (nested under its Workload). */
export function instanceDetailPath(
  projectName: string,
  pluginSlug: string,
  workloadName: string,
  instanceName: string
): string {
  return projectRoutes.plugin.page(
    projectName,
    pluginSlug,
    `${encodeURIComponent(workloadName)}/instances/${encodeURIComponent(instanceName)}`
  );
}

export function toWorkloadStatus(
  raw: ComDatumapisComputeV1AlphaWorkload,
  projectName: string,
  pluginSlug: string
): WorkloadStatus {
  const name = raw.metadata?.name ?? '';
  return {
    name,
    namespace: raw.metadata?.namespace ?? 'default',
    ready: raw.status?.readyReplicas ?? 0,
    desired: raw.status?.desiredReplicas ?? 0,
    conditions: toConditions(raw.status?.conditions),
    ...(raw.metadata?.creationTimestamp && { createdAt: raw.metadata.creationTimestamp }),
    href: workloadDetailPath(projectName, pluginSlug, name),
  };
}

export function toInstanceStatus(
  raw: ComDatumapisComputeV1AlphaInstance,
  projectName: string,
  pluginSlug: string
): InstanceStatus {
  const name = raw.metadata?.name ?? '';
  const labels = raw.metadata?.labels ?? {};
  const workloadName = labels[WORKLOAD_NAME_LABEL];
  const location = raw.spec?.location?.name ?? labels[INSTANCE_LOCATION_LABEL];
  const conditions = toConditions(raw.status?.conditions);
  const ready = findCondition(conditions, 'Ready');

  return {
    name,
    namespace: raw.metadata?.namespace ?? 'default',
    ...(workloadName && { workloadName }),
    ...(location && { location }),
    readiness: readinessOf(ready),
    ...(ready?.reason && { reason: ready.reason }),
    ...(ready?.message && { message: ready.message }),
    ...(ready?.lastTransitionTime && { since: ready.lastTransitionTime }),
    conditions,
    ...(raw.metadata?.creationTimestamp && { createdAt: raw.metadata.creationTimestamp }),
    ...(workloadName && {
      workloadHref: workloadDetailPath(projectName, pluginSlug, workloadName),
      href: instanceDetailPath(projectName, pluginSlug, workloadName, name),
    }),
  };
}

/** One project's compute, mapped for the overview. */
export function toProjectComputeStatus(
  data: {
    workloads: { items: ComDatumapisComputeV1AlphaWorkload[]; hasMore: boolean };
    instances: { items: ComDatumapisComputeV1AlphaInstance[]; hasMore: boolean };
  },
  projectName: string,
  pluginSlug: string
): ProjectComputeStatus {
  return {
    workloads: data.workloads.items.map((w) => toWorkloadStatus(w, projectName, pluginSlug)),
    instances: data.instances.items.map((i) => toInstanceStatus(i, projectName, pluginSlug)),
    hasMore: data.workloads.hasMore || data.instances.hasMore,
  };
}
