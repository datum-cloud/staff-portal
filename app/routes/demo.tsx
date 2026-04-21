import ButtonEnhancedDemo from '@/components/demo/button-enhanced-demo';
import { FormDemo } from '@/components/demo/form-demo';
import { logger } from '@/utils/logger';
import { DataTable as DatumDataTable } from '@datum-cloud/datum-ui/data-table';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { EditIcon, Trash2Icon } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';

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

// Extended demo data for client-side table
interface ClientDemoData {
  id: string;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  status: 'active' | 'inactive' | 'pending';
  category: 'premium' | 'basic' | 'free';
}

interface ClientDemoDataList {
  items: ClientDemoData[];
}

const clientDemoData: ClientDemoData[] = [
  {
    id: '1',
    name: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    status: 'active',
    category: 'premium',
  },
  {
    id: '2',
    name: 'Jane Smith',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    status: 'inactive',
    category: 'basic',
  },
  {
    id: '3',
    name: 'Bob Johnson',
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob@example.com',
    status: 'active',
    category: 'free',
  },
  {
    id: '4',
    name: 'Alice Williams',
    firstName: 'Alice',
    lastName: 'Williams',
    email: 'alice@example.com',
    status: 'pending',
    category: 'premium',
  },
  {
    id: '5',
    name: 'Charlie Brown',
    firstName: 'Charlie',
    lastName: 'Brown',
    email: 'charlie@example.com',
    status: 'active',
    category: 'basic',
  },
  {
    id: '6',
    name: 'Diana Prince',
    firstName: 'Diana',
    lastName: 'Prince',
    email: 'diana@example.com',
    status: 'inactive',
    category: 'free',
  },
  {
    id: '7',
    name: 'Edward Norton',
    firstName: 'Edward',
    lastName: 'Norton',
    email: 'edward@example.com',
    status: 'active',
    category: 'premium',
  },
  {
    id: '8',
    name: 'Fiona Apple',
    firstName: 'Fiona',
    lastName: 'Apple',
    email: 'fiona@example.com',
    status: 'pending',
    category: 'basic',
  },
  {
    id: '9',
    name: 'George Washington',
    firstName: 'George',
    lastName: 'Washington',
    email: 'george@example.com',
    status: 'active',
    category: 'free',
  },
  {
    id: '10',
    name: 'Helen Keller',
    firstName: 'Helen',
    lastName: 'Keller',
    email: 'helen@example.com',
    status: 'inactive',
    category: 'premium',
  },
];

const clientColumnHelper = createColumnHelper<ClientDemoData>();

function buildClientDemoColumns(
  loadingStates: Record<string, boolean>,
  setLoadingStates: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
) {
  const demoActions = [
    {
      label: 'Edit',
      icon: EditIcon,
      onClick: async (row: ClientDemoData) => {
        setLoadingStates((prev) => ({ ...prev, [`edit-${row.id}`]: true }));
        try {
          await new Promise((r) => setTimeout(r, 500));
          logger.business('Edit demo row', { rowId: row.id, row });
        } finally {
          setLoadingStates((prev) => ({ ...prev, [`edit-${row.id}`]: false }));
        }
      },
    },
    {
      label: 'Delete',
      icon: Trash2Icon,
      variant: 'destructive' as const,
      onClick: async (row: ClientDemoData) => {
        setLoadingStates((prev) => ({ ...prev, [`delete-${row.id}`]: true }));
        try {
          await new Promise((r) => setTimeout(r, 500));
          logger.business('Delete demo row', { rowId: row.id, row });
        } finally {
          setLoadingStates((prev) => ({ ...prev, [`delete-${row.id}`]: false }));
        }
      },
    },
  ];
  return [
    clientColumnHelper.accessor('name', {
      header: ({ column }) => <DatumDataTable.ColumnHeader column={column} title="Name" />,
      cell: ({ getValue }) => <strong>{getValue()}</strong>,
    }),
    clientColumnHelper.accessor('email', {
      header: ({ column }) => <DatumDataTable.ColumnHeader column={column} title="Email" />,
    }),
    clientColumnHelper.accessor('status', {
      header: ({ column }) => <DatumDataTable.ColumnHeader column={column} title="Status" />,
      cell: ({ getValue }) => {
        const status = getValue();
        const colors = {
          active: 'bg-green-100 text-green-800',
          inactive: 'bg-red-100 text-red-800',
          pending: 'bg-yellow-100 text-yellow-800',
        };
        return <span className={`rounded px-2 py-1 text-xs ${colors[status]}`}>{status}</span>;
      },
    }),
    clientColumnHelper.accessor('category', {
      header: ({ column }) => <DatumDataTable.ColumnHeader column={column} title="Category" />,
      cell: ({ getValue }) => <span className="text-sm capitalize">{getValue()}</span>,
    }),
    clientColumnHelper.display({
      id: 'actions',
      header: () => <div className="text-right" />,
      cell: ({ row }) => (
        <div className="flex w-full justify-end">
          <DatumDataTable.RowActions
            isLoading={
              loadingStates[`edit-${row.original.id}`] || loadingStates[`delete-${row.original.id}`]
            }
            row={row}
            actions={demoActions}
          />
        </div>
      ),
    }),
  ];
}

