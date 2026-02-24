import { useTaskQueue } from '../hooks/use-task-queue';
import type { TaskSummaryItem } from '../types';
import { cn } from '@/modules/shadcn/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/modules/shadcn/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/modules/shadcn/ui/table';
import { Button } from '@datum-ui/button';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { CircleCheck, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ReactNode, useMemo } from 'react';

type BaseProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  actions?: ReactNode;
};

type ItemsMode = BaseProps & {
  items: TaskSummaryItem[];
  taskId?: never;
  getItemLabel?: never;
};

type TaskIdMode = BaseProps & {
  taskId: string;
  getItemLabel: (id: string) => string;
  items?: never;
};

export type TaskSummaryDialogProps = ItemsMode | TaskIdMode;

// =============================================================================
// Status Config
// =============================================================================

const getStatusConfig = (
  status: TaskSummaryItem['status']
): {
  icon: LucideIcon;
  label: string;
  className: string;
} => {
  switch (status) {
    case 'success':
      return { icon: CircleCheck, label: 'Success', className: 'text-green-600' };
    case 'failed':
      return { icon: XCircle, label: 'Failed', className: 'text-destructive' };
  }
};

// =============================================================================
// Hook: Build items from task ID
// =============================================================================

function useTaskSummaryItems(
  taskId: string | undefined,
  getItemLabel: ((id: string) => string) | undefined
): TaskSummaryItem[] {
  const { tasks } = useTaskQueue();

  return useMemo(() => {
    if (!taskId || !getItemLabel) return [];

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return [];

    const succeeded: TaskSummaryItem[] = task.succeededItems.map((id) => ({
      id,
      label: getItemLabel(id),
      status: 'success',
    }));

    const failed: TaskSummaryItem[] = task.failedItems.map((item) => ({
      id: item.id ?? '',
      label: getItemLabel(item.id ?? ''),
      status: 'failed',
      message: item.message,
    }));

    return [...failed, ...succeeded];
  }, [taskId, getItemLabel, tasks]);
}

// =============================================================================
// Component
// =============================================================================

const columnHelper = createColumnHelper<TaskSummaryItem>();

export function TaskSummaryDialog(props: TaskSummaryDialogProps) {
  const { open, onOpenChange, title, description, actions } = props;

  const taskIdItems = useTaskSummaryItems(
    'taskId' in props ? props.taskId : undefined,
    'getItemLabel' in props ? props.getItemLabel : undefined
  );

  const resolvedItems = useMemo(() => {
    const items = props.items ?? taskIdItems;
    return [...items].sort((a, b) => {
      if (a.status === 'failed' && b.status !== 'failed') return -1;
      if (a.status !== 'failed' && b.status === 'failed') return 1;
      return 0;
    });
  }, [props.items, taskIdItems]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('label', {
        header: 'Item',
        cell: ({ row }) => <span className="font-medium">{row.original.label}</span>,
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        id: 'status',
        cell: ({ row }) => {
          const { status, message } = row.original;
          const config = getStatusConfig(status);
          const IconComponent = config.icon;
          return (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <IconComponent className={cn('size-4', config.className)} />
                <span className={cn('text-xs font-medium', config.className)}>{config.label}</span>
              </div>
              {message && status !== 'success' && (
                <span className="text-muted-foreground pl-5.5 text-xs text-wrap">{message}</span>
              )}
            </div>
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data: resolvedItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const successCount = resolvedItems.filter((i) => i.status === 'success').length;
  const failedCount = resolvedItems.filter((i) => i.status === 'failed').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full gap-0 p-0 sm:max-w-[774px]">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ?? `${successCount} succeeded, ${failedCount} failed`}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[400px] overflow-y-auto px-5">
          {resolvedItems.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">No items</p>
          ) : (
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={
                          cell.column.id === 'status'
                            ? 'max-w-80 text-wrap break-all whitespace-normal'
                            : undefined
                        }>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <DialogFooter className="border-t px-5 py-4">
          {actions}
          <Button type="primary" theme="solid" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
