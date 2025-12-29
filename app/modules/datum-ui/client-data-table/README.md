# Client-Side Data Table

A powerful client-side data table component built on TanStack Table that performs all operations (sorting, filtering, pagination, search) in the browser after fetching all data.

## Overview

The client-side data table is designed for scenarios where:

- You have a manageable dataset that can be loaded entirely into memory
- You want instant, responsive filtering and sorting without server round-trips
- Your API returns all data when no limit is specified (e.g., Kubernetes APIs)
- You need complex client-side filtering logic

### Key Features

- ✅ **Client-side operations**: All filtering, sorting, pagination, and search happen in the browser
- ✅ **URL state persistence**: All table state (page, sort, filters, search) is synced with URL
- ✅ **Type-safe**: Full TypeScript support
- ✅ **Flexible search**: Built-in utilities for multi-field and computed field search
- ✅ **Custom filters**: Easy-to-implement custom filter functions
- ✅ **Reusable components**: Search, filters, and pagination as separate components
- ✅ **Modern design**: Actions column, loading states, and responsive design

## When to Use Client-Side vs Server-Side

**Use Client-Side Data Table when:**

- Dataset is small to medium size (< 10,000 rows typically)
- You need instant filtering/sorting without API calls
- Your API returns all data when no limit is specified
- You want complex client-side filtering logic

**Use Server-Side Data Table when:**

- Dataset is large (10,000+ rows)
- You need server-side pagination (cursor-based)
- You want to reduce initial load time
- Filtering/sorting must happen on the server

## Basic Usage

### 1. Setup the Query Hook

```tsx
import { useClientDataTableQuery } from '@datum-ui/client-data-table';

const tableState = useClientDataTableQuery<YourResponseType>({
  queryKeyPrefix: 'your-data',
  fetchFn: yourApiCall, // Should return all data (no limit needed)
  useSorting: true,
  useSearch: true,
  useFilters: true,
  initialPageSize: 20,
});
```

### 2. Define Columns

```tsx
import { createColumnHelper } from '@tanstack/react-table';

const columnHelper = createColumnHelper<YourDataType>();

const columns = [
  columnHelper.accessor('name', {
    header: 'Name',
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor('email', {
    header: 'Email',
    cell: ({ getValue }) => getValue(),
  }),
];
```

### 3. Use the Provider and Components

```tsx
import {
  ClientDataTable,
  ClientDataTableProvider,
  ClientDataTableSearch,
  ClientDataTableFacetFilter,
  ClientDataTablePagination,
} from '@datum-ui/client-data-table';

export default function MyPage() {
  const tableState = useClientDataTableQuery<YourResponseType>({
    queryKeyPrefix: 'my-data',
    fetchFn: fetchAllData,
    useSorting: true,
    useSearch: true,
    useFilters: true,
  });

  return (
    <ClientDataTableProvider<YourDataType, YourResponseType>
      columns={columns}
      transform={(data) => data?.items || []}
      {...tableState}>
      <div className="m-4 flex flex-col gap-2">
        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <ClientDataTableSearch placeholder="Search..." />
          <ClientDataTableFacetFilter
            filterKey="status"
            label="Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </div>

        {/* Table */}
        <ClientDataTable<YourDataType> />
      </div>
    </ClientDataTableProvider>
  );
}
```

## Search Functionality

### Using Search Utilities

The client-data-table provides utility functions to simplify multi-field search:

#### 1. `createMultiFieldSearch` - Simple Multi-Field Search

```tsx
import { createMultiFieldSearch } from '@datum-ui/client-data-table';

const searchFn = createMultiFieldSearch([
  (row) => row.email?.toLowerCase() || '',
  (row) => row.name?.toLowerCase() || '',
]);

<ClientDataTableProvider globalFilterFn={searchFn} {...tableState} />;
```

#### 2. `createPathBasedSearch` - Path-Based Search

```tsx
import { createPathBasedSearch } from '@datum-ui/client-data-table';

const searchFn = createPathBasedSearch(['spec.email', 'spec.name', 'metadata.id']);

<ClientDataTableProvider globalFilterFn={searchFn} {...tableState} />;
```

#### 3. `createAdvancedSearch` - With Computed Fields (Recommended)

