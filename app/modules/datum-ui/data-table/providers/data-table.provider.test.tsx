import { DataTable } from '../components/data-table';
import { DataTableProvider } from './data-table.provider';
import {
  dataTableFixtures,
  mockActions,
  mockColumns,
  TestUser,
  TestUserListResponse,
} from '@/tests/fixtures/data-table';
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
import { useReactTable } from '@tanstack/react-table';
import { expect, test, describe, vi, beforeEach } from 'vitest';

// Mock the useReactTable hook
vi.mock('@tanstack/react-table', async () => {
  const actual = await vi.importActual('@tanstack/react-table');
  return {
    ...actual,
    useReactTable: vi.fn(),
  };
});

const mockUseReactTable = vi.fn();

vi.mocked(useReactTable).mockImplementation(mockUseReactTable);

describe('DataTableProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    columns: mockColumns as ColumnDef<TestUser>[],
    query: createMockQuery(),
    transform: (data: TestUserListResponse) => ({
      rows: data?.data?.items || [],
      cursor: data?.data?.metadata?.continue,
    }),
    limit: 10,
    cursor: '',
    setLimit: vi.fn(),
    setCursor: vi.fn(),
  };

  describe('Success scenarios', () => {
    test('should render table with data', async () => {
      mockUseReactTable.mockReturnValue(createMockTable());

      render(
        <DataTableProvider<TestUser, TestUserListResponse>
          {...defaultProps}
          query={createMockQuery()}>
          <DataTable />
        </DataTableProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      });
    });

    test('should render table with actions column when actions provided', async () => {
      mockUseReactTable.mockReturnValue(createMockTableWithActions());

      render(
        <DataTableProvider<TestUser, TestUserListResponse>
          {...defaultProps}
          query={createMockQuery()}
          actions={mockActions}>
          <DataTable />
        </DataTableProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      });
    });

    test('should render table with selection when selectable is true', async () => {
      mockUseReactTable.mockReturnValue(createMockTable());

      render(
        <DataTableProvider<TestUser, TestUserListResponse>
          {...defaultProps}
          query={createMockQuery()}
          selectable={true}>
          <DataTable />
        </DataTableProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      });
    });

    test('should handle loading state', async () => {
      mockUseReactTable.mockReturnValue(createMockTable());

      render(
        <DataTableProvider<TestUser, TestUserListResponse>
          {...defaultProps}
          query={createMockQueryLoading()}>
          <DataTable />
        </DataTableProvider>
      );

      // Check for loading skeleton
      const skeletons = screen.getAllByText('');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    test('should handle empty data', async () => {
      mockUseReactTable.mockReturnValue(createMockTableEmpty());

      render(
        <DataTableProvider<TestUser, TestUserListResponse>
          {...defaultProps}
          query={createMockQueryEmpty()}>
          <DataTable />
        </DataTableProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('No results.')).toBeInTheDocument();
      });
    });
  });

  describe('Error scenarios', () => {
    test('should handle API error', async () => {
      mockUseReactTable.mockReturnValue(createMockTable());

      render(
        <DataTableProvider<TestUser, TestUserListResponse>
          {...defaultProps}
          query={createMockQueryError()}>
          <DataTable />
        </DataTableProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load data')).toBeInTheDocument();
      });
    });

    test('should handle malformed data', async () => {
      mockUseReactTable.mockReturnValue(createMockTableEmpty());

      render(
        <DataTableProvider<TestUser, TestUserListResponse>
          {...defaultProps}
          query={createMockQuery({ data: dataTableFixtures.malformed })}>
          <DataTable />
        </DataTableProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('No results.')).toBeInTheDocument();
      });
    });
  });

  describe('Props validation', () => {
    test('should work without optional props', () => {
      expect(() => {
        render(
          <DataTableProvider<TestUser, TestUserListResponse>
            columns={mockColumns as ColumnDef<TestUser>[]}
            query={createMockQuery()}
            limit={10}
            cursor=""
            setLimit={vi.fn()}
            setCursor={vi.fn()}>
            <DataTable />
          </DataTableProvider>
        );
      }).not.toThrow();
    });

    test('should work with all optional props', () => {
      expect(() => {
        render(
          <DataTableProvider<TestUser, TestUserListResponse>
            columns={mockColumns as ColumnDef<TestUser>[]}
            query={createMockQuery()}
            transform={(data: TestUserListResponse) => ({
              rows: data?.data?.items || [],
              cursor: data?.data?.metadata?.continue,
            })}
            limit={10}
            cursor=""
            setLimit={vi.fn()}
            setCursor={vi.fn()}
            actions={mockActions}
            selectable={true}
            actionsLoading={false}>
            <DataTable />
          </DataTableProvider>
        );
      }).not.toThrow();
    });
  });
});
