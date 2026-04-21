import { useBreakpoint } from '@/hooks/use-breakpoint';
import { Button } from '@datum-cloud/datum-ui/button';
import { useDataTableFilters } from '@datum-cloud/datum-ui/data-table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@datum-cloud/datum-ui/sheet';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useLingui } from '@lingui/react/macro';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { SlidersHorizontal } from 'lucide-react';
import { ReactNode, useState } from 'react';

interface DataTableToolbarProps {
  /** Search component (usually <DataTable.Search />) */
  search: ReactNode;
  /** Filter components (usually one or more <DataTable.SelectFilter /> / <DataTable.DateFilter /> etc.) */
  filters?: ReactNode;
  /** Optional extra slot rendered at the end of the row (desktop) / alongside filter icon (mobile) */
  extras?: ReactNode;
  className?: string;
}

/**
 * Responsive wrapper for a DataTable's search + filter row.
 *
 * Desktop: search and filters render inline on a single row (same as before).
 *
 * Mobile: search takes the full width, and filters collapse into an icon button
 * that opens a Sheet containing all the filter controls. A dot on the icon
 * indicates there are active filters.
 *
 * Must be rendered inside a <DataTable.Client /> (or similar) because the
 * underlying Search / SelectFilter components read from the table store via
 * context.
 */
export function DataTableToolbar({ search, filters, extras, className }: DataTableToolbarProps) {
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
  const [sheetOpen, setSheetOpen] = useState(false);
  const { filters: activeFilters } = useDataTableFilters();
  const { t } = useLingui();

  const activeCount = Object.values(activeFilters ?? {}).filter((v) => {
    if (v === undefined || v === null || v === '') return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  }).length;

  if (!isMobile) {
    return (
      <div className={cn('flex items-center gap-4', className)}>
        {search}
        {filters}
        {extras}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="min-w-0 flex-1">{search}</div>

      {filters && (
        <>
          <Button
            htmlType="button"
            type="secondary"
            theme="outline"
            size="icon"
            aria-label={t`Filters`}
            className="relative"
            onClick={() => setSheetOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" />
            {activeCount > 0 && (
              <span
                aria-hidden="true"
                className="bg-primary absolute top-1 right-1 h-2 w-2 rounded-full ring-2 ring-white"
              />
            )}
          </Button>

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen} modal={false}>
            <SheetContent side="bottom" className="flex max-h-[85svh] flex-col gap-0 p-0">
              <VisuallyHidden>
                <SheetDescription>{t`Filter options`}</SheetDescription>
              </VisuallyHidden>
              <SheetHeader className="border-b px-4 py-3">
                <SheetTitle>{t`Filters`}</SheetTitle>
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 [&>*]:w-full">
                {filters}
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}

      {extras}
    </div>
  );
}
