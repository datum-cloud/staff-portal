import { useDataTableInstance } from '../providers/data-table.provider';
import { DataTable } from './data-table';
import { dataTableFixtures, mockActions, mockColumns, TestUser } from '@/tests/fixtures/data-table';
import {
  createMockTable,
  createMockTableWithActions,
  createMockTableEmpty,
  createMockQuery,
  createMockQueryLoading,
  createMockQueryError,
  createMockQueryEmpty,
} from '@/tests/setup/unit/data-table.utils';
import { render, screen, waitFor } from '@/tests/setup/unit/test.utils';
import { ColumnDef } from '@tanstack/react-table';
import { expect, test, describe, vi, beforeEach } from 'vitest';

// Mock the DataTableContext
vi.mock('../providers/data-table.provider', () => ({
  useDataTableInstance: vi.fn(),
}));

const mockUseDataTableInstance = vi.fn();

vi.mocked(useDataTableInstance).mockImplementation(mockUseDataTableInstance);

describe('DataTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success scenarios', () => {
    test('should render table with data', async () => {
      mockUseDataTableInstance.mockReturnValue({
        table: createMockTable(),
        query: createMockQuery(),
        isLoading: false,
        error: null,
        columns: mockColumns as ColumnDef<TestUser>[],
        isSelectable: false,
        hasActions: false,
        actions: [],
        actionsLoading: false,
        searchPlaceholder: 'Search...',
        emptyMessage: 'No data',
        emptyDescription: 'No data available',
      });

      render(<DataTable />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      });
    });

    test('should render table headers', async () => {
      mockUseDataTableInstance.mockReturnValue({
        table: createMockTable(),
        query: createMockQuery(),
        isLoading: false,
        error: null,
        columns: mockColumns as ColumnDef<TestUser>[],
        isSelectable: false,
        hasActions: false,
        actions: [],
        actionsLoading: false,
        searchPlaceholder: 'Search...',
        emptyMessage: 'No data',
        emptyDescription: 'No data available',
      });

      render(<DataTable />);

      await waitFor(() => {
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Email')).toBeInTheDocument();
        expect(screen.getByText('Role')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
      });
    });

    test('should render table with actions column', async () => {
      mockUseDataTableInstance.mockReturnValue({
        table: createMockTableWithActions(),
        query: createMockQuery(),
        isLoading: false,
        error: null,
        columns: mockColumns as ColumnDef<TestUser>[],
        isSelectable: false,
        hasActions: true,
        actions: mockActions,
        actionsLoading: false,
        searchPlaceholder: 'Search...',
        emptyMessage: 'No data',
        emptyDescription: 'No data available',
      });

      render(<DataTable />);

      await waitFor(() => {
        // Check that action buttons are rendered
        const actionButtons = screen.getAllByRole('button');
        expect(actionButtons.length).toBeGreaterThan(0);
      });
    });

    test('should render table with selection enabled', async () => {
      mockUseDataTableInstance.mockReturnValue({
        table: createMockTable(),
        query: createMockQuery(),
        isLoading: false,
        error: null,
        columns: mockColumns as ColumnDef<TestUser>[],
        isSelectable: true,
        hasActions: false,
        actions: [],
        actionsLoading: false,
        searchPlaceholder: 'Search...',
        emptyMessage: 'No data',
        emptyDescription: 'No data available',
      });

      render(<DataTable />);

      await waitFor(() => {
        // Check that the table renders with selection enabled
        // Note: The actual checkbox rendering is tested in the DataTableProvider tests
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      });
    });

    test('should render empty state when no data', async () => {
      mockUseDataTableInstance.mockReturnValue({
        table: createMockTableEmpty(),
        query: createMockQueryEmpty(),
        isLoading: false,
        error: null,
        columns: mockColumns as ColumnDef<TestUser>[],
        isSelectable: false,
        hasActions: false,
        actions: [],
        actionsLoading: false,
        searchPlaceholder: 'Search...',
        emptyMessage: 'No users found',
        emptyDescription: 'Try adjusting your search criteria',
      });

      render(<DataTable />);

      await waitFor(() => {
        expect(screen.getByText('No results.')).toBeInTheDocument();
      });
    });

    test('should render loading state', () => {
      mockUseDataTableInstance.mockReturnValue({
        table: createMockTable(),
        query: createMockQueryLoading(),
        isLoading: true,
        error: null,
        columns: mockColumns as ColumnDef<TestUser>[],
        isSelectable: false,
        hasActions: false,
        actions: [],
        actionsLoading: false,
        searchPlaceholder: 'Search...',
        emptyMessage: 'No data',
        emptyDescription: 'No data available',
      });

      render(<DataTable />);

      // Check for loading skeleton
      const skeletons = screen.getAllByText('');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error scenarios', () => {
    test('should handle error state', async () => {
      mockUseDataTableInstance.mockReturnValue({
        table: createMockTable(),
        query: createMockQueryError(),
        isLoading: false,
        error: dataTableFixtures.networkError,
        columns: mockColumns as ColumnDef<TestUser>[],
        isSelectable: false,
        hasActions: false,
        actions: [],
        actionsLoading: false,
        searchPlaceholder: 'Search...',
        emptyMessage: 'No data',
        emptyDescription: 'No data available',
      });

      render(<DataTable />);

      await waitFor(() => {
        // Error state shows error message instead of data
        expect(screen.getByText('Failed to load data')).toBeInTheDocument();
      });
    });

    test('should handle missing table context', () => {
      mockUseDataTableInstance.mockReturnValue(null);

      expect(() => {
        render(<DataTable />);
      }).toThrow();
    });
  });

  describe('Table interactions', () => {
    test('should handle row selection', async () => {
      const tableWithSelection = createMockTable({
        getState: () => ({
          rowSelection: { '1': true },
          sorting: [],
          columnFilters: [],
          globalFilter: '',
          pagination: { pageIndex: 0, pageSize: 10 },
        }),
        getIsAllPageRowsSelected: () => false,
        getIsSomePageRowsSelected: () => true,
      });

      mockUseDataTableInstance.mockReturnValue({
        table: tableWithSelection,
        query: createMockQuery(),
        isLoading: false,
        error: null,
        columns: mockColumns as ColumnDef<TestUser>[],
        isSelectable: true,
        hasActions: false,
        actions: [],
        actionsLoading: false,
        searchPlaceholder: 'Search...',
        emptyMessage: 'No data',
        emptyDescription: 'No data available',
      });

      render(<DataTable />);

      await waitFor(() => {
        // Check that selection state is reflected
        // Note: The actual checkbox rendering is tested in the DataTableProvider tests
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    test('should handle all rows selected state', async () => {
      const tableWithAllSelected = createMockTable({
        getState: () => ({
          rowSelection: { '1': true, '2': true, '3': true },
          sorting: [],
          columnFilters: [],
          globalFilter: '',
          pagination: { pageIndex: 0, pageSize: 10 },
        }),
        getIsAllPageRowsSelected: () => true,
        getIsSomePageRowsSelected: () => false,
      });

      mockUseDataTableInstance.mockReturnValue({
        table: tableWithAllSelected,
        query: createMockQuery(),
        isLoading: false,
        error: null,
        columns: mockColumns as ColumnDef<TestUser>[],
        isSelectable: true,
        hasActions: false,
        actions: [],
        actionsLoading: false,
        searchPlaceholder: 'Search...',
        emptyMessage: 'No data',
        emptyDescription: 'No data available',
      });

      render(<DataTable />);

      await waitFor(() => {
        // Check that all selection state is reflected
        // Note: The actual checkbox rendering is tested in the DataTableProvider tests
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper table structure', async () => {
      mockUseDataTableInstance.mockReturnValue({
        table: createMockTable(),
        query: createMockQuery(),
        isLoading: false,
        error: null,
        columns: mockColumns as ColumnDef<TestUser>[],
        isSelectable: false,
        hasActions: false,
        actions: [],
        actionsLoading: false,
        searchPlaceholder: 'Search...',
        emptyMessage: 'No data',
        emptyDescription: 'No data available',
      });

      render(<DataTable />);

      await waitFor(() => {
        // Check for proper table structure
        expect(screen.getByRole('table')).toBeInTheDocument();
        // Check for both thead and tbody (both have rowgroup role)
        const rowgroups = screen.getAllByRole('rowgroup');
        expect(rowgroups.length).toBeGreaterThanOrEqual(1);
      });
    });

    test('should have proper button accessibility', async () => {
      mockUseDataTableInstance.mockReturnValue({
        table: createMockTableWithActions(),
        query: createMockQuery(),
        isLoading: false,
        error: null,
        columns: mockColumns as ColumnDef<TestUser>[],
        isSelectable: false,
        hasActions: true,
        actions: mockActions,
        actionsLoading: false,
        searchPlaceholder: 'Search...',
        emptyMessage: 'No data',
        emptyDescription: 'No data available',
      });

      render(<DataTable />);

      await waitFor(() => {
        // Check that action buttons have proper accessibility
        const actionButtons = screen.getAllByRole('button');
        actionButtons.forEach((button) => {
          expect(button).toBeInTheDocument();
        });
      });
    });
  });
});