const fetchClientDemoData = async (): Promise<ClientDemoDataList> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { items: clientDemoData };
};

const actions = [
  {
    label: 'Edit',
    icon: EditIcon,
    onClick: (row: DemoData) => logger.business('Edit demo row', { rowId: row.id, row }),
  },
  {
    label: 'Delete',
    icon: Trash2Icon,
    variant: 'destructive' as const,
    onClick: (row: DemoData) => logger.business('Delete demo row', { rowId: row.id, row }),
  },
];

const columnsWithActions = [
  ...columns,
  columnHelper.display({
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <DatumDataTable.RowActions row={row} actions={actions} />
      </div>
    ),
  }),
];

export default function DemoPage() {
  return (
    <div className="space-y-8 p-6">
      <FormDemo />
      <ButtonEnhancedDemo />

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
        <DatumDataTable.Client
          data={demoData}
          columns={columnsWithActions}
          pageSize={10}
          getRowId={(r) => r.id}
          enableRowSelection>
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-lg border">
              <DatumDataTable.Content />
            </div>
            <DatumDataTable.Pagination pageSizes={[5, 10, 20]} />
          </div>
        </DatumDataTable.Client>
      </div>

      {/* Actions Only */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Actions Only</h2>
        <p className="mb-4 text-sm text-gray-500">
          Shows how it works with only actions (no selection).
        </p>
        <DatumDataTable.Client
          data={demoData}
          columns={columnsWithActions}
          pageSize={10}
          getRowId={(r) => r.id}
          enableRowSelection={false}>
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-lg border">
              <DatumDataTable.Content />
            </div>
            <DatumDataTable.Pagination pageSizes={[5, 10, 20]} />
          </div>
        </DatumDataTable.Client>
      </div>

      {/* Selection Only */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Selection Only</h2>
        <p className="mb-4 text-sm text-gray-500">
          Shows how it works with only selection (no actions).
        </p>
        <DatumDataTable.Client
          data={demoData}
          columns={columns}
          pageSize={10}
          getRowId={(r) => r.id}
          enableRowSelection>
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-lg border">
              <DatumDataTable.Content />
            </div>
            <DatumDataTable.Pagination pageSizes={[5, 10, 20]} />
          </div>
        </DatumDataTable.Client>
      </div>

      {/* Client-Side Data Table Demos */}
      <div>
        <h1 className="mb-4 text-2xl font-bold">Client-Side Data Table Demo</h1>
        <p className="mb-6 text-gray-600">
          This demo showcases the client-side data table with search, filtering, sorting, and
          pagination. All operations happen in the browser after fetching all data.
        </p>
      </div>

      {/* Full Featured Client-Side Example */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Full Featured Example</h2>
        <p className="mb-4 text-sm text-gray-500">
          Complete example with search, filters, sorting, pagination, and actions.
        </p>
        <ClientDataTableDemo />
      </div>

      {/* Search Only Client-Side Example */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Search Only</h2>
        <p className="mb-4 text-sm text-gray-500">
          Example with only search functionality enabled.
        </p>
        <ClientDataTableSearchOnlyDemo />
      </div>

      {/* Actions Only Client-Side Example */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Actions Only</h2>
        <p className="mb-4 text-sm text-gray-500">
          Example with actions but no selection or filters.
        </p>
        <ClientDataTableActionsOnlyDemo />
      </div>
    </div>
  );
}

function ClientDataTableDemo() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const tableQuery = useQuery({
    queryKey: ['demo', 'client-table-full'],
    queryFn: fetchClientDemoData,
  });
  const columns = useMemo(
    () => buildClientDemoColumns(loadingStates, setLoadingStates),
    [loadingStates]
  );
  const rows = tableQuery.data?.items ?? [];

  return (
    <DatumDataTable.Client
      loading={tableQuery.isLoading}
      data={rows}
      columns={columns}
      pageSize={10}
      getRowId={(r) => r.id}
      defaultSort={[{ id: 'name', desc: false }]}
      filterFns={{
        status: (cellValue, filterValue) =>
          String(cellValue ?? '').toLowerCase() === String(filterValue ?? '').toLowerCase(),
        category: (cellValue, filterValue) =>
          String(cellValue ?? '').toLowerCase() === String(filterValue ?? '').toLowerCase(),
      }}
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [
          row.name,
          row.email,
          row.firstName,
          row.lastName,
          `${row.firstName} ${row.lastName}`.trim(),
        ]
          .map((s) => (s ?? '').toLowerCase())
          .some((s) => s.includes(q));
      }}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <DatumDataTable.Search placeholder="Search by name or email..." className="w-64" />
          <DatumDataTable.SelectFilter
            column="status"
            label="Status"
            placeholder="Filter by status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'pending', label: 'Pending' },
            ]}
          />
          <DatumDataTable.SelectFilter
            column="category"
            label="Category"
            placeholder="Filter by category"
            options={[
              { value: 'premium', label: 'Premium' },
              { value: 'basic', label: 'Basic' },
              { value: 'free', label: 'Free' },
            ]}
          />
        </div>
        <DatumDataTable.ActiveFilters
          excludeFilters={['search']}
          filterLabels={{ status: 'Status', category: 'Category' }}
          formatFilterValue={{
            status: (value: string) => {
              const labels: Record<string, string> = {
                active: 'Active',
                inactive: 'Inactive',
                pending: 'Pending',
              };
              return labels[value] ?? value;
            },
            category: (value: string) =>
              String(value).charAt(0).toUpperCase() + String(value).slice(1),
          }}
        />
        <div className="overflow-hidden rounded-lg border">
          <DatumDataTable.Content emptyMessage="No rows." />
        </div>
        <DatumDataTable.Pagination pageSizes={[5, 10, 20]} />
      </div>
    </DatumDataTable.Client>
  );
}

