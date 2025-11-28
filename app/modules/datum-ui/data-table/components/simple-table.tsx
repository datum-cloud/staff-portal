import { getCommonPinningStyles } from '../lib/data-table';
import { cn } from '@/modules/shadcn/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/modules/shadcn/ui/table';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import type * as React from 'react';
import { useState } from 'react';

interface SimpleTableProps<TData> extends React.ComponentProps<'div'> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  enableSorting?: boolean;
  getRowId?: (row: TData, index: number) => string;
  emptyMessage?: React.ReactNode;
}

export function SimpleTable<TData>({
  columns,
  data,
  enableSorting = false,
  getRowId,
  emptyMessage = 'No results.',
  className,
  ...props
}: SimpleTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable<TData>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    enableSorting,
    onSortingChange: enableSorting ? setSorting : undefined,
    state: {
      sorting: enableSorting ? sorting : undefined,
    },
    getRowId,
  });

  return (
    <div className={cn('overflow-hidden rounded-md border', className)} {...props}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-muted hover:bg-muted">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
                  className={cn(
                    header.column.id === 'actions' && 'bg-background sticky right-0 z-10',
                    enableSorting && header.column.getCanSort() && 'cursor-pointer select-none'
                  )}
                  style={{
                    ...getCommonPinningStyles({ column: header.column }),
                  }}
                  onClick={
                    enableSorting && header.column.getCanSort()
                      ? header.column.getToggleSortingHandler()
                      : undefined
                  }>
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
                    className={cn(
                      cell.column.id === 'actions' && 'bg-background sticky right-0 z-10'
                    )}
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
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
