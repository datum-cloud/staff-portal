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
import { MoreVertical } from 'lucide-react';

export interface ActionItem<TData> {
  label: string;
  onClick: (row: TData) => void;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

export interface SelectActionsColumnConfig<TData> {
  label?: string;
  actions?: ActionItem<TData>[];
  showLabel?: boolean;
  selectable?: boolean;
}

/**
 * Enhances the first data column with select/actions functionality
 *
 * This approach combines the select/actions with the first column content,
 * eliminating the need for a separate narrow column and keeping the
 * select/actions close to the main content.
 *
 * @param firstColumn The first data column to enhance
 * @param config Configuration for select/actions
 * @returns Enhanced column definition
 */
export function enhanceFirstColumnWithSelectActions<TData>(
  firstColumn: ColumnDef<TData, unknown>,
  config: SelectActionsColumnConfig<TData>
): ColumnDef<TData, unknown> {
  const hasActions = config.actions && config.actions.length > 0;
  const isSelectable = config.selectable;

  // If no actions and not selectable, return the original column unchanged
  if (!hasActions && !isSelectable) {
    return firstColumn;
  }

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

      if (isSelectable) {
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
            {hasActions && <div className="w-6" />}
            <div>{originalHeaderContent}</div>
          </div>
        );
      }
      return originalHeaderContent;
    },
    cell: ({ row, ...context }: any) => {
      const data = row.original;
      const originalCellContent = originalCell
        ? typeof originalCell === 'function'
          ? originalCell({ row, ...context })
          : originalCell
        : null;

      return (
        <div className="flex items-center justify-start gap-2">
          {isSelectable && (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
            />
          )}

          {hasActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-6 w-6 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="right">
                {config.label && <DropdownMenuLabel>{config.label}</DropdownMenuLabel>}
                {config.label && config.actions!.length > 0 && <DropdownMenuSeparator />}
                {config.actions!.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <DropdownMenuItem
                      key={index}
                      onClick={() => action.onClick(data)}
                      disabled={action.disabled}
                      variant={action.variant}>
                      {Icon && <Icon className="h-4 w-4" />}
                      {action.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div>{originalCellContent}</div>
        </div>
      );
    },
  } as ColumnDef<TData, unknown>;
}
