export const PROJECT_RESOURCE_CLEANUP = 'ResourceCleanup';

export type ProjectPhase = 'Deleting' | 'Suspended' | 'Ready' | 'Pending';

type ConditionLike = {
  type?: string;
  status?: string;
  message?: string;
};

export type ProjectDeletionSource = {
  deletionTimestamp?: string | Date | null;
  resourceCleanupMessage?: string | null;
  state?: string | null;
  metadata?: { deletionTimestamp?: string | Date | null };
  status?: { conditions?: ConditionLike[] };
};

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
  const fromList = project.resourceCleanupMessage?.trim();
  if (fromList) return fromList;

  const fromCondition = project.status?.conditions
    ?.find((condition) => condition.type === PROJECT_RESOURCE_CLEANUP)
    ?.message?.trim();
  return fromCondition || null;
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

  if (project?.state === 'True') return 'Ready';
  const ready = project?.status?.conditions?.find((condition) => condition.type === 'Ready');
  if (ready?.status === 'True') return 'Ready';

  return 'Pending';
}

export function withProjectPhase<T extends ProjectDeletionSource>(
  project: T,
  opts?: { suspended?: boolean }
): T & { phase: ProjectPhase } {
  return { ...project, phase: getProjectPhase(project, opts) };
}
