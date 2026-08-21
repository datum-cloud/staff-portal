import { type ColumnDef, type RowData } from '@/utils/table';
import { dataTableFeatures } from '@datum-cloud/datum-ui/data-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@datum-cloud/datum-ui/table';
import { cn } from '@datum-cloud/datum-ui/utils';
import { flexRender, type SortingState, useTable } from '@tanstack/react-table';
import type * as React from 'react';
import { useState } from 'react';

export interface SimpleTableProps<TData extends RowData> extends React.ComponentProps<'div'> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  enableSorting?: boolean;
  getRowId?: (row: TData, index: number) => string;
  emptyMessage?: React.ReactNode;
}

/**
 * Static TanStack table (no DataTable store). Used for small in-card lists
 * where full DataTable.Client is unnecessary (e.g. DNS nameservers).
 */
export function SimpleTable<TData extends RowData>({
  columns,
  data,
  enableSorting = false,
  getRowId,
  emptyMessage = 'No results.',
  className,
  ...props
}: SimpleTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  // react-table v9: row models are baked into the feature set (createSortedRowModel,
  // etc.), so we pass datum-ui's shared `dataTableFeatures` instead of the old
  // getCoreRowModel/getSortedRowModel options.
  // TanStack Table's API isn't compiler-friendly; the new
  // react-hooks/incompatible-library rule flags it but the usage is correct.

  const table = useTable({
    features: dataTableFeatures,
    data,
    columns,
    enableSorting,
    onSortingChange: enableSorting ? setSorting : undefined,
    state: {
      sorting: enableSorting ? sorting : undefined,
    },
    getRowId,
  });

  return (
    <div className={cn('overflow-x-auto rounded-md border', className)} {...props}>
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
                    )}>
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
