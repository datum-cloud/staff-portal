import { getCommonPinningStyles } from '../lib/data-table';
import { useDataTableInstance } from '../providers/data-table.provider';
import { DataTableLoading } from './data-table-loading';
import { DataTablePagination } from './data-table-pagination';
import { cn } from '@/modules/shadcn/lib/utils';
import { Button } from '@/modules/shadcn/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/modules/shadcn/ui/table';
import { flexRender } from '@tanstack/react-table';
import { AlertCircle, RefreshCw } from 'lucide-react';
import type * as React from 'react';

interface DataTableProps<TData> extends React.ComponentProps<'div'> {
  actionBar?: React.ReactNode;
}

export function DataTable<TData>({
  actionBar,
  children,
  className,
  ...props
}: DataTableProps<TData>) {
  const { table, query } = useDataTableInstance<TData>();

  // Show loading state when query is loading
  if (query.isLoading) {
    return (
      <DataTableLoading<TData> rows={5} actionBar={actionBar} className={className} {...props}>
        {children}
      </DataTableLoading>
    );
  }

  // Show error state when query has error
  if (query.isError) {
    return (
      <div className={cn('flex w-full flex-col gap-2.5 overflow-auto', className)} {...props}>
        {children}
        <div className="border-destructive/50 bg-destructive/5 flex flex-col items-center justify-center gap-4 rounded-md border p-8">
          <AlertCircle className="text-destructive h-8 w-8" />
          <div className="text-center">
            <h3 className="text-destructive text-lg font-semibold">Failed to load data</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {query.error instanceof Error
                ? query.error.message
                : 'An unexpected error occurred while loading the data.'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            disabled={query.isRefetching}
            className="mt-2">
            <RefreshCw className={cn('mr-2 h-4 w-4', query.isRefetching && 'animate-spin')} />
            {query.isRefetching ? 'Retrying...' : 'Try Again'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex w-full flex-col gap-2.5 overflow-auto', className)} {...props}>
      {children}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{
                      ...getCommonPinningStyles({ column: header.column }),
                    }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{
                        ...getCommonPinningStyles({ column: cell.column }),
                      }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-2.5">
        <DataTablePagination<TData> />
        {actionBar && table.getFilteredSelectedRowModel().rows.length > 0 && actionBar}
      </div>
    </div>
  );
}
