import { Button } from '@datum-cloud/datum-ui/button';
import { useDataTablePagination } from '@datum-cloud/datum-ui/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useLingui } from '@lingui/react/macro';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Includes 100 to match the Figma org-list footer control. */
const LIST_PAGE_SIZES = [10, 20, 50, 100] as const;

type Props = {
  className?: string;
  pageSizes?: readonly number[];
  /** e.g. "organizations" → `1-100 of 326 organizations` (Figma org-list footer). */
  resourceLabel?: string;
};

/**
 * List footer matching Figma org-table pagination:
 * `[pageSize ▾] Rows per page` … `1-100 of N [resource]` + joined prev/next.
 *
 * @see https://www.figma.com/design/bBEQ8YeTP4SngNl5EkkQdH/Datum---Master-Design-File?node-id=14438-59986
 */
export function ListPagination({ className, pageSizes = LIST_PAGE_SIZES, resourceLabel }: Props) {
  const { t } = useLingui();
  const {
    canNextPage,
    canPrevPage,
    nextPage,
    prevPage,
    pageIndex,
    pageSize,
    setPageSize,
    totalRows,
  } = useDataTablePagination();

  const startRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const endRow = Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <div
      className={cn('flex h-7 w-full items-center justify-between gap-3', className)}
      data-slot="dt-pagination">
      <div className="flex items-center gap-3">
        <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
          <SelectTrigger
            className={cn(
              'border-border text-muted-foreground h-7 w-[4.5rem] gap-1.5 rounded-md px-2.5 py-0',
              'text-xs font-normal shadow-none'
            )}>
            <SelectValue placeholder={String(pageSize)} />
          </SelectTrigger>
          <SelectContent side="top">
            {pageSizes.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground text-xs leading-4 whitespace-nowrap">
          {t`Rows per page`}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-muted-foreground text-xs leading-4 whitespace-nowrap tabular-nums">
          {startRow}-{endRow} {t`of`} {totalRows}
          {resourceLabel ? ` ${resourceLabel}` : null}
        </span>
        <div className="border-border flex items-center overflow-hidden rounded-md border">
          <Button
            theme="outline"
            size="icon"
            className="border-border size-7 rounded-none border-0 border-r shadow-none"
            onClick={prevPage}
            disabled={!canPrevPage}
            aria-label={t`Previous page`}>
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            theme="outline"
            size="icon"
            className="size-7 rounded-none border-0 shadow-none"
            onClick={nextPage}
            disabled={!canNextPage}
            aria-label={t`Next page`}>
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
