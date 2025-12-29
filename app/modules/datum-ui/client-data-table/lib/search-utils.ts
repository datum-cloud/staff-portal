import type { FilterFn, Row } from '@tanstack/react-table';

/**
 * Creates a search function that searches across multiple fields in an object.
 * This is a simplified version that does case-insensitive substring matching.
 *
 * @param fields - Array of field accessor functions that extract searchable values from a row
 * @returns A FilterFn that can be used as globalFilterFn in TanStack Table
 *
 * @example
 * ```tsx
 * const searchFn = createMultiFieldSearch([
 *   (row) => row.spec?.email?.toLowerCase() || '',
 *   (row) => row.spec?.givenName?.toLowerCase() || '',
 *   (row) => row.spec?.familyName?.toLowerCase() || '',
 *   (row) => row.metadata?.name?.toLowerCase() || '',
 * ]);
 *
 * <ClientDataTableProvider globalFilterFn={searchFn} ... />
 * ```
 */
export function createMultiFieldSearch<TData>(
  fields: Array<(row: TData) => string>
): FilterFn<TData> {
  return (row: Row<TData>, _columnId, filterValue) => {
    const search = String(filterValue).toLowerCase().trim();
    if (!search) return true; // Show all rows if search is empty

    // Check if search term matches any of the fields
    return fields.some((field) => {
      const value = field(row.original);
      return value.includes(search);
    });
  };
}

/**
 * Creates a search function that searches across multiple object paths.
 * This is a convenience wrapper that automatically extracts values from nested paths.
 *
 * @param paths - Array of dot-notation paths to search (e.g., 'spec.email', 'metadata.name')
 * @param getValue - Function to safely get a value from a path (defaults to simple path traversal)
 * @returns A FilterFn that can be used as globalFilterFn in TanStack Table
 *
 * @example
 * ```tsx
 * const searchFn = createPathBasedSearch([
 *   'spec.email',
 *   'spec.givenName',
 *   'spec.familyName',
 *   'metadata.name',
 * ]);
 *
 * <ClientDataTableProvider globalFilterFn={searchFn} ... />
 * ```
 */
export function createPathBasedSearch<TData>(
  paths: string[],
  getValue?: (obj: TData, path: string) => string
): FilterFn<TData> {
  const defaultGetValue = (obj: any, path: string): string => {
    const parts = path.split('.');
    let value: any = obj;
    for (const part of parts) {
      value = value?.[part];
      if (value == null) return '';
    }
    return String(value || '').toLowerCase();
  };

  const getValueFn = getValue || defaultGetValue;

  return (row: Row<TData>, _columnId, filterValue) => {
    const search = String(filterValue).toLowerCase().trim();
    if (!search) return true;

    return paths.some((path) => {
      const value = getValueFn(row.original, path);
      return value.includes(search);
    });
  };
}

/**
 * Creates a search function that also searches in combined/computed fields.
 * Useful when you want to search in concatenated values (e.g., full name).
 *
 * @param fields - Array of field accessor functions
 * @param computedFields - Array of computed field functions (e.g., full name from first + last)
 * @returns A FilterFn that can be used as globalFilterFn in TanStack Table
 *
 * @example
 * ```tsx
 * const searchFn = createAdvancedSearch(
 *   [
 *     (row) => row.spec?.email?.toLowerCase() || '',
 *     (row) => row.metadata?.name?.toLowerCase() || '',
 *   ],
 *   [
 *     (row) => `${row.spec?.givenName || ''} ${row.spec?.familyName || ''}`.trim().toLowerCase(),
 *   ]
 * );
 * ```
 */
export function createAdvancedSearch<TData>(
  fields: Array<(row: TData) => string>,
  computedFields?: Array<(row: TData) => string>
): FilterFn<TData> {
  const allFields = computedFields ? [...fields, ...computedFields] : fields;

  return (row: Row<TData>, _columnId, filterValue) => {
    const search = String(filterValue).toLowerCase().trim();
    if (!search) return true;

    return allFields.some((field) => {
      const value = field(row.original);
      return value.includes(search);
    });
  };
}
