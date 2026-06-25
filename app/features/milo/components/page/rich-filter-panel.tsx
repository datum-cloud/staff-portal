import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useLingui } from '@lingui/react/macro';
import { Filter } from 'lucide-react';
import { type ReactNode } from 'react';

interface RichFilterPanelProps {
  /** Number of active filters, shown in the header badge. */
  activeCount?: number;
  onClearAll?: () => void;
  children: ReactNode;
}

/**
 * STUB (#778) — composable filter sidebar. Header (icon + "Filters" + active
 * count + Clear all) over filter sections. The DataTable filter-state wiring and
 * rich option rows land in #778; this fixes the API shape so list pages can
 * adopt it now.
 */
export function RichFilterPanel({ activeCount = 0, onClearAll, children }: RichFilterPanelProps) {
  const { t } = useLingui();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="size-4" />
          <Text size="sm" weight="medium">{t`Filters`}</Text>
          {activeCount > 0 && <Badge type="secondary">{activeCount}</Badge>}
        </div>
        {activeCount > 0 && onClearAll && (
          <Button type="tertiary" theme="borderless" size="xs" onClick={onClearAll}>
            {t`Clear all`}
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

interface RichFilterSectionProps {
  label: string;
  children: ReactNode;
}

/** STUB (#778) — one collapsible filter section (label + options). */
export function RichFilterSection({ label, children }: RichFilterSectionProps) {
  return (
    <div className="flex flex-col gap-1">
      <Text size="xs" weight="medium" textColor="muted" className="tracking-wide uppercase">
        {label}
      </Text>
      {children}
    </div>
  );
}

interface RichFilterOptionProps {
  label: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}

/** STUB (#778) — a rich, clickable filter option row (icon/badge + label). */
export function RichFilterOption({ label, icon, badge, selected, onClick }: RichFilterOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
        selected ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60'
      )}>
      {icon}
      {badge}
      <Text size="sm" className="flex-1 truncate">
        {label}
      </Text>
    </button>
  );
}
