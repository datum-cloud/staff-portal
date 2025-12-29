import { useClientDataTableInstance } from '../providers/client-data-table.provider';
import { cn } from '@/modules/shadcn/lib/utils';
import { Button } from '@/modules/shadcn/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/modules/shadcn/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';

interface ClientDataTablePaginationProps<TData> extends React.ComponentProps<'div'> {
  pageSizeOptions?: number[];
}

export function ClientDataTablePagination<TData>({
  pageSizeOptions = [10, 20, 30, 40, 50],
  className,
  ...props
}: ClientDataTablePaginationProps<TData>) {
  const { table } = useClientDataTableInstance<TData>();

  // For client-side, use table's built-in pagination methods
  const canNextPage = table.getCanNextPage();
  const canPreviousPage = table.getCanPreviousPage();
  const currentPage = table.getState().pagination.pageIndex;
  const totalPages = table.getPageCount();

  // Generate page numbers to display
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxVisible = 7; // Show up to 7 page numbers
    const current = currentPage + 1; // Convert to 1-based

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (current <= 4) {
        // Near the start: 1, 2, 3, 4, 5, ..., last
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (current >= totalPages - 3) {
        // Near the end: 1, ..., n-4, n-3, n-2, n-1, n
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle: 1, ..., current-1, current, current+1, ..., last
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  }, [currentPage, totalPages]);

  const totalRows = table.getFilteredRowModel().rows.length;
  const selectedRows = table.getFilteredSelectedRowModel().rows.length;
  const pageSize = table.getState().pagination.pageSize;
  const startRow = currentPage * pageSize + 1;
  const endRow = Math.min((currentPage + 1) * pageSize, totalRows);

  return (
    <div
      className={cn(
        'flex w-full flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8',
        className
      )}
      {...props}>
      <div className="text-muted-foreground flex-1 text-sm whitespace-nowrap">
        {selectedRows > 0 ? (
          <>
            {selectedRows} of {totalRows} row(s) selected.
          </>
        ) : (
          <>
            Showing {startRow} to {endRow} of {totalRows} row(s)
          </>
        )}
      </div>
      <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium whitespace-nowrap">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}>
            <SelectTrigger className="h-8 w-[4.5rem] [&[data-size]]:h-8">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            aria-label="Go to previous page"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.previousPage()}
            disabled={!canPreviousPage}>
            <ChevronLeft />
          </Button>
          {pageNumbers.map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="text-muted-foreground px-2 text-sm">
                  ...
                </span>
              );
            }
            const pageNum = page as number;
            const isCurrentPage = pageNum === currentPage + 1;
            return (
              <Button
                key={pageNum}
                aria-label={`Go to page ${pageNum}`}
                variant={isCurrentPage ? 'default' : 'outline'}
                size="sm"
                className={cn('h-8 min-w-8 px-2', isCurrentPage && 'font-semibold')}
                onClick={() => table.setPageIndex(pageNum - 1)}
                disabled={isCurrentPage}>
                {pageNum}
              </Button>
            );
          })}
          <Button
            aria-label="Go to next page"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.nextPage()}
            disabled={!canNextPage}>
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
