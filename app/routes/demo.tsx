import ButtonEnhancedDemo from '@/components/demo/button-enhanced-demo';
import { FormDemo } from '@/components/demo/form-demo';
import { logger } from '@/utils/logger';
import {
  ClientDataTable,
  ClientDataTableProvider,
  ClientDataTableSearch,
  ClientDataTableFacetFilter,
  createAdvancedSearch,
  useClientDataTableQuery,
} from '@datum-ui/client-data-table';
import { DataTable, DataTableProvider } from '@datum-ui/data-table';
import { DataTableActiveFilters } from '@datum-ui/data-table';
import { createColumnHelper } from '@tanstack/react-table';
import { EditIcon, Trash2Icon } from 'lucide-react';
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

const clientColumns = [
  clientColumnHelper.accessor('name', {
    header: 'Name',
    cell: ({ getValue }) => <strong>{getValue()}</strong>,
  }),
  clientColumnHelper.accessor('email', {
    header: 'Email',
  }),
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
    cell: ({ getValue }) => {
      const category = getValue();
      return <span className="text-sm capitalize">{category}</span>;
    },
  }),
];

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

// Client-Side Data Table Demo Components
function ClientDataTableDemo() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const tableState = useClientDataTableQuery<ClientDemoDataList>({
    queryKeyPrefix: 'client-table-demo',
    fetchFn: fetchClientDemoData,
    useSorting: true,
    useSearch: true,
    useFilters: true,
    initialPageSize: 10,
  });

  const demoActions = useMemo(
    () => [
      {
        label: 'Edit',
        icon: EditIcon,
        onClick: async (row: ClientDemoData) => {
          setLoadingStates((prev) => ({ ...prev, [`edit-${row.id}`]: true }));
          try {
            await new Promise((resolve) => setTimeout(resolve, 1000));
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
            await new Promise((resolve) => setTimeout(resolve, 1000));
            logger.business('Delete demo row', { rowId: row.id, row });
          } finally {
            setLoadingStates((prev) => ({ ...prev, [`delete-${row.id}`]: false }));
          }
        },
      },
    ],
    []
  );

  return (
    <ClientDataTableProvider<ClientDemoData, ClientDemoDataList>
      columns={clientColumns}
      transform={(data) => data?.items || []}
      actions={demoActions}
      actionsLoading={(row) =>
        loadingStates[`edit-${row.id}`] || loadingStates[`delete-${row.id}`] || false
      }
      filterFn={(row, filters) => {
        if (filters.status && row.status !== filters.status) {
          return false;
        }
        if (filters.category && row.category !== filters.category) {
          return false;
        }
        return true;
      }}
      globalFilterFn={createAdvancedSearch<ClientDemoData>(
        [
          (row) => row.email?.toLowerCase() || '',
          (row) => row.firstName?.toLowerCase() || '',
          (row) => row.lastName?.toLowerCase() || '',
        ],
        [(row) => `${row.firstName} ${row.lastName}`.trim().toLowerCase()]
      )}
      {...tableState}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <ClientDataTableSearch placeholder="Search by name or email..." />
          <ClientDataTableFacetFilter
            filterKey="status"
            label="Status"
            placeholder="Filter by status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'pending', label: 'Pending' },
            ]}
          />
          <ClientDataTableFacetFilter
            filterKey="category"
            label="Category"
            placeholder="Filter by category"
            options={[
              { value: 'premium', label: 'Premium' },
              { value: 'basic', label: 'Basic' },
              { value: 'free', label: 'Free' },
            ]}
          />
        </div>
        <DataTableActiveFilters
          filters={tableState.filters}
          search={tableState.search}
          onClearFilter={tableState.clearFilter}
          onClearAllFilters={tableState.clearAllFilters}
          onClearSearch={tableState.clearSearch}
          filterLabels={{
            status: 'Status',
            category: 'Category',
          }}
          formatFilterValue={(key, value) => {
            if (key === 'status') {
              const labels: Record<string, string> = {
                active: 'Active',
                inactive: 'Inactive',
                pending: 'Pending',
              };
              return labels[value] || value;
            }
            if (key === 'category') {
              return String(value).charAt(0).toUpperCase() + String(value).slice(1);
            }
            return String(value);
          }}
          excludeFilters={['search']}
        />
        <div className="overflow-hidden rounded-lg border">
          <ClientDataTable<ClientDemoData> />
        </div>
      </div>
    </ClientDataTableProvider>
  );
}

function ClientDataTableSearchOnlyDemo() {
  const tableState = useClientDataTableQuery<ClientDemoDataList>({
    queryKeyPrefix: 'client-table-demo-search',
    fetchFn: fetchClientDemoData,
    useSorting: true,
    useSearch: true,
    useFilters: false,
  });

  return (
    <ClientDataTableProvider<ClientDemoData, ClientDemoDataList>
      columns={clientColumns}
      transform={(data) => data?.items || []}
      globalFilterFn={createAdvancedSearch<ClientDemoData>([
        (row) => row.name?.toLowerCase() || '',
        (row) => row.email?.toLowerCase() || '',
      ])}
      {...tableState}>
      <div className="flex flex-col gap-4">
        <ClientDataTableSearch placeholder="Search..." />
        <div className="overflow-hidden rounded-lg border">
          <ClientDataTable<ClientDemoData> />
        </div>
      </div>
    </ClientDataTableProvider>
  );
}

function ClientDataTableActionsOnlyDemo() {
  return (
    <ClientDataTableProvider<ClientDemoData, ClientDemoDataList>
      columns={clientColumns}
      transform={(data) => data?.items || []}
      actions={actions.map((action) => ({
        ...action,
        onClick: (row: ClientDemoData) => action.onClick(row as DemoData),
      }))}
      {...useClientDataTableQuery<ClientDemoDataList>({
        queryKeyPrefix: 'client-table-demo-actions',
        fetchFn: fetchClientDemoData,
        useSorting: true,
        useSearch: false,
        useFilters: false,
      })}>
      <div className="overflow-hidden rounded-lg border">
        <ClientDataTable<ClientDemoData> />
      </div>
    </ClientDataTableProvider>
  );
}
