# Data Table Filtering System

This document describes the unified filtering system for data tables that supports any type of filters without needing to create new hooks for each filter type.

## Overview

The filtering system is built into the `useDataTableQuery` hook and provides:

- ✅ **Flexible**: Support for any type of filter (date ranges, text search, numbers, selects, etc.)
- ✅ **URL-based**: All filters are persisted in URL parameters
- ✅ **Type-safe**: Full TypeScript support
- ✅ **Backward compatible**: Existing tables continue to work
- ✅ **Reusable**: Predefined filter configurations for common use cases
- ✅ **Modern Design**: Actions column fixed on scroll for better UX

## Design Features

### Actions Column

The data table now features a **dedicated actions column** positioned at the right end of the table that:

- **Stays fixed** during horizontal scrolling for easy access
- **Combines row selection** and **row actions** in one column
- **Maintains clean separation** from content columns
- **Provides consistent positioning** across all table states

The actions column includes:

- Row selection checkboxes (when `selectable={true}`)
- Action dropdown menus with customizable actions
- **Loading states** for async actions
- Proper accessibility support
- Responsive design for mobile devices

## Basic Usage

### 1. Enable Filters and Search

```tsx
const tableState = useDataTableQuery<YourResponseType>({
  queryKeyPrefix: ['your', 'data'],
  fetchFn: (args) => yourApiCall(args),
  useFilters: true, // Enable the filtering system
  useSearch: true, // Enable the search system
  filterConfig: {
    // Define your filter configuration here
  },
});
```

### 2. Use in DataTableProvider

```tsx
<DataTableProvider<YourDataType, YourResponseType>
  columns={columns}
  transform={(data) => ({
    rows: data?.items || [],
    cursor: data?.nextCursor,
  })}
  {...tableState}>
  <DataTable<YourDataType> />
</DataTableProvider>
```

### 3. Access Filter and Search Functions

```tsx
// Set a single filter
tableState.setFilter('status', 'active');

// Set multiple filters at once
tableState.setFilters({
  status: 'active',
  age: 25,
});

// Set search term
tableState.setSearch('john');

// Clear a specific filter
tableState.clearFilter('status');

// Clear search
tableState.clearSearch();

// Clear all filters
tableState.clearAllFilters();
```

### 4. Display Active Filters

The `DataTableActiveFilters` component provides a visual representation of all active filters with hierarchical controls for clearing them.

#### Features

- **Hierarchical Filter Display**: Shows filter groups with individual items
- **Three-Level Clearing**:
  - **Per Item**: Remove individual items from multi-value filters
  - **Per Filter Group**: Clear all items in a specific filter category
  - **Clear All**: Remove all active filters at once
- **Smart Visibility**:
  - Group clear button (X) only shows when there are 2+ items in that group
  - Clear all button (trash icon) only shows when there are 3+ filter groups
- **Custom Formatting**: Format filter values and labels for better UX
- **Search Integration**: Displays active search queries

#### Basic Usage

```tsx
import {
  DataTableActiveFilters,
  DataTableProvider,
  DataTable,
  useDataTableQuery,
} from '@datum-ui/data-table';

export default function MyDataTable() {
  const tableState = useDataTableQuery<MyResponseType>({
    queryKeyPrefix: ['my', 'data'],
    fetchFn: (args) => myApiCall(args),
    useFilters: true,
    useSearch: true,
  });

  return (
    <DataTableProvider<MyDataType, MyResponseType>
      columns={columns}
      transform={(data) => ({
        rows: data?.items || [],
        cursor: data?.nextCursor,
      })}
      {...tableState}>
      <div className="m-4 flex flex-col gap-2">
        {/* Filter controls */}
        <div className="flex items-center gap-4">{/* Your filter inputs here */}</div>

        {/* Active filters display */}
        <DataTableActiveFilters
          filters={tableState.filters}
          filterConfig={filterConfig}
          search={tableState.search}
          onClearFilter={tableState.clearFilter}
          onClearAllFilters={tableState.clearAllFilters}
          onClearSearch={tableState.clearSearch}
        />

        <DataTable<MyDataType> />
      </div>
    </DataTableProvider>
  );
}
```

#### Multi-Value Filters