```tsx
import { createAdvancedSearch } from '@datum-ui/client-data-table';

const searchFn = createAdvancedSearch(
  [
    // Regular fields
    (row) => row.spec?.email?.toLowerCase() || '',
    (row) => row.spec?.givenName?.toLowerCase() || '',
    (row) => row.spec?.familyName?.toLowerCase() || '',
  ],
  [
    // Computed fields (e.g., full name)
    (row) => `${row.spec?.givenName || ''} ${row.spec?.familyName || ''}`.trim().toLowerCase(),
  ]
);

<ClientDataTableProvider globalFilterFn={searchFn} {...tableState} />;
```

### Custom Search Function

You can also write your own search function:

```tsx
import { FilterFn } from '@tanstack/react-table';

const customSearchFn: FilterFn<YourDataType> = (row, _columnId, filterValue) => {
  const search = String(filterValue).toLowerCase();
  if (!search) return true;

  const data = row.original;
  // Your custom search logic here
  return data.email?.toLowerCase().includes(search) || data.name?.toLowerCase().includes(search);
};

<ClientDataTableProvider globalFilterFn={customSearchFn} {...tableState} />;
```

## Filtering

### Custom Filter Function

Use the `filterFn` prop to implement custom filtering logic:

```tsx
<ClientDataTableProvider
  filterFn={(row, filters) => {
    // Check all filters - ALL must match (AND logic)

    if (filters.status) {
      if (row.status !== filters.status) {
        return false;
      }
    }

    if (filters.category) {
      if (row.category !== filters.category) {
        return false;
      }
    }

    // All filters passed
    return true;
  }}
  {...tableState}
/>
```

### Multiple Filters

The `filterFn` receives all active filters at once. All filters must match (AND logic):

```tsx
// If filters = { status: 'active', category: 'premium' }
// Row must have status === 'active' AND category === 'premium'
```

### Using Facet Filters

```tsx
<ClientDataTableFacetFilter
  filterKey="status"
  label="Status"
  placeholder="Filter by status"
  options={[
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
  ]}
  multiSelect={false} // Set to true for multi-select
/>
```

## Complete Example

Here's a complete example with search, filters, and actions:

```tsx
import type { Route } from './+types/index';
import {
  ClientDataTable,
  ClientDataTableProvider,
  ClientDataTableSearch,
  ClientDataTableFacetFilter,
  createAdvancedSearch,
  useClientDataTableQuery,
} from '@datum-ui/client-data-table';
import { createColumnHelper } from '@tanstack/react-table';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: 'active' | 'inactive' | 'pending';
}

interface UserList {
  items: User[];
}

const columnHelper = createColumnHelper<User>();

const columns = [
  columnHelper.accessor('email', {
    header: 'Email',
  }),
  columnHelper.accessor('firstName', {
    header: 'First Name',
  }),
  columnHelper.accessor('lastName', {
    header: 'Last Name',
  }),
  columnHelper.accessor('status', {
    header: 'Status',
  }),
];

export default function UsersPage() {
  const tableState = useClientDataTableQuery<UserList>({
    queryKeyPrefix: 'users',
    fetchFn: fetchAllUsers, // Returns all users
    useSorting: true,
    useSearch: true,
    useFilters: true,
  });

  return (
    <ClientDataTableProvider<User, UserList>
      columns={columns}
      transform={(data) => data?.items || []}
      filterFn={(row, filters) => {
        if (filters.status && row.status !== filters.status) {
          return false;
        }
        return true;
      }}
      globalFilterFn={createAdvancedSearch<User>(
        [
          (row) => row.email?.toLowerCase() || '',
          (row) => row.firstName?.toLowerCase() || '',
          (row) => row.lastName?.toLowerCase() || '',
        ],
        [(row) => `${row.firstName} ${row.lastName}`.trim().toLowerCase()]
      )}
      {...tableState}>
      <div className="m-4 flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <ClientDataTableSearch placeholder="Search users..." />
          <ClientDataTableFacetFilter
            filterKey="status"
            label="Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'pending', label: 'Pending' },
            ]}
          />
        </div>
        <ClientDataTable<User> />
      </div>
    </ClientDataTableProvider>
  );
}
```

## API Reference

### `useClientDataTableQuery`

Main hook for managing client-side table state.

```tsx
const tableState = useClientDataTableQuery<TQuery>({
  queryKeyPrefix: string,
  fetchFn: () => Promise<TQuery>,
  initialPageSize?: number, // Default: 20
  useSorting?: boolean, // Default: true
  useSearch?: boolean, // Default: false
  useFilters?: boolean, // Default: false
  filterConfig?: FilterConfig, // Optional filter configuration
  enabled?: boolean, // Default: true
  namespace?: string, // Optional namespace for URL params
});
```

