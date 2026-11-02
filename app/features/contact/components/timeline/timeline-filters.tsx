import { type TimelineEventType } from '../../lib/contact-timeline';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';
import * as React from 'react';

/** Which event types each filter chip reveals (`null` = all). Shared with the feed's filter logic. */
export const TIMELINE_FILTERS: {
  key: string;
  label: React.ReactNode;
  types: TimelineEventType[] | null;
}[] = [
  { key: 'all', label: <Trans>All</Trans>, types: null },
  { key: 'notes', label: <Trans>Notes</Trans>, types: ['note'] },
  { key: 'emails', label: <Trans>Emails</Trans>, types: ['email'] },
  { key: 'orgs', label: <Trans>Organizations</Trans>, types: ['org'] },
  { key: 'groups', label: <Trans>Contact groups</Trans>, types: ['group'] },
  { key: 'account', label: <Trans>Account</Trans>, types: ['access', 'signup'] },
];

type Props = {
  active: string;
  onChange: (key: string) => void;
  sortDir: 'desc' | 'asc';
  onToggleSort: () => void;
};

export function TimelineFilters({ active, onChange, sortDir, onToggleSort }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {TIMELINE_FILTERS.map((f) => {
        const isActive = f.key === active;
        return (
          <button
            key={f.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(f.key)}
            className={cn(
              'flex items-center rounded-full px-2.5 py-0.5 transition-colors',
              isActive ? 'bg-foreground' : 'bg-card hover:bg-accent border'
            )}>
            <Text
              size="xs"
              className={cn(
                'leading-normal font-medium',
                isActive ? 'text-background' : 'text-muted-foreground'
              )}>
              {f.label}
            </Text>
          </button>
        );
      })}
      <div className="flex-1" />
      <button
        type="button"
        onClick={onToggleSort}
        className="hover:text-foreground text-muted-foreground transition-colors">
        <Text size="xs" className="text-inherit">
          {sortDir === 'desc' ? <Trans>Newest first ↓</Trans> : <Trans>Oldest first ↑</Trans>}
        </Text>
      </button>
    </div>
  );
}