For filters that contain multiple values (e.g., comma-separated actions), you can display individual items:

```tsx
<DataTableActiveFilters
  filters={tableState.filters}
  filterConfig={filterConfig}
  search={tableState.search}
  onClearFilter={tableState.clearFilter}
  onClearAllFilters={tableState.clearAllFilters}
  onClearSearch={tableState.clearSearch}
  // Enable multi-value filter display
  multiValueFilters={['actions', 'tags']}
  // Format individual items
  formatFilterItem={(filterKey, itemValue) => {
    if (filterKey === 'actions') {
      const labels: Record<string, string> = {
        get: 'Get',
        list: 'List',
        create: 'Create',
        update: 'Update',
        delete: 'Delete',
      };
      return labels[itemValue] || itemValue;
    }
    return itemValue;
  }}
  // Handle individual item removal
  onClearFilterItem={(filterKey, itemValue) => {
    if (filterKey === 'actions') {
      const current =
        (tableState.filters.actions as string | undefined)?.split(',').filter(Boolean) || [];
      const remaining = current.filter((action) => action.trim() !== itemValue);
      if (remaining.length > 0) {
        tableState.setFilter('actions', remaining.join(','));
      } else {
        tableState.clearFilter('actions');
      }
    }
  }}
/>
```

#### Grouped Filters

Combine multiple filter keys into a single display group (e.g., date ranges):

```tsx
<DataTableActiveFilters
  filters={tableState.filters}
  filterConfig={filterConfig}
  onClearFilter={tableState.clearFilter}
  onClearAllFilters={tableState.clearAllFilters}
  // Group start and end into a single "Time range" filter
  filterGroups={{
    timeRange: ['start', 'end'],
  }}
  filterLabels={{
    timeRange: 'Time range',
  }}
  formatGroupedFilter={(groupKey, values) => {
    if (groupKey === 'timeRange') {
      const start = values.start ? new Date(values.start) : null;
      const end = values.end ? new Date(values.end) : null;
      if (start && end) {
        return `${format(start, 'MMM dd, yyyy')} - ${format(end, 'MMM dd, yyyy')}`;
      }
    }
    return null;
  }}
/>
```

#### Custom Formatting

Customize how filter values are displayed:

```tsx
<DataTableActiveFilters
  filters={tableState.filters}
  filterConfig={filterConfig}
  onClearFilter={tableState.clearFilter}
  onClearAllFilters={tableState.clearAllFilters}
  // Custom labels for filter keys
  filterLabels={{
    status: 'Status',
    category: 'Category',
    actions: 'Actions',
  }}
  // Custom formatter for filter values
  formatFilterValue={(key, value) => {
    if (key === 'status') {
      const statusLabels: Record<string, string> = {
        active: 'Active',
        inactive: 'Inactive',
        pending: 'Pending',
      };
      return statusLabels[value] || value;
    }
    return String(value);
  }}
/>
```

#### Excluding Filters from Display

You can exclude specific filters or filter groups from being displayed in the active filters section:

```tsx
<DataTableActiveFilters
  filters={tableState.filters}
  filterConfig={filterConfig}
  search={tableState.search}
  onClearFilter={tableState.clearFilter}
  onClearAllFilters={tableState.clearAllFilters}
  onClearSearch={tableState.clearSearch}
  filterGroups={{
    timeRange: ['start', 'end'],
  }}
  // Exclude search and timeRange from active filters display
  excludeFilters={['search', 'timeRange']}
/>
```

The `excludeFilters` prop accepts an array of:

- Filter keys (e.g., `'search'`, `'status'`) - excludes individual filters
- Filter group keys (e.g., `'timeRange'`) - excludes the entire group and all its keys

**Note**: When excluding a filter group, all keys in that group are automatically excluded from individual display as well.

#### Props Reference

