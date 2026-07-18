import { SectionCard } from '@/features/milo';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import type { ReactNode } from 'react';

interface Props {
  /** Main centered message. */
  message: ReactNode;
  /** Optional smaller detail (e.g. raw error message) rendered below. */
  detail?: ReactNode;
  /** Optional action row at the bottom (e.g. a retry button or a link). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Centered "state" card used for fallback content on pages where a normal
 * table or panel can't be rendered — failed queries, empty datasets,
 * "no access" situations, etc.
 */
export function MessageCard({ message, detail, actions, className }: Props) {
  return (
    <SectionCard
      className={cn('m-4', className)}
      contentClassName="flex flex-col items-center justify-center gap-3 py-12">
      <Text size="sm" textColor="muted">
        {message}
      </Text>
      {detail && (
        <Text size="sm" textColor="muted" className="font-mono text-xs">
          {detail}
        </Text>
      )}
      {actions}
    </SectionCard>
  );
}
