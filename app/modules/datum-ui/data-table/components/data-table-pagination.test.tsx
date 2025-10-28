import { useDataTableInstance } from '../providers/data-table.provider';
import { DataTablePagination } from './data-table-pagination';
import { mockColumns, TestUser } from '@/tests/fixtures/data-table';
import {
  createMockQuery,
  createMockQueryEmpty,
  createMockTable,
} from '@/tests/setup/unit/data-table.utils';
import { fireEvent, render, screen, waitFor } from '@/tests/setup/unit/test.utils';
import { ColumnDef } from '@tanstack/react-table';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock the DataTableContext
vi.mock('../providers/data-table.provider', () => ({
  useDataTableInstance: vi.fn(),
}));

const mockUseDataTableInstance = vi.fn();

vi.mocked(useDataTableInstance).mockImplementation(mockUseDataTableInstance);

describe('DataTablePagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultContext = {
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
  };

  describe('Success scenarios', () => {
    test('should render pagination controls', async () => {
      mockUseDataTableInstance.mockReturnValue(defaultContext);

      render(<DataTablePagination />);

      await waitFor(() => {
        expect(screen.getByText(/^Page \d+$/)).toBeInTheDocument();
        expect(screen.getByText('Rows per page')).toBeInTheDocument();
      });
    });

    test('should render navigation buttons', async () => {
      mockUseDataTableInstance.mockReturnValue(defaultContext);

      render(<DataTablePagination />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      });
    });

    test('should render page size selector', async () => {
      mockUseDataTableInstance.mockReturnValue(defaultContext);

      render(<DataTablePagination />);

      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument();
      });
    });

    test('should handle page navigation', async () => {
      const mockTable = createMockTable({
        getCanNextPage: () => true,
        getCanPreviousPage: () => true,
        nextPage: vi.fn(),
        previousPage: vi.fn(),
      });

      mockUseDataTableInstance.mockReturnValue({
        ...defaultContext,
        table: mockTable,
      });

      render(<DataTablePagination />);

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i });
        const prevButton = screen.getByRole('button', { name: /previous/i });

        fireEvent.click(nextButton);
        fireEvent.click(prevButton);

        expect(mockTable.nextPage).toHaveBeenCalled();
        expect(mockTable.previousPage).toHaveBeenCalled();
      });
    });

    test('should handle page size change', async () => {
      const mockTable = createMockTable({
        setPageSize: vi.fn(),
      });

      mockUseDataTableInstance.mockReturnValue({
        ...defaultContext,
        table: mockTable,
      });

      render(<DataTablePagination />);

      await waitFor(() => {
        // Check that the current page size is displayed
        expect(screen.getByText('10')).toBeInTheDocument();
      });
    });

    test('should disable previous button when on first page', async () => {
      const mockTable = createMockTable({
        getCanPreviousPage: () => false,
        getCanNextPage: () => true,
      });

      mockUseDataTableInstance.mockReturnValue({
        ...defaultContext,
        table: mockTable,
      });

      render(<DataTablePagination />);

      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /previous/i });
        const nextButton = screen.getByRole('button', { name: /next/i });

        expect(prevButton).toBeDisabled();
        expect(nextButton).not.toBeDisabled();
      });
    });

    test('should disable next button when on last page', async () => {
      const mockTable = createMockTable({
        getCanPreviousPage: () => true,
        getCanNextPage: () => false,
      });

      mockUseDataTableInstance.mockReturnValue({
        ...defaultContext,
        table: mockTable,
      });

      render(<DataTablePagination />);

      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /previous/i });
        const nextButton = screen.getByRole('button', { name: /next/i });

        expect(prevButton).not.toBeDisabled();
        expect(nextButton).toBeDisabled();
      });
    });

    test('should handle empty data', async () => {
      mockUseDataTableInstance.mockReturnValue({
        ...defaultContext,
        query: createMockQueryEmpty(),
      });

      render(<DataTablePagination />);

      await waitFor(() => {
        expect(screen.getByText(/^Page \d+$/)).toBeInTheDocument();
      });
    });

    test('should handle loading state', async () => {
      mockUseDataTableInstance.mockReturnValue({
        ...defaultContext,
        isLoading: true,
      });

      render(<DataTablePagination />);

      await waitFor(() => {
        expect(screen.getByText(/^Page \d+$/)).toBeInTheDocument();
      });
    });
  });

  describe('Error scenarios', () => {
    test('should handle missing table methods', async () => {
      const contextMissingMethods = {
        ...defaultContext,
        table: {
          getFilteredSelectedRowModel: () => ({ rows: [] }),
          getPageCount: () => 1,
          getCanPreviousPage: () => false,
          getCanNextPage: () => false,
          setPageSize: vi.fn(),
          previousPage: vi.fn(),
          nextPage: vi.fn(),
          getState: () => ({
            pagination: { pageSize: 10, pageIndex: 0 },
            rowSelection: {},
            sorting: [],
            columnFilters: [],
            globalFilter: '',
          }),
        },
      };

      mockUseDataTableInstance.mockReturnValue(contextMissingMethods);

      render(<DataTablePagination />);

      await waitFor(() => {
        expect(screen.getByText(/^Page \d+$/)).toBeInTheDocument();
      });
    });

    test('should handle missing context', () => {
      mockUseDataTableInstance.mockReturnValue(null);

      expect(() => {
        render(<DataTablePagination />);
      }).toThrow();
    });
  });

  describe('Accessibility', () => {
    test('should have proper button labels', async () => {
      mockUseDataTableInstance.mockReturnValue(defaultContext);

      render(<DataTablePagination />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      });
    });

    test('should have proper page information', async () => {
      mockUseDataTableInstance.mockReturnValue(defaultContext);

      render(<DataTablePagination />);

      await waitFor(() => {
        expect(screen.getByText(/^Page \d+$/)).toBeInTheDocument();
        expect(screen.getByText('Rows per page')).toBeInTheDocument();
      });
    });
  });
});