| Prop                  | Type                                                                           | Required | Description                                                |
| --------------------- | ------------------------------------------------------------------------------ | -------- | ---------------------------------------------------------- |
| `filters`             | `FilterValue`                                                                  | Yes      | Current filter values from `tableState.filters`            |
| `filterConfig`        | `FilterConfig`                                                                 | No       | Filter configuration to determine default values           |
| `search`              | `string`                                                                       | No       | Current search query from `tableState.search`              |
| `onClearFilter`       | `(key: string) => void`                                                        | Yes      | Callback to clear a specific filter                        |
| `onClearAllFilters`   | `() => void`                                                                   | Yes      | Callback to clear all filters                              |
| `onClearSearch`       | `() => void`                                                                   | No       | Callback to clear search query                             |
| `filterLabels`        | `Record<string, string>`                                                       | No       | Custom labels for filter keys                              |
| `filterGroups`        | `Record<string, string[]>`                                                     | No       | Group multiple filter keys together                        |
| `formatGroupedFilter` | `(groupKey: string, values: Record<string, any>) => string \| React.ReactNode` | No       | Custom formatter for grouped filters                       |
| `formatFilterValue`   | `(key: string, value: any) => string \| React.ReactNode`                       | No       | Custom formatter for individual filter values              |
| `multiValueFilters`   | `string[]`                                                                     | No       | Filter keys that should display individual items           |
| `formatFilterItem`    | `(filterKey: string, itemValue: string) => string`                             | No       | Formatter for individual items in multi-value filters      |
| `onClearFilterItem`   | `(filterKey: string, itemValue: string) => void`                               | No       | Callback to remove individual item from multi-value filter |
| `excludeFilters`      | `string[]`                                                                     | No       | Filter keys or group keys to exclude from display          |
| `className`           | `string`                                                                       | No       | Additional CSS classes                                     |

#### Visual Structure

The component displays filters in a hierarchical structure:

```
Selected Filters  [Filter Group 1] [Item 1 (x)] [Item 2 (x)] [X]  [Filter Group 2] [Value (x)]  [🗑️]
                  └─ Label         └─ Items     └─ Clear     └─ Single value    └─ Clear All
```

- **Filter Group**: Bordered container with filter label
- **Individual Items**: Badges for each item in multi-value filters
- **Clear Group (X)**: Only visible when group has 2+ items
- **Clear All (🗑️)**: Only visible when 3+ filter groups are active

### 5. Action Loading States

Actions support loading states for async operations. The loading state is shown on the trigger button (not in the menu):

```tsx
const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

const actions: ActionItem<Contact>[] = [
  {
    label: 'Edit',
    icon: EditIcon,
    onClick: async (row) => {
      setLoadingStates((prev) => ({ ...prev, [row.id]: true }));
      try {
        await editContact(row.id);
        navigate(`/edit/${row.id}`);
      } finally {
        setLoadingStates((prev) => ({ ...prev, [row.id]: false }));
      }
    },
  },
  {
    label: 'Delete',
    icon: Trash2Icon,
    variant: 'destructive',
    onClick: async (row) => {
      setLoadingStates((prev) => ({ ...prev, [`delete-${row.id}`]: true }));
      try {
        await deleteContact(row.id);
        // Refresh table or remove from list
      } finally {
        setLoadingStates((prev) => ({ ...prev, [`delete-${row.id}`]: false }));
      }
    },
  },
];

// Use in DataTableProvider
<DataTableProvider<Contact, ContactListResponse>
  {...tableState}
  actions={actions}
  actionsLoading={(row) => loadingStates[row.id] || loadingStates[`delete-${row.id}`] || false}
  columns={columns}
  transform={(data) => ({
    rows: data?.data?.items || [],
    cursor: data?.data?.metadata?.continue,
  })}>
  <DataTable />
</DataTableProvider>;
```

## Predefined Filter Configurations

The system includes predefined configurations for common filter types:

### Date Range Filter

```tsx
import { filterConfigs } from '@/modules/data-table';

const tableState = useDataTableQuery<YourResponseType>({
  queryKeyPrefix: ['your', 'data'],
  fetchFn: (args) => yourApiCall(args),
  useFilters: true,
  filterConfig: filterConfigs.dateRange, // { start: number, end: number } (nanoseconds)
});

// In your component, convert between Date objects and nanoseconds:
<DateTimeRangePicker
  value={{
    from: tableState.filters.start ? new Date(tableState.filters.start / 1000000) : undefined,
    to: tableState.filters.end ? new Date(tableState.filters.end / 1000000) : undefined,
  }}
  onValueChange={(range) => {
    const filters = {};
    if (range?.from) filters.start = range.from.getTime() * 1000000;
    if (range?.to) filters.end = range.to.getTime() * 1000000;
    tableState.setFilters(filters);
  }}
/>;
```

