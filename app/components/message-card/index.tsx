import { Card, CardContent } from '@datum-cloud/datum-ui/card';
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
 * Centered "state" Card used for fallback content on pages where a normal
 * table or panel can't be rendered — failed queries, empty datasets,
 * "no access" situations, etc.
 *
 * Wraps muted text + optional detail line + optional action row inside a
 * Card matching the project's standard shell (`m-4`, no shadow).
 */
export function MessageCard({ message, detail, actions, className }: Props) {
  return (
    <Card className={cn('m-4 shadow-none', className)}>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
        <Text size="sm" textColor="muted">
          {message}
        </Text>
        {detail && (
          <Text size="sm" textColor="muted" className="font-mono text-xs">
            {detail}
          </Text>
        )}
        {actions}
      </CardContent>
    </Card>
  );
}
