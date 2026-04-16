import { cn } from '@datum-cloud/datum-ui/utils';
import { Fragment, ReactNode } from 'react';

export interface DescriptionListItem {
  /** Key for React reconciliation. If omitted, the array index is used. */
  key?: string | number;
  /** Label shown above/left of the value */
  label: ReactNode;
  /** Value content — can be any JSX */
  value: ReactNode;
  /** Hide this row conditionally */
  hidden?: boolean;
}

interface DescriptionListProps {
  items: DescriptionListItem[];
  /** Width of the label column on desktop — defaults to 25% */
  labelWidth?: string;
  className?: string;
}

/**
 * Responsive key/value list used on detail pages.
 *
 * Desktop (≥768px): two-column grid that looks like a traditional table —
 * label in a fixed-width column on the left, value on the right, with a
 * bottom border between rows.
 *
 * Mobile: single column — label stacks above its value, with whitespace
 * between items. No cramped label column, no awkward wrapping.
 *
 * Uses semantic `<dl>` / `<dt>` / `<dd>` for accessibility.
 */
export function DescriptionList({ items, labelWidth = '25%', className }: DescriptionListProps) {
  const visibleItems = items.filter((item) => !item.hidden);

  return (
    <dl
      className={cn('flex flex-col md:grid', className)}
      style={{
        gridTemplateColumns: `${labelWidth} 1fr`,
      }}>
      {visibleItems.map((item, idx) => {
        const isLast = idx === visibleItems.length - 1;
        return (
          <Fragment key={item.key ?? idx}>
            {/* Label: on mobile sits above value with small gap; on desktop shares row. */}
            <dt
              className={cn(
                'text-muted-foreground text-sm',
                'pt-3 pb-1',
                'md:pt-3 md:pr-4 md:pb-3',
                !isLast && 'md:border-b'
              )}>
              {item.label}
            </dt>
            {/* Value: owns the row divider on mobile so there's only one line per pair. */}
            <dd className={cn('pb-3', 'md:pt-3 md:pb-3', !isLast && 'border-b md:border-b')}>
              {item.value}
            </dd>
          </Fragment>
        );
      })}
    </dl>
  );
}
