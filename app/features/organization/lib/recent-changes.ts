import { realTime } from './org-issues';
import { shapeAuditEvent } from '@/modules/assistant/tools/activity-query';
import type { IoK8sApiserverPkgApisAuditV1Event } from '@openapi/activity.miloapis.com/v1alpha1';

/**
 * The organization overview's "What changed" (#770): the newest changes in
 * the last 24 hours across the organization's audit log and its projects'.
 * Pure; the component does the rendering.
 */

/** One control plane's audit entries: the organization's own (no `project`) or a project's. */
export interface AuditSource {
  project?: string;
  events: readonly IoK8sApiserverPkgApisAuditV1Event[];
}

export interface ChangeRow {
  id: string;
  /** Undefined for the organization's own changes. */
  project?: string;
  actor: string;
  verb: string;
  /** Readable kind, e.g. "HTTP proxy" or "Workload". */
  resource?: string;
  name?: string;
  /** ISO time the request was received. */
  time?: string;
}

/** How many changes the card shows. */
export const RECENT_CHANGES_SHOWN = 5;

/** A request that failed changed nothing. */
const succeeded = (event: IoK8sApiserverPkgApisAuditV1Event): boolean =>
  (event.responseStatus?.code ?? 200) < 400;

const toRow = (
  project: string | undefined,
  event: IoK8sApiserverPkgApisAuditV1Event
): ChangeRow => {
  const shaped = shapeAuditEvent(event);
  return {
    id: event.auditID,
    ...(project && { project }),
    actor: shaped.actor ?? '',
    verb: shaped.verb ?? event.verb,
    ...(shaped.resource && { resource: shaped.resource }),
    ...(shaped.name && { name: shaped.name }),
    ...(shaped.time && { time: shaped.time }),
  };
};

const timeOf = (row: ChangeRow): number => realTime(row.time) ?? -Infinity;

/**
 * The newest `limit` successful changes across all sources, newest first.
 * An entry seen twice (same audit ID) counts once.
 */
export function recentChanges(
  sources: readonly AuditSource[],
  limit: number = RECENT_CHANGES_SHOWN
): ChangeRow[] {
  const rows = sources.flatMap((source) =>
    source.events.filter(succeeded).map((event) => toRow(source.project, event))
  );
  const unique = [...new Map(rows.map((row) => [row.id, row])).values()];
  return unique.sort((a, b) => timeOf(b) - timeOf(a) || 0).slice(0, limit);
}
