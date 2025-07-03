import { getCommonPinningStyles } from '../lib/data-table';
import { useDataTableInstance } from '../providers/data-table.provider';
import { cn } from '@/modules/shadcn/lib/utils';
import { Skeleton } from '@/modules/shadcn/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/modules/shadcn/ui/table';
import type * as React from 'react';

interface DataTableLoadingProps<TData> extends React.ComponentProps<'div'> {
  rows?: number;
  actionBar?: React.ReactNode;
}

export function DataTableLoading<TData>({
  rows = 5,
  actionBar,
  children,
  className,
  ...props
}: DataTableLoadingProps<TData>) {
  const { table } = useDataTableInstance<TData>();

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
                    {header.isPlaceholder ? null : <Skeleton className="h-4 w-20" />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, index) => (
              <TableRow key={`loading-row-${index}`}>
                {table.getAllColumns().map((column) => (
                  <TableCell
                    key={`loading-cell-${column.id}-${index}`}
                    style={{
                      ...getCommonPinningStyles({ column }),
                    }}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="flex w-full flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8">
          <div className="text-muted-foreground flex-1 text-sm whitespace-nowrap">
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-[4.5rem]" />
            </div>
            <div className="flex items-center justify-center text-sm font-medium">
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="size-8" />
              <Skeleton className="size-8" />
            </div>
          </div>
        </div>
        {actionBar && <Skeleton className="h-10 w-full" />}
      </div>
    </div>
  );
}