**Returns:**

- `query`: React Query result
- `pageSize`: Current page size
- `pageIndex`: Current page index (0-based)
- `sorting`: Current sorting state
- `filters`: Current filter values
- `search`: Current search term
- `setPageSize`: Function to set page size
- `setPageIndex`: Function to set page index
- `setSorting`: Function to set sorting
- `setFilter`: Function to set a single filter
- `setFilters`: Function to set multiple filters
- `clearFilter`: Function to clear a single filter
- `clearAllFilters`: Function to clear all filters
- `setSearch`: Function to set search term
- `clearSearch`: Function to clear search term

### `ClientDataTableProvider`

Provider component that wraps the table and manages table state.

**Props:**

- `columns`: Column definitions
- `query`: React Query result
- `transform`: Function to transform query data to array
- `filterFn`: Custom filter function `(row, filters) => boolean`
- `globalFilterFn`: Custom search function (TanStack Table FilterFn)
- `selectable`: Enable row selection (default: false)
- `actions`: Array of action items
- `actionsLoading`: Loading state for actions
- `getRowId`: Custom row ID function

### `ClientDataTable`

Main table component.

**Props:**

- `actionBar`: Optional action bar for selected rows
- `emptyMessage`: Custom empty message

### `ClientDataTableSearch`

Search input component.

**Props:**

- `placeholder`: Search placeholder text

### `ClientDataTableFacetFilter`

Facet filter dropdown component.

**Props:**

- `filterKey`: Filter key name
- `label`: Filter label
- `placeholder`: Placeholder text
- `options`: Array of filter options
- `multiSelect`: Enable multi-select (default: false)
- `clearLabel`: Clear button label
- `menuItems`: Additional menu items
- `className`: Additional CSS classes

### `ClientDataTablePagination`

Pagination component (automatically included in `ClientDataTable`).

## URL State Management

All table state is automatically synced with URL parameters:

- `pageSize`: Page size (e.g., `?pageSize=20`)
- `pageIndex`: Current page (1-indexed in URL, e.g., `?pageIndex=1`)
- `sort`: Sorting state (e.g., `?sort=name:asc`)
- `filters`: Filter values (JSON stringified, e.g., `?filters={"status":"active"}`)
- `search`: Search term (e.g., `?search=john`)

The URL state is managed using the `nuqs` library and is automatically restored on page load.

## Best Practices

1. **Use search utilities**: Leverage `createAdvancedSearch` for multi-field search
2. **Keep filter logic simple**: Use `filterFn` for straightforward AND logic
3. **Transform data properly**: Ensure `transform` returns a flat array
4. **Handle loading states**: The query provides `isLoading` and `isError` states
5. **Optimize for size**: Only use client-side tables for manageable datasets
6. **Use URL state**: All state is in URL, so users can bookmark/share filtered views

## Migration from Server-Side Data Table

If you're migrating from server-side to client-side:

**Before (Server-Side):**

```tsx
const tableState = useDataTableQuery<ResponseType>({
  queryKeyPrefix: ['data'],
  fetchFn: (args) => apiCall(args), // Receives limit, cursor, filters
  useSorting: true,
});

<DataTableProvider
  transform={(data) => ({
    rows: data?.items || [],
    cursor: data?.cursor,
  })}
  {...tableState}>
  <DataTable />
</DataTableProvider>;
```

**After (Client-Side):**

```tsx
const tableState = useClientDataTableQuery<ResponseType>({
  queryKeyPrefix: 'data',
  fetchFn: () => apiCall(), // No args - fetches all data
  useSorting: true,
  useSearch: true,
  useFilters: true,
});

<ClientDataTableProvider
  transform={(data) => data?.items || []} // Just return array
  {...tableState}>
  <ClientDataTableSearch />
  <ClientDataTable />
</ClientDataTableProvider>;
```

## Troubleshooting

### Data not showing

- Check that `transform` returns an array
- Verify `fetchFn` returns data in expected format
- Check browser console for errors

### Search not working

- Ensure `useSearch: true` is set
- Verify `globalFilterFn` is correctly implemented
- Check that search fields are accessible in your data structure

### Filters not working

- Ensure `useFilters: true` is set
- Verify `filterFn` handles all filter keys
- Check that filter values match your data

### Performance issues

- Consider reducing dataset size
- Use server-side table for large datasets (>10k rows)
- Optimize `filterFn` and `globalFilterFn` logic