The `dateRange` configuration stores nanosecond Unix timestamps directly in the URL for optimal compatibility with Loki API requirements. Components handle the conversion to/from Date objects as needed.

### Search Filter

```tsx
const tableState = useDataTableQuery<YourResponseType>({
  queryKeyPrefix: ['your', 'data'],
  fetchFn: (args) => yourApiCall(args),
  useSearch: true, // Enable search functionality
});
```

The search functionality provides:

- `search`: String value for the search term
- `setSearch`: Function to update the search term
- `clearSearch`: Function to clear the search term

Search is stored as a separate URL parameter (`?search=term`) for better UX and bookmarking. For debounced search, implement the debounce logic in your component:

```tsx
// Example: Debounced search implementation
const [searchInput, setSearchInput] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    tableState.setSearch?.(searchInput);
  }, 300);

  return () => clearTimeout(timer);
}, [searchInput, tableState.setSearch]);

<Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />;
```

### Number Range Filter

```tsx
const tableState = useDataTableQuery<YourResponseType>({
  queryKeyPrefix: ['your', 'data'],
  fetchFn: (args) => yourApiCall(args),
  useFilters: true,
  filterConfig: filterConfigs.numberRange, // { min: number, max: number }
});
```

### Multi-Select Filter

```tsx
const tableState = useDataTableQuery<YourResponseType>({
  queryKeyPrefix: ['your', 'data'],
  fetchFn: (args) => yourApiCall(args),
  useFilters: true,
  filterConfig: filterConfigs.multiSelect, // { values: string[] }
});
```

### Single Select Filter

```tsx
const tableState = useDataTableQuery<YourResponseType>({
  queryKeyPrefix: ['your', 'data'],
  fetchFn: (args) => yourApiCall(args),
  useFilters: true,
  filterConfig: filterConfigs.select, // { value: string }
});
```

### Boolean Filter

```tsx
const tableState = useDataTableQuery<YourResponseType>({
  queryKeyPrefix: ['your', 'data'],
  fetchFn: (args) => yourApiCall(args),
  useFilters: true,
  filterConfig: filterConfigs.boolean, // { value: boolean }
});
```

## Custom Filter Configurations

You can create custom filter configurations for your specific needs:

```tsx
const customFilterConfig = {
  // Date range with custom parsing
  dateRange: {
    start: {
      parser: (value: any) => new Date(parseInt(value, 10) * 1000),
      serializer: (value: Date) => Math.floor(value.getTime() / 1000).toString(),
    },
    end: {
      parser: (value: any) => new Date(parseInt(value, 10) * 1000),
      serializer: (value: Date) => Math.floor(value.getTime() / 1000).toString(),
    },
  },

  // Custom enum filter
  status: {
    parser: (value: any) => value as 'active' | 'inactive' | 'pending',
    serializer: (value: string) => value,
    defaultValue: 'active',
  },

  // Custom number filter with validation
  age: {
    parser: (value: any) => {
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    },
    serializer: (value: number) => value,
  },
};

const tableState = useDataTableQuery<YourResponseType>({
  queryKeyPrefix: ['your', 'data'],
  fetchFn: (args) => yourApiCall(args),
  useFilters: true,
  filterConfig: customFilterConfig,
});
```

## Filter Configuration Options

Each filter key can have the following configuration:

```tsx
{
  filterKey: {
    parser?: (value: any) => any;        // Parse URL value to actual value
    serializer?: (value: any) => any;    // Serialize actual value to URL value
    defaultValue?: any;                  // Default value when filter is not set
  }
}
```

### Parser Function

Converts the raw value from the URL to the actual value used in your application.

### Serializer Function

Converts the actual value to a format that can be stored in the URL.

### Default Value

The value to use when the filter is not set in the URL.

## API Integration

The filters are passed to your `fetchFn` in the `args.filters` object, which extends the standard `ListQueryParams`:

