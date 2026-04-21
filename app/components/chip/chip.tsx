import { Badge, type BadgeProps } from '@datum-cloud/datum-ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@datum-cloud/datum-ui/popover';
import { cn } from '@datum-cloud/datum-ui/utils';
import * as React from 'react';

export type ChipItem = string | React.ReactNode;

export type ChipSize = 'sm' | 'md' | 'lg';

export interface ChipProps {
  items: ChipItem[];
  maxVisible?: number;
  size?: ChipSize;
  variant?: BadgeProps['type'] | 'outline';
  renderChip?: (item: ChipItem, index: number) => React.ReactNode;
  overflowLabel?: (hiddenCount: number) => string;
  className?: string;
  wrap?: boolean;
  disabled?: boolean;
  onChipClick?: (item: ChipItem, index: number) => void;
}

const sizeClassNames: Record<ChipSize, string> = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-sm px-3 py-1',
};

export function Chip({
  items,
  maxVisible = 2,
  size = 'md',
  variant = 'secondary',
  renderChip,
  overflowLabel = (n) => `${n}+`,
  className,
  wrap = false,
  disabled = false,
  onChipClick,
}: ChipProps) {
  const [open, setOpen] = React.useState(false);

  const { visibleItems, hiddenItems } = React.useMemo(() => {
    if (wrap) return { visibleItems: items, hiddenItems: [] as ChipItem[] };
    if (!items || items.length === 0)
      return { visibleItems: [] as ChipItem[], hiddenItems: [] as ChipItem[] };
    if (items.length <= maxVisible) return { visibleItems: items, hiddenItems: [] as ChipItem[] };
    return { visibleItems: items.slice(0, maxVisible), hiddenItems: items.slice(maxVisible) };
  }, [items, maxVisible, wrap]);

  const renderDefaultChip = (item: ChipItem, index: number) => {
    const isClickable = Boolean(onChipClick) && !disabled;
    const content = typeof item === 'string' ? item : item;
    return (
      <Badge
        key={index}
        type={variant === 'outline' ? 'secondary' : variant}
        theme={variant === 'outline' ? 'outline' : undefined}
        className={cn(sizeClassNames[size], isClickable ? 'cursor-pointer' : 'cursor-default')}
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          if (!isClickable) return;
          onChipClick?.(item, index);
        }}>
        {content}
      </Badge>
    );
  };

  const chips = visibleItems.map((item, index) => (
    <React.Fragment key={index}>
      {renderChip ? renderChip(item, index) : renderDefaultChip(item, index)}
    </React.Fragment>
  ));

  const hiddenCount = hiddenItems.length;

  const overflowChip = hiddenCount > 0 && (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn('inline-flex items-center', disabled && 'pointer-events-none opacity-50')}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Show more chips"
          disabled={disabled}
          onMouseDown={(event) => {
            event.stopPropagation();
            event.preventDefault();
          }}
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
            // Toggle via click as a fallback interaction
            setOpen((prev) => !prev);
          }}
          onFocus={(event) => {
            // Prevent table row focus handlers
            event.stopPropagation();
            event.preventDefault();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.stopPropagation();
              event.preventDefault();
              setOpen((prev) => !prev);
            }
          }}>
          <Badge
            type={variant === 'outline' ? 'secondary' : variant}
            theme={variant === 'outline' ? 'outline' : undefined}
            className={sizeClassNames[size]}>
            {overflowLabel(hiddenCount)}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-h-56 w-64 overflow-y-auto p-2" align="start">
        <div className="flex flex-wrap gap-2">
          {hiddenItems.map((item, index) => (
            <React.Fragment key={index}>
              {renderChip
                ? renderChip(item, index + visibleItems.length)
                : renderDefaultChip(item, index + visibleItems.length)}
            </React.Fragment>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1',
        wrap ? 'flex-wrap' : 'flex-nowrap',
        className
      )}>
      {chips}
      {overflowChip}
    </div>
  );
}

export default Chip;
