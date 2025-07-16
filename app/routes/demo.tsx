import { DataTable, DataTableProvider, useDataTableQuery } from '@/modules/data-table';
import { Button } from '@/modules/shadcn/ui/button';
import { createColumnHelper } from '@tanstack/react-table';
import { EditIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';

interface DemoData {
  id: string;
  name: string;
  email: string;
  status: string;
}

const columnHelper = createColumnHelper<DemoData>();

const columns = [
  columnHelper.accessor('name', {
    header: 'Name',
    cell: ({ getValue }) => <strong>{getValue()}</strong>,
  }),
  columnHelper.accessor('email', {
    header: 'Email',
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: ({ getValue }) => (
      <span
        className={`rounded px-2 py-1 text-xs ${getValue() === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {getValue()}
      </span>
    ),
  }),
];

const demoData: DemoData[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', status: 'active' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', status: 'active' },
];

const actions = [
  {
    label: 'Edit',
    icon: EditIcon,
    onClick: (row: DemoData) => console.log('Edit:', row),
  },
  {
    label: 'Delete',
    icon: Trash2Icon,
    variant: 'destructive' as const,
    onClick: (row: DemoData) => console.log('Delete:', row),
  },
];

export default function DemoPage() {
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});

  // Mock query state
  const mockQuery = {
    data: { rows: demoData, cursor: undefined },
    isLoading: false,
    isError: false,
  } as any;

  const tableState = {
    query: mockQuery,
    limit: 10,
    cursor: '',
    sorting: [],
    globalFilter: '',
    columnVisibility: {},
    columnPinning: {},
    columnOrder: [],
    rowSelection: selectedRows,
    setLimit: () => {},
    setCursor: () => {},
    setSorting: () => {},
    setGlobalFilter: () => {},
    setColumnVisibility: () => {},
    setColumnPinning: () => {},
    setColumnOrder: () => {},
    setRowSelection: setSelectedRows,
  };

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="mb-4 text-2xl font-bold">Data Table Select/Actions Demo</h1>
        <p className="mb-6 text-gray-600">
          This demo shows the enhanced first column approach that combines select/actions with the
          first column content.
        </p>
      </div>

      {/* Select + Actions */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Select + Actions</h2>
        <p className="mb-4 text-sm text-gray-500">
          Shows both selection checkbox and actions dropdown combined with the first column content.
        </p>
        <DataTableProvider<DemoData> {...tableState} columns={columns} selectable actions={actions}>
          <div className="overflow-hidden rounded-lg border">
            <DataTable<DemoData> />
          </div>
        </DataTableProvider>
      </div>

      {/* Actions Only */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Actions Only</h2>
        <p className="mb-4 text-sm text-gray-500">
          Shows how it works with only actions (no selection).
        </p>
        <DataTableProvider<DemoData>
          {...tableState}
          columns={columns}
          selectable={false}
          actions={actions}>
          <div className="overflow-hidden rounded-lg border">
            <DataTable<DemoData> />
          </div>
        </DataTableProvider>
      </div>

      {/* Selection Only */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Selection Only</h2>
        <p className="mb-4 text-sm text-gray-500">
          Shows how it works with only selection (no actions).
        </p>
        <DataTableProvider<DemoData> {...tableState} columns={columns} selectable actions={[]}>
          <div className="overflow-hidden rounded-lg border">
            <DataTable<DemoData> />
          </div>
        </DataTableProvider>
      </div>
    </div>
  );
}
