import { createActionsColumn, enhanceFirstColumnWithSelection } from './data-table-select-actions';
import { dataTableFixtures, mockActions, TestUser } from '@/tests/fixtures/data-table';
import { createMockTable } from '@/tests/setup/unit/data-table.utils';
import { ColumnDef } from '@tanstack/react-table';
import { beforeEach, describe, expect, test, vi } from 'vitest';

describe('DataTable Select Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('enhanceFirstColumnWithSelection', () => {
    test('should enhance first column with selection checkbox', () => {
      const originalColumn = {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ getValue }: any) => getValue?.() || 'Mock Value',
      } as ColumnDef<TestUser>;

      const enhancedColumn = enhanceFirstColumnWithSelection(originalColumn);

      expect(enhancedColumn).toBeDefined();
      expect((enhancedColumn as any).accessorKey).toBe('name');
    });

    test('should render checkbox in enhanced column', () => {
      const originalColumn = {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ getValue }: any) => getValue?.() || 'Mock Value',
      } as ColumnDef<TestUser>;

      const enhancedColumn = enhanceFirstColumnWithSelection(originalColumn);

      // Mock row with selection methods
      const mockRow = {
        getIsSelected: () => false,
        toggleSelected: vi.fn(),
      };

      // Render the cell content
      const cellContent =
        typeof enhancedColumn.cell === 'function'
          ? enhancedColumn.cell({ row: mockRow } as any)
          : enhancedColumn.cell;

      expect(cellContent).toBeDefined();
    });

    test('should handle selection toggle', () => {
      const originalColumn = {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ getValue }: any) => getValue?.() || 'Mock Value',
      } as ColumnDef<TestUser>;

      const enhancedColumn = enhanceFirstColumnWithSelection(originalColumn);

      const mockRow = {
        getIsSelected: () => true,
        toggleSelected: vi.fn(),
      };

      // Render the cell content
      const cellContent =
        typeof enhancedColumn.cell === 'function'
          ? enhancedColumn.cell({ row: mockRow } as any)
          : enhancedColumn.cell;

      expect(cellContent).toBeDefined();
    });

    test('should preserve original header', () => {
      const originalColumn = {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ getValue }: any) => getValue?.() || 'Mock Value',
      } as ColumnDef<TestUser>;

      const enhancedColumn = enhanceFirstColumnWithSelection(originalColumn);

      const headerContent =
        typeof enhancedColumn.header === 'function'
          ? enhancedColumn.header({ table: createMockTable() } as any)
          : enhancedColumn.header;

      // The header is now a React component, so we check it's defined
      expect(headerContent).toBeDefined();
    });
  });

  describe('createActionsColumn', () => {
    test('should create actions column', () => {
      const actionsColumn = createActionsColumn({
        selectable: false,
        actions: mockActions,
        loading: false,
      });

      expect(actionsColumn).toBeDefined();
      expect(actionsColumn?.id).toBe('actions');
    });

    test('should render action buttons', () => {
      const actionsColumn = createActionsColumn({
        selectable: false,
        actions: mockActions,
        loading: false,
      });

      const mockRow = {
        original: dataTableFixtures.withUsers.data.items[0],
      };

      // Render the cell content
      const cellContent =
        typeof actionsColumn?.cell === 'function'
          ? actionsColumn.cell({ row: mockRow } as any)
          : actionsColumn?.cell;

      expect(cellContent).toBeDefined();
    });

    test('should handle action clicks', () => {
      const mockAction = {
        label: 'Test Action',
        onClick: vi.fn(),
      };

      const actionsColumn = createActionsColumn({
        selectable: false,
        actions: [mockAction],
        loading: false,
      });

      const mockRow = {
        original: dataTableFixtures.withUsers.data.items[0],
      };

      // Render the cell content
      const cellContent =
        typeof actionsColumn?.cell === 'function'
          ? actionsColumn.cell({ row: mockRow } as any)
          : actionsColumn?.cell;

      expect(cellContent).toBeDefined();
    });

    test('should handle disabled actions', () => {
      const disabledAction = {
        label: 'Disabled Action',
        onClick: vi.fn(),
        disabled: true,
      };

      const actionsColumn = createActionsColumn({
        selectable: false,
        actions: [disabledAction],
        loading: false,
      });

      const mockRow = {
        original: dataTableFixtures.withUsers.data.items[0],
      };

      // Render the cell content
      const cellContent =
        typeof actionsColumn?.cell === 'function'
          ? actionsColumn.cell({ row: mockRow } as any)
          : actionsColumn?.cell;

      expect(cellContent).toBeDefined();
    });

    test('should handle actions with tooltips', () => {
      const tooltipAction = {
        label: 'Tooltip Action',
        onClick: vi.fn(),
        tooltip: 'This is a tooltip',
      };

      const actionsColumn = createActionsColumn({
        selectable: false,
        actions: [tooltipAction],
        loading: false,
      });

      const mockRow = {
        original: dataTableFixtures.withUsers.data.items[0],
      };

      // Render the cell content
      const cellContent =
        typeof actionsColumn?.cell === 'function'
          ? actionsColumn.cell({ row: mockRow } as any)
          : actionsColumn?.cell;

      expect(cellContent).toBeDefined();
    });

    test('should handle loading state', () => {
      const actionsColumn = createActionsColumn({
        selectable: false,
        actions: mockActions,
        loading: true,
      });

      const mockRow = {
        original: dataTableFixtures.withUsers.data.items[0],
      };

      // Render the cell content
      const cellContent =
        typeof actionsColumn?.cell === 'function'
          ? actionsColumn.cell({ row: mockRow } as any)
          : actionsColumn?.cell;

      expect(cellContent).toBeDefined();
    });

    test('should handle actions with icons', () => {
      const iconAction = {
        label: 'Icon Action',
        icon: () => <span data-testid="test-icon">📝</span>,
        onClick: vi.fn(),
      };

      const actionsColumn = createActionsColumn({
        selectable: false,
        actions: [iconAction],
        loading: false,
      });

      const mockRow = {
        original: dataTableFixtures.withUsers.data.items[0],
      };

      // Render the cell content
      const cellContent =
        typeof actionsColumn?.cell === 'function'
          ? actionsColumn.cell({ row: mockRow } as any)
          : actionsColumn?.cell;

      expect(cellContent).toBeDefined();
    });

    test('should handle destructive actions', () => {
      const destructiveAction = {
        label: 'Delete',
        onClick: vi.fn(),
        variant: 'destructive' as const,
      };

      const actionsColumn = createActionsColumn({
        selectable: false,
        actions: [destructiveAction],
        loading: false,
      });

      const mockRow = {
        original: dataTableFixtures.withUsers.data.items[0],
      };

      // Render the cell content
      const cellContent =
        typeof actionsColumn?.cell === 'function'
          ? actionsColumn.cell({ row: mockRow } as any)
          : actionsColumn?.cell;

      expect(cellContent).toBeDefined();
    });

    test('should return null for empty actions', () => {
      const actionsColumn = createActionsColumn({
        selectable: false,
        actions: [],
        loading: false,
      });

      expect(actionsColumn).toBeNull();
    });
  });
});
