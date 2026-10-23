import type { DataTableFeatures } from '@datum-cloud/datum-ui/data-table';
import {
  createColumnHelper as createTanstackColumnHelper,
  type CellData,
  type ColumnDef as TanstackColumnDef,
  type RowData,
  type TableFeatures,
} from '@tanstack/react-table';

declare module '@tanstack/table-core' {
  // Generics must mirror table-core's declaration for the merge to apply.
  interface ColumnMeta<
    in out TFeatures extends TableFeatures,
    in out TData extends RowData,
    TValue extends CellData = CellData,
  > {
    /** Extra classes for this column's body cells in `ListTable`, e.g. a fixed width. */
    cellClassName?: string;
  }
}

/**
 * react-table v9 threads a `TableFeatures` generic through every public type, and
 * datum-ui's DataTable builds tables with a fixed feature set exported as
 * `DataTableFeatures`. These wrappers pre-bind that feature set so app column
 * definitions keep the familiar `createColumnHelper<T>()` / `ColumnDef<T>` shape
 * instead of repeating `<DataTableFeatures, T>` at every call site.
 *
 * Import `createColumnHelper` / `ColumnDef` from here, not `@tanstack/react-table`.
 */
export function createColumnHelper<TData extends RowData>() {
  return createTanstackColumnHelper<DataTableFeatures, TData>();
}

export type ColumnDef<TData extends RowData, TValue = unknown> = TanstackColumnDef<
  DataTableFeatures,
  TData,
  TValue
>;

export type { RowData };
