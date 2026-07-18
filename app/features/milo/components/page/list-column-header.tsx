import { cn } from '@datum-cloud/datum-ui/utils';
import type { Column } from '@tanstack/react-table';

type Props<TData, TValue> = {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
};

/**
 * Figma `Datum App UI/Tables/Header/Dropdown` — 5×15, two carets positioned
 * with the same insets as the design (not flex-spaced Lucide chevrons).
 */
function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  return (
    <span className="relative h-[15px] w-[5px] shrink-0" aria-hidden>
      {/* Up caret — Figma inset 26.66% / 6.67% / 58.34% / 7.62% */}
      <svg
        viewBox="0 0 5.28572 3.25"
        fill="none"
        className={cn(
          'absolute inset-[26.66%_6.67%_58.34%_7.62%] overflow-visible',
          sorted === 'asc' ? 'opacity-100' : sorted === 'desc' ? 'opacity-35' : 'opacity-100'
        )}>
        <path
          d="M0.5 2.75L2.64286 0.5L4.78571 2.75"
          stroke="#90969C"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {/* Down caret — Figma inset 61.66% / 6.67% / 23.34% / 7.62% */}
      <svg
        viewBox="0 0 5.28572 3.25"
        fill="none"
        className={cn(
          'absolute inset-[61.66%_6.67%_23.34%_7.62%] overflow-visible',
          sorted === 'desc' ? 'opacity-100' : sorted === 'asc' ? 'opacity-35' : 'opacity-100'
        )}>
        <path
          d="M0.5 0.5L2.64286 2.75L4.78571 0.5"
          stroke="#90969C"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/**
 * Sortable column header: 12px uppercase @ 60% + Header/Dropdown carets.
 * (Figma specs 10px; we use text-xs for readability in the dense staff lists.)
 *
 * @see https://www.figma.com/design/bBEQ8YeTP4SngNl5EkkQdH/Datum---Master-Design-File?node-id=14438-59986
 */
export function ListColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: Props<TData, TValue>) {
  if (!column.getCanSort()) {
    return (
      <div
        className={cn(
          'text-[11px] leading-4 font-normal tracking-normal text-inherit uppercase',
          className
        )}
        data-slot="dt-column-header">
        {title}
      </div>
    );
  }

  const sorted = column.getIsSorted();

  return (
    <div className={cn('flex items-center', className)} data-slot="dt-column-header">
      <button
        type="button"
        className={cn(
          'inline-flex h-9 cursor-pointer items-center gap-2',
          'text-[11px] leading-4 font-normal tracking-normal text-inherit uppercase',
          'hover:text-foreground'
        )}
        onClick={column.getToggleSortingHandler()}
        aria-label={`Sort by ${title}${sorted === 'asc' ? ', sorted ascending' : sorted === 'desc' ? ', sorted descending' : ''}`}>
        <span>{title}</span>
        <SortIcon sorted={sorted} />
      </button>
    </div>
  );
}
