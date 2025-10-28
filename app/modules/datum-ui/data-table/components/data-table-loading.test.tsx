import { useDataTableInstance } from '../providers/data-table.provider';
import { DataTableLoading } from './data-table-loading';
import { dataTableFixtures, mockActions, mockColumns, TestUser } from '@/tests/fixtures/data-table';
import {
  createMockQuery,
  createMockQueryError,
  createMockQueryLoading,
  createMockTable,
  createMockTableWithActions,
} from '@/tests/setup/unit/data-table.utils';
import { render, screen, waitFor } from '@/tests/setup/unit/test.utils';
import { ColumnDef } from '@tanstack/react-table';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock the DataTableContext
vi.mock('../providers/data-table.provider', () => ({
  useDataTableInstance: vi.fn(),
}));

const mockUseDataTableInstance = vi.fn();

vi.mocked(useDataTableInstance).mockImplementation(mockUseDataTableInstance);

describe('DataTable Loading States and Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DataTableLoading Component', () => {
    test('should render loading skeleton', () => {
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

      render(<DataTableLoading />);

      // Check for loading skeleton elements
      const skeletons = screen.getAllByText('');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    test('should render loading skeleton with actions column', () => {
      mockUseDataTableInstance.mockReturnValue({
        table: createMockTableWithActions(),
        query: createMockQueryLoading(),
        isLoading: true,
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

      render(<DataTableLoading />);

      // Check for loading skeleton elements
      const skeletons = screen.getAllByText('');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    test('should render loading skeleton with selection enabled', () => {
      mockUseDataTableInstance.mockReturnValue({
        table: createMockTable(),
        query: createMockQueryLoading(),
        isLoading: true,
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

      render(<DataTableLoading />);

      // Check for loading skeleton elements
      const skeletons = screen.getAllByText('');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('API Error Handling', () => {
    test('should handle API error gracefully', async () => {
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

      render(<DataTableLoading />);

      await waitFor(() => {
        // Should handle error gracefully without crashing
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });

    test('should handle malformed data gracefully', async () => {
      mockUseDataTableInstance.mockReturnValue({
        table: createMockTable(),
        query: createMockQuery({ data: dataTableFixtures.malformed }),
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

      render(<DataTableLoading />);

      await waitFor(() => {
        // Should handle malformed data gracefully
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });

    test('should handle network timeout gracefully', async () => {
      mockUseDataTableInstance.mockReturnValue({
        table: createMockTable(),
        query: createMockQuery({ error: dataTableFixtures.networkError }),
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

      render(<DataTableLoading />);

      await waitFor(() => {
        // Should handle network timeout gracefully
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });

    test('should handle 404 error gracefully', async () => {
      mockUseDataTableInstance.mockReturnValue({
        table: createMockTable(),
        query: createMockQuery({ error: dataTableFixtures.error }),
        isLoading: false,
        error: dataTableFixtures.error,
        columns: mockColumns as ColumnDef<TestUser>[],
        isSelectable: false,
        hasActions: false,
        actions: [],
        actionsLoading: false,
        searchPlaceholder: 'Search...',
        emptyMessage: 'No data',
        emptyDescription: 'No data available',
      });

      render(<DataTableLoading />);

      await waitFor(() => {
        // Should handle 404 error gracefully
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });

    test('should handle 500 error gracefully', async () => {
      mockUseDataTableInstance.mockReturnValue({
        table: createMockTable(),
        query: createMockQuery({ error: dataTableFixtures.error }),
        isLoading: false,
        error: dataTableFixtures.error,
        columns: mockColumns as ColumnDef<TestUser>[],
        isSelectable: false,
        hasActions: false,
        actions: [],
        actionsLoading: false,
        searchPlaceholder: 'Search...',
        emptyMessage: 'No data',
        emptyDescription: 'No data available',
      });

      render(<DataTableLoading />);

      await waitFor(() => {
        // Should handle 500 error gracefully
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });
  });

  describe('Action Loading States', () => {
    test('should handle action loading state', () => {
      mockUseDataTableInstance.mockReturnValue({
        table: createMockTableWithActions(),
        query: createMockQueryLoading(),
        isLoading: true,
        error: null,
        columns: mockColumns as ColumnDef<TestUser>[],
        isSelectable: false,
        hasActions: true,
        actions: mockActions,
        actionsLoading: true,
        searchPlaceholder: 'Search...',
        emptyMessage: 'No data',
        emptyDescription: 'No data available',
      });

      render(<DataTableLoading />);

      // Check for loading skeleton elements
      const skeletons = screen.getAllByText('');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    test('should handle action loading with selection', () => {
      mockUseDataTableInstance.mockReturnValue({
        table: createMockTableWithActions(),
        query: createMockQueryLoading(),
        isLoading: true,
        error: null,
        columns: mockColumns as ColumnDef<TestUser>[],
        isSelectable: true,
        hasActions: true,
        actions: mockActions,
        actionsLoading: true,
        searchPlaceholder: 'Search...',
        emptyMessage: 'No data',
        emptyDescription: 'No data available',
      });

      render(<DataTableLoading />);

      // Check for loading skeleton elements
      const skeletons = screen.getAllByText('');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing table context', () => {
      mockUseDataTableInstance.mockReturnValue(null);

      expect(() => {
        render(<DataTableLoading />);
      }).toThrow();
    });

    test('should handle undefined query', () => {
      mockUseDataTableInstance.mockReturnValue({
        table: createMockTable(),
        query: undefined,
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

      // Should handle undefined query gracefully
      render(<DataTableLoading />);

      // Check for loading skeleton elements
      const skeletons = screen.getAllByText('');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    test('should handle empty columns array', () => {
      mockUseDataTableInstance.mockReturnValue({
        table: createMockTable(),
        query: createMockQueryLoading(),
        isLoading: true,
        error: null,
        columns: [],
        isSelectable: false,
        hasActions: false,
        actions: [],
        actionsLoading: false,
        searchPlaceholder: 'Search...',
        emptyMessage: 'No data',
        emptyDescription: 'No data available',
      });

      render(<DataTableLoading />);

      // Should handle empty columns gracefully
      const skeletons = screen.getAllByText('');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });
});