```tsx
const fetchFn = (args: FetchArgs) => {
  // args.filters contains all your filter values
  const { start, end, status } = args.filters || {};
  // args.search contains the search term
  const { search } = args;

  return apiCall({
    limit: args.limit,
    cursor: args.cursor,
    sorting: args.sorting,
    // Pass filters to your API (already in Unix timestamp format)
    start: start,
    end: end,
    status,
    // Pass search term
    search,
  });
};
```

The `FetchArgs` interface extends `ListQueryParams`, so it includes:

- `limit?: number`
- `cursor?: string`
- `filters?: Record<string, any>`
- `sorting?: SortingState` (additional from data table)

## Complete Example

Here's a complete example showing how to implement a data table with date range and search filters:

```tsx
import { DateTimeRangePicker } from '@/components/date-time-range-picker';
import {
  useDataTableQuery,
  DataTableProvider,
  DataTable,
  filterConfigs,
} from '@/modules/data-table';
import { Input } from '@/modules/shadcn/ui/input';

export default function MyDataTable() {
  const tableState = useDataTableQuery<MyResponseType>({
    queryKeyPrefix: ['my', 'data'],
    fetchFn: (args) => myApiCall(args),
    useSorting: true,
    useFilters: true,
    filterConfig: {
      ...filterConfigs.dateRange,
      search: filterConfigs.search,
    },
  });

  return (
    <DataTableProvider<MyDataType, MyResponseType>
      columns={columns}
      transform={(data) => ({
        rows: data?.items || [],
        cursor: data?.nextCursor,
      })}
      {...tableState}>
      <div className="m-4 flex flex-col gap-4">
        {/* Filter UI */}
        <div className="flex items-center gap-4">
          <Input
            placeholder="Search..."
            value={tableState.search || ''}
            onChange={(e) => tableState.setSearch?.(e.target.value)}
          />
          <DateTimeRangePicker
            value={
              tableState.filters.start || tableState.filters.end
                ? {
                    from: tableState.filters.start,
                    to: tableState.filters.end,
                  }
                : undefined
            }
            onValueChange={(range) => {
              if (range) {
                const filters: Record<string, any> = {};
                if (range.from) filters.start = range.from;
                if (range.to) filters.end = range.to;
                tableState.setFilters(filters);
              } else {
                tableState.clearAllFilters();
              }
            }}
            placeholder="Filter by date range"
          />
          <button onClick={tableState.clearAllFilters}>Clear All Filters</button>
          <button onClick={tableState.clearSearch}>Clear Search</button>
        </div>

        {/* Data Table */}
        <DataTable<MyDataType> />
      </div>
    </DataTableProvider>
  );
}
```

## Migration from Global Filter

If you were previously using `useGlobalFilter`, you can easily migrate:

**Before:**

```tsx
const tableState = useDataTableQuery<YourResponseType>({
  queryKeyPrefix: ['your', 'data'],
  fetchFn: (args) => yourApiCall(args),
  useGlobalFilter: true,
});
```

**After:**

```tsx
const tableState = useDataTableQuery<YourResponseType>({
  queryKeyPrefix: ['your', 'data'],
  fetchFn: (args) => yourApiCall(args),
  useFilters: true,
  filterConfig: filterConfigs.search,
});
```

The `globalFilter` value is now available as `tableState.filters.value`.

## Best Practices

1. **Use predefined configs**: Leverage `filterConfigs` for common filter types
2. **Type your filters**: Define proper TypeScript types for your filter values
3. **Handle defaults**: Use `defaultValue` for filters that should have a default state
4. **Validate in parsers**: Add validation logic in your parser functions
5. **Clear filters**: Provide UI for users to clear individual or all filters
6. **URL persistence**: Filters are automatically persisted in the URL for bookmarking and sharing

## Troubleshooting

### Filter not updating

- Ensure `useFilters: true` is set
- Check that your filter key exists in `filterConfig`
- Verify your parser function handles the value correctly

### URL getting too long

- Consider using shorter filter keys
- Use efficient serialization (e.g., timestamps instead of full ISO strings)
- Limit the number of active filters

### Type errors

- Ensure your filter configuration matches the expected types
- Use proper TypeScript generics for your data types
- Check that parser/serializer functions return the correct types
