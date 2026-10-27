export const PROJECT_RESOURCE_CLEANUP = 'ResourceCleanup';

export type ProjectPhase = 'Deleting' | 'Suspended' | 'Ready' | 'Pending';

type ConditionLike = {
  type?: string;
  status?: string;
  message?: string | null;
};

/**
 * A project from either source: a gateway row carries `conditions` at the top
 * level, a REST project carries them under `status`.
 */
export type ProjectDeletionSource = {
  deletionTimestamp?: string | Date | null;
  conditions?: ConditionLike[] | null;
  metadata?: { deletionTimestamp?: string | Date | null };
  status?: { conditions?: ConditionLike[] };
};

function findCondition(project: ProjectDeletionSource, type: string): ConditionLike | undefined {
  return (project.conditions ?? project.status?.conditions)?.find(
    (condition) => condition.type === type
  );
}

function deletionTimestampOf(project: ProjectDeletionSource): string | Date | null | undefined {
  return project.deletionTimestamp ?? project.metadata?.deletionTimestamp;
}

export function isProjectDeleting(project: ProjectDeletionSource | null | undefined): boolean {
  return Boolean(deletionTimestampOf(project ?? {}));
}

export function getResourceCleanupMessage(
  project: ProjectDeletionSource | null | undefined
): string | null {
  if (!project) return null;
  return findCondition(project, PROJECT_RESOURCE_CLEANUP)?.message?.trim() || null;
}

/**
 * Suspension lives on a separate `ProjectSuspension` resource, not on the
 * project object, so callers that know a project is suspended pass it in.
 * Precedence: a project actively being deleted shows `Deleting` even if it also
 * carries a suspension (deletion is the more terminal, actionable state).
 */
export function getProjectPhase(
  project: ProjectDeletionSource | null | undefined,
  opts?: { suspended?: boolean }
): ProjectPhase {
  if (isProjectDeleting(project)) return 'Deleting';
  if (opts?.suspended) return 'Suspended';

  if (project && findCondition(project, 'Ready')?.status === 'True') return 'Ready';

  return 'Pending';
}

/** A project row with its phase and cleanup message derived from conditions. */
export type WithProjectPhase<T> = T & {
  phase: ProjectPhase;
  resourceCleanupMessage: string | null;
};

export function withProjectPhase<T extends ProjectDeletionSource>(
  project: T,
  opts?: { suspended?: boolean }
): WithProjectPhase<T> {
  return {
    ...project,
    phase: getProjectPhase(project, opts),
    resourceCleanupMessage: getResourceCleanupMessage(project),
  };
}
