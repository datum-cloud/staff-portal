import { Checkbox } from '@/modules/shadcn/ui/checkbox';
import type { ColumnDef } from '@tanstack/react-table';

/**
 * Creates a select column for data tables
 *
 * This component adds checkboxes to the table for row selection.
 * It includes both individual row selection and select all functionality.
 *
 * @returns ColumnDef for the select column
 */
export function createSelectColumn<TData>(): ColumnDef<TData, unknown> {
  return {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 20,
  };
}
