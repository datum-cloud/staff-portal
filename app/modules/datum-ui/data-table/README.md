# Data Table Filtering System

This document describes the unified filtering system for data tables that supports any type of filters without needing to create new hooks for each filter type.

## Overview

The filtering system is built into the `useDataTableQuery` hook and provides:

- ✅ **Flexible**: Support for any type of filter (date ranges, text search, numbers, selects, etc.)
- ✅ **URL-based**: All filters are persisted in URL parameters
- ✅ **Type-safe**: Full TypeScript support
- ✅ **Backward compatible**: Existing tables continue to work
- ✅ **Reusable**: Predefined filter configurations for common use cases

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
