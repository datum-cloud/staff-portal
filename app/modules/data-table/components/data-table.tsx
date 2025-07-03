import { getCommonPinningStyles } from '../lib/data-table';
import { useDataTableInstance } from '../providers/data-table.provider';
import { DataTableLoading } from './data-table-loading';
import { DataTablePagination } from './data-table-pagination';
import { cn } from '@/modules/shadcn/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/modules/shadcn/ui/table';
import { flexRender } from '@tanstack/react-table';
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
