import { dataTableFixtures, TestUser } from '@/tests/fixtures/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { vi } from 'vitest';

// Common column structure for tests
export const createMockColumn = (id: string, size = 100) => ({
  id,
  getIsPinned: () => false,
  getIsLastLeftPinnedColumn: () => false,
  getIsFirstRightPinnedColumn: () => false,
  getSize: () => size,
});

// Common header structure for tests
export const createMockHeader = (id: string, header: string, size = 100) => ({
  id,
  key: id, // Add unique key for React
  getContext: () => ({}),
  column: {
    ...createMockColumn(id, size),
    columnDef: { header },
  },
});

// Common cell structure for tests
export const createMockCell = (id: string, value: string, size = 100) => ({
  id,
  key: id, // Add unique key for React
  getValue: () => value,
  getContext: () => ({}),
  column: {
    ...createMockColumn(id, size),
    columnDef: { cell: value },
  },
});

// Common row structure for tests
export const createMockRow = (id: string, user: TestUser, cells: any[]) => ({
  id,
  key: id, // Add unique key for React
  original: user,
  getIsSelected: () => false,
  toggleSelected: vi.fn(),
  getVisibleCells: () => cells,
});

// Standard table columns for tests
export const standardColumns = [
  createMockColumn('name', 150),
  createMockColumn('email', 200),
  createMockColumn('role', 100),
  createMockColumn('status', 100),
];

// Standard headers for tests
export const standardHeaders = [
  createMockHeader('name', 'Name', 150),
  createMockHeader('email', 'Email', 200),
  createMockHeader('role', 'Role', 100),
  createMockHeader('status', 'Status', 100),
];

// Standard cells for tests
export const createStandardCells = (user: TestUser) => [
  createMockCell('name', user.name, 150),
  createMockCell('email', user.email, 200),
  createMockCell('role', user.role, 100),
  createMockCell('status', user.status, 100),
];

// Create a comprehensive mock table with minimal configuration
export const createMockTable = (overrides = {}) => {
  const users = dataTableFixtures.withUsers.data.items;

  return {
    getHeaderGroups: () => [
      {
        id: 'header-group-1',
        headers: standardHeaders,
      },
    ],
    getAllColumns: () => standardColumns,
    getRowModel: () => ({
      rows: users.map((user, index) =>
        createMockRow(`${index + 1}`, user, createStandardCells(user))
      ),
    }),
    getState: () => ({
      rowSelection: {},
      sorting: [],
      columnFilters: [],
      globalFilter: '',
      pagination: { pageSize: 10, pageIndex: 0 },
    }),
    setSorting: vi.fn(),
    setColumnFilters: vi.fn(),
    setGlobalFilter: vi.fn(),
    toggleAllPageRowsSelected: vi.fn(),
    getIsAllPageRowsSelected: () => false,
    getIsSomePageRowsSelected: () => false,
    getCanNextPage: () => true,
    getCanPreviousPage: () => false,
    getPageCount: () => 3,
    getFilteredSelectedRowModel: () => ({ rows: [] }),
    setPageSize: vi.fn(),
    previousPage: vi.fn(),
    nextPage: vi.fn(),
    ...overrides,
  };
};

// Create mock table with actions column
export const createMockTableWithActions = (overrides = {}) => {
  const baseTable = createMockTable();

  return {
    ...baseTable,
    getHeaderGroups: () => [
      {
        id: 'header-group-1',
        headers: [...standardHeaders, createMockHeader('actions', 'Actions', 100)],
      },
    ],
    getAllColumns: () => [...standardColumns, createMockColumn('actions', 100)],
    ...overrides,
  };
};

// Create mock table with empty data
export const createMockTableEmpty = (overrides = {}) => {
  const baseTable = createMockTable();

  return {
    ...baseTable,
    getRowModel: () => ({ rows: [] }),
    ...overrides,
  };
};

// Standard mock query for tests
export const createMockQuery = (overrides = {}) => ({
  data: dataTableFixtures.withUsers,
  isLoading: false as const,
  error: null,
  refetch: vi.fn(),
  isError: false as const,
  isPending: false as const,
  isLoadingError: false as const,
  isRefetchError: false as const,
  isStale: false as const,
  isFetching: false as const,
  isRefetching: false as const,
  isSuccess: true as const,
  isPlaceholderData: false as const,
  dataUpdatedAt: Date.now(),
  errorUpdatedAt: 0,
  failureCount: 0,
  failureReason: null,
  errorUpdateCount: 0,
  isFetched: true,
  isFetchedAfterMount: true,
  isInitialLoading: false,
  isPaused: false,
  status: 'success' as const,
  fetchStatus: 'idle' as const,
  promise: Promise.resolve(dataTableFixtures.withUsers),
  ...overrides,
});

// Mock query for loading state
export const createMockQueryLoading = () =>
  createMockQuery({
    isLoading: true,
    data: null,
  });

// Mock query for error state
export const createMockQueryError = () =>
  createMockQuery({
    error: dataTableFixtures.networkError,
    data: null,
    isError: true,
  });

// Mock query for empty data
export const createMockQueryEmpty = () =>
  createMockQuery({
    data: dataTableFixtures.empty,
  });
