import { Tooltip } from '../../tooltip';
import { Button } from '@/modules/shadcn/ui/button';
import { Checkbox } from '@/modules/shadcn/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/modules/shadcn/ui/dropdown-menu';
import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Loader2 } from 'lucide-react';

export interface ActionItem<TData> {
  label: string;
  onClick: (row: TData) => void | Promise<void>;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive';
  disabled?: boolean | ((row: TData) => boolean);
  tooltip?: string | ((row: TData) => string);
  loading?: boolean | ((row: TData) => boolean);
}

export interface SelectActionsColumnConfig<TData> {
  label?: string;
  actions?: ActionItem<TData>[];
  showLabel?: boolean;
  selectable?: boolean;
  loading?: boolean | ((row: TData) => boolean); // NEW: Loading state for trigger button
}

/**
 * Enhances the first data column with selection checkbox functionality
 * This keeps the checkbox embedded within the first column content (no extra space)
 */
export function enhanceFirstColumnWithSelection<TData>(
  firstColumn: ColumnDef<TData, unknown>
): ColumnDef<TData, unknown> {
  // Store the original header and cell renderers
  const originalHeader = firstColumn.header;
  const originalCell = firstColumn.cell;

  return {
    ...firstColumn,
    header: ({ table, ...context }: any) => {
      const originalHeaderContent = originalHeader
        ? typeof originalHeader === 'function'
          ? originalHeader({ table, ...context })
          : originalHeader
        : null;

      return (
        <div className="flex items-center justify-start gap-2">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
          <div>{originalHeaderContent}</div>
        </div>
      );
    },
    cell: ({ row, ...context }: any) => {
      const originalCellContent = originalCell
        ? typeof originalCell === 'function'
          ? originalCell({ row, ...context })
          : originalCell
        : null;

      return (
        <div className="flex items-center justify-start gap-2">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
          <div>{originalCellContent}</div>
        </div>
      );
    },
  } as ColumnDef<TData, unknown>;
}

/**
 * Creates a dedicated selection column for row checkboxes positioned at the left.
 */
export function createSelectionColumn<TData>(): ColumnDef<TData, unknown> {
  return {
    id: 'select',
    header: ({ table }: any) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }: any) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40, // Fixed width for selection column
    minSize: 40,
    maxSize: 40,
  } as ColumnDef<TData, unknown>;
}

/**
 * Creates a dedicated actions column that will be positioned at the right end
 * and fixed on scroll for better UX and visual separation.
 */
export function createActionsColumn<TData>(
  config: SelectActionsColumnConfig<TData>
): ColumnDef<TData, unknown> | null {
  const hasActions = config.actions && config.actions.length > 0;

  if (!hasActions) {
    return null;
  }

  return {
    id: 'actions',
    header: () => null, // No header for actions column
    cell: ({ row }: any) => {
      const data = row.original;
      const isLoading =
        typeof config.loading === 'function' ? config.loading(data) : config.loading;

      return (
        <div className="flex items-center justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoading}>
                <span className="sr-only">Open menu</span>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="left">
              {config.label && <DropdownMenuLabel>{config.label}</DropdownMenuLabel>}
              {config.label && config.actions!.length > 0 && <DropdownMenuSeparator />}
              {config.actions!.map((action, index) => {
                const Icon = action.icon;
                const isDisabled =
                  typeof action.disabled === 'function' ? action.disabled(data) : action.disabled;
                const tooltipText =
                  typeof action.tooltip === 'function' ? action.tooltip(data) : action.tooltip;

                const menuItem = (
                  <DropdownMenuItem
                    key={index}
                    onClick={() => !isDisabled && action.onClick(data)}
                    disabled={isDisabled}
                    variant={action.variant}>
                    {Icon && <Icon className="h-4 w-4" />}
                    {action.label}
                  </DropdownMenuItem>
                );

                if (tooltipText && isDisabled) {
                  return (
                    <Tooltip key={index} message={tooltipText}>
                      <div className="w-full">{menuItem}</div>
                    </Tooltip>
                  );
                }

                return menuItem;
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
    size: 80, // Fixed width for actions column
    minSize: 80,
    maxSize: 80,
  } as ColumnDef<TData, unknown>;
}
