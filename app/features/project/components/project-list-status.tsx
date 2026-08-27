import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import type { FilterGroupConfig } from '@/features/milo';
import type { ProjectPhase } from '@/features/project/lib/project-phase';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';

export function ProjectPhaseBadge({ phase }: { phase: ProjectPhase }) {
  return <BadgeState state={phase} loading={phase === 'Deleting'} />;
}

export function ProjectDeletingFor({
  deletionTimestamp,
}: {
  deletionTimestamp: string | null | undefined;
}) {
  if (!deletionTimestamp) {
    return <span className="text-muted-foreground">——</span>;
  }
  return <DateTime date={deletionTimestamp} variant="relative" addSuffix />;
}

export function ProjectCleanupMessage({ message }: { message: string | null | undefined }) {
  if (!message) {
    return <span className="text-muted-foreground">——</span>;
  }
  return (
    <Tooltip message={message}>
      <span className="block max-w-[20rem] truncate font-mono text-xs">{message}</span>
    </Tooltip>
  );
}

export function projectPhaseFilter(label: string): FilterGroupConfig {
  return {
    column: 'phase',
    label,
    options: [
      { value: 'Deleting', label: <BadgeState state="deleting" /> },
      { value: 'Suspended', label: <BadgeState state="Suspended" /> },
      { value: 'Ready', label: <BadgeState state="Ready" /> },
      { value: 'Pending', label: <BadgeState state="Pending" /> },
    ],
  };
}