function ClientDataTableSearchOnlyDemo() {
  const tableQuery = useQuery({
    queryKey: ['demo', 'client-table-search'],
    queryFn: fetchClientDemoData,
  });
  const columns = useMemo(
    () => [
      clientColumnHelper.accessor('name', {
        header: ({ column }) => <DatumDataTable.ColumnHeader column={column} title="Name" />,
        cell: ({ getValue }) => <strong>{getValue()}</strong>,
      }),
      clientColumnHelper.accessor('email', { header: 'Email' }),
      clientColumnHelper.accessor('status', {
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getValue();
          const colors = {
            active: 'bg-green-100 text-green-800',
            inactive: 'bg-red-100 text-red-800',
            pending: 'bg-yellow-100 text-yellow-800',
          };
          return <span className={`rounded px-2 py-1 text-xs ${colors[status]}`}>{status}</span>;
        },
      }),
      clientColumnHelper.accessor('category', {
        header: 'Category',
        cell: ({ getValue }) => <span className="text-sm capitalize">{getValue()}</span>,
      }),
    ],
    []
  );

  return (
    <DatumDataTable.Client
      loading={tableQuery.isLoading}
      data={tableQuery.data?.items ?? []}
      columns={columns}
      pageSize={10}
      getRowId={(r) => r.id}
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          (row.name ?? '').toLowerCase().includes(q) || (row.email ?? '').toLowerCase().includes(q)
        );
      }}>
      <div className="flex flex-col gap-4">
        <DatumDataTable.Search placeholder="Search..." className="w-64" />
        <div className="overflow-hidden rounded-lg border">
          <DatumDataTable.Content />
        </div>
        <DatumDataTable.Pagination />
      </div>
    </DatumDataTable.Client>
  );
}

function ClientDataTableActionsOnlyDemo() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const tableQuery = useQuery({
    queryKey: ['demo', 'client-table-actions'],
    queryFn: fetchClientDemoData,
  });
  const columns = useMemo(
    () => buildClientDemoColumns(loadingStates, setLoadingStates),
    [loadingStates]
  );

  return (
    <DatumDataTable.Client
      loading={tableQuery.isLoading}
      data={tableQuery.data?.items ?? []}
      columns={columns}
      pageSize={10}
      getRowId={(r) => r.id}>
      <div className="overflow-hidden rounded-lg border">
        <DatumDataTable.Content />
      </div>
    </DatumDataTable.Client>
  );
}
