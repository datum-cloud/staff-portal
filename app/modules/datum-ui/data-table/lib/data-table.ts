import { dataTableConfig } from './data-table.config';
import { ExtendedColumnFilter, FilterOperator, FilterVariant } from './data-table.type';
import type { Column } from '@tanstack/react-table';

export function getCommonPinningStyles<TData>({
  column,
  withBorder = false,
}: {
  column: Column<TData>;
  withBorder?: boolean;
}): React.CSSProperties {
  const isPinned = column.getIsPinned();
  const isLastLeftPinnedColumn = isPinned === 'left' && column.getIsLastColumn('left');
  const isFirstRightPinnedColumn = isPinned === 'right' && column.getIsFirstColumn('right');

  return {
    boxShadow: withBorder
      ? isLastLeftPinnedColumn
        ? '-4px 0 4px -4px hsl(var(--border)) inset'
        : isFirstRightPinnedColumn
          ? '4px 0 4px -4px hsl(var(--border)) inset'
          : undefined
      : undefined,
    left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
    right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
    opacity: isPinned ? 0.97 : 1,
    position: isPinned ? 'sticky' : 'relative',
    background: isPinned ? 'hsl(var(--background))' : 'hsl(var(--background))',
    width: column.getSize(),
    zIndex: isPinned ? 1 : 0,
  };
}

export function getFilterOperators(filterVariant: FilterVariant) {
  const operatorMap: Record<FilterVariant, { label: string; value: FilterOperator }[]> = {
    text: dataTableConfig.textOperators,
    number: dataTableConfig.numericOperators,
    range: dataTableConfig.numericOperators,
    date: dataTableConfig.dateOperators,
    dateRange: dataTableConfig.dateOperators,
    boolean: dataTableConfig.booleanOperators,
    select: dataTableConfig.selectOperators,
    multiSelect: dataTableConfig.multiSelectOperators,
  };

  return operatorMap[filterVariant] ?? dataTableConfig.textOperators;
}

export function getDefaultFilterOperator(filterVariant: FilterVariant) {
  const operators = getFilterOperators(filterVariant);

  return operators[0]?.value ?? (filterVariant === 'text' ? 'iLike' : 'eq');
}

export function getValidFilters<TData>(
  filters: ExtendedColumnFilter<TData>[]
): ExtendedColumnFilter<TData>[] {
  return filters.filter(
    (filter) =>
      filter.operator === 'isEmpty' ||
      filter.operator === 'isNotEmpty' ||
      (Array.isArray(filter.value)
        ? filter.value.length > 0
        : filter.value !== '' && filter.value !== null && filter.value !== undefined)
  );
}

/**
 * Checks if an error is a 410 ResourceExpired error (expired cursor token).
 * This is used to automatically handle expired pagination tokens by clearing
 * the cursor and refetching from the beginning.
 */
export function isExpiredCursorError(error: unknown): boolean {
  // Check for AxiosError with 410 status
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { status?: number; data?: any } };
    if (axiosError.response?.status === 410) {
      return true;
    }
    // Also check error message in response data
    if (axiosError.response?.data) {
      const data = axiosError.response.data;
      const errorMessage =
        typeof data === 'string' ? data : (data as any)?.error || (data as any)?.message || '';
      if (errorMessage) {
        const message = String(errorMessage).toLowerCase();
        if (
          message.includes('continue') ||
          message.includes('token') ||
          message.includes('too old') ||
          message.includes('expired') ||
          message.includes('provided continue parameter')
        ) {
          return true;
        }
      }
    }
  }

  // Check for error message containing ResourceExpired or 410
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('410') ||
      message.includes('resourceexpired') ||
      message.includes('continue token') ||
      message.includes('continue parameter') ||
      message.includes('provided continue parameter') ||
      message.includes('too old') ||
      message.includes('inconsistent list')
    );
  }

  // Check for error object with status code
  if (error && typeof error === 'object' && 'status' in error) {
    return (error as { status?: number }).status === 410;
  }

  return false;
}
