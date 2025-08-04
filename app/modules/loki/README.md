# Loki Activity Logs Integration

This module provides integration with Loki for querying Milo API audit logs with enhanced filtering capabilities.

## Features

- **Single resource queries**: Query activity for a specific resource type and/or ID
- **Advanced filtering**: Filter by user, status, actions, response codes, API groups, namespaces, and source IPs
- **Flexible search**: Full-text search across all log fields
- **Legacy support**: Backward compatibility with existing project-based queries

## Query Examples

### 1. Query by Specific User

```typescript
// Basic user activity
const userActivity = await activityListQuery(undefined, undefined, {
  filters: {
    user: 'swells@datum.net',
    start: '2025-07-12T00:00:00Z',
    end: '2025-07-13T23:59:59Z',
  },
});

// User activity with specific actions
const userDeletions = await activityListQuery(
  {},
  {
    filters: {
      user: 'swells@datum.net',
      actions: 'delete',
      start: '2025-07-12T00:00:00Z',
      end: '2025-07-13T23:59:59Z',
    },
  }
);

// User activity by HTTP response code
const userErrors = await activityListQuery(
  {},
  {
    filters: {
      user: 'swells@datum.net',
      responseCode: '404',
      start: '2025-07-12T00:00:00Z',
      end: '2025-07-13T23:59:59Z',
    },
  }
);
```

### 2. Query by Specific Resource

```typescript
// All operations on a specific resource type
const httpproxyActivity = await activityListQuery(
  { resourceType: 'httpproxy' },
  {
    filters: {
      start: '2025-07-13T00:00:00Z',
      end: '2025-07-13T23:59:59Z',
    },
  }
);

// Operations on a specific resource instance
const specificHttpproxy = await activityListQuery(
  { resourceType: 'httpproxy', resourceId: 'acme-corp' },
  {
    filters: {
      start: '2025-07-13T00:00:00Z',
      end: '2025-07-13T23:59:59Z',
    },
  }
);

// Operations on a specific resource ID (any type)
const specificResource = await activityListQuery(
  { resourceId: 'acme-corp' },
  {
    filters: {
      start: '2025-07-13T00:00:00Z',
      end: '2025-07-13T23:59:59Z',
    },
  }
);
```

### 3. Query by Specific Project

```typescript
// All activity for a project (legacy approach)
const projectActivity = await activityListQuery(
  {},
  {
    filters: {
      project: 'my-test-project',
      start: '2025-07-13T00:00:00Z',
      end: '2025-07-13T23:59:59Z',
    },
  }
);

// Project activity by user
const projectUserActivity = await activityListQuery(
  {},
  {
    filters: {
      project: 'my-test-project',
      user: 'wells.scot@gmail.com',
      start: '2025-07-13T00:00:00Z',
      end: '2025-07-13T23:59:59Z',
    },
  }
);

// Project activity by resource type
const projectHttpproxyActivity = await activityListQuery(
  { resourceType: 'httpproxy' },
  {
    filters: {
      project: 'my-test-project',
      start: '2025-07-13T00:00:00Z',
      end: '2025-07-13T23:59:59Z',
    },
  }
);
```

### 4. Flexible Resource Filtering

```typescript
// Filter by resource type only
const httpproxyActivity = await activityListQuery(
  { resourceType: 'httpproxy' },
  {
    filters: {
      start: '2025-07-13T00:00:00Z',
      end: '2025-07-13T23:59:59Z',
    },
  }
);

// Filter by resource ID only
const specificResourceActivity = await activityListQuery(
  { resourceId: 'acme-corp' },
  {
    filters: {
      start: '2025-07-13T00:00:00Z',
      end: '2025-07-13T23:59:59Z',
    },
  }
);

// Filter by both type and ID
const specificHttpproxyActivity = await activityListQuery(
  { resourceType: 'httpproxy', resourceId: 'acme-corp' },
  {
    filters: {
      start: '2025-07-13T00:00:00Z',
      end: '2025-07-13T23:59:59Z',
    },
  }
);

// No resource filter (all resources)
const allActivity = await activityListQuery(
  {},
  {
    filters: {
      start: '2025-07-13T00:00:00Z',
      end: '2025-07-13T23:59:59Z',
    },
  }
);
```

### 5. Advanced Filtering Combinations

```typescript
// Complex query combining multiple filters
const complexQuery = await activityListQuery(
  { resourceType: 'httpproxy', resourceId: 'acme-corp' },
  {
    filters: {
      user: 'swells@datum.net',
      actions: 'create,update,delete',
      status: 'error',
      apiGroup: 'customers.datumapis.com',
      namespace: 'project-namespace',
      sourceIP: '192.168.1.100',
      start: '2025-07-13T00:00:00Z',
      end: '2025-07-13T23:59:59Z',
    },
  }
);
```

## Resource Filtering Options

The resource parameters support flexible filtering:

- **`resourceType` only** - Filter by resource type (e.g., all httpproxies)
- **`resourceId` only** - Filter by resource ID (e.g., all resources with ID 'acme-corp')
- **Both** - Filter by specific resource type and ID combination
- **Neither** - No resource filtering (all resources)

## Filter Options

### Basic Filters

- `user` - Filter by username
- `project` - Filter by project name (legacy)
- `status` - Filter by status ('success', 'error', or specific codes)
- `actions` - Filter by specific actions (comma-separated)

### Advanced Filters

- `responseCode` - Specific HTTP response code
- `apiGroup` - Specific API group
- `namespace` - Specific namespace
- `sourceIP` - Source IP address (supports regex)

### Time Filters

- `start` - Start time (ISO string or nanoseconds)
- `end` - End time (ISO string or nanoseconds)

### Search

- `q` - Full-text search across all fields
- `search` - Alternative search parameter

## LogQL Query Patterns

The module generates LogQL queries following these patterns:

```logql
# Basic query with JSON parsing and stage filtering
{telemetry_datumapis_com_audit_log="true"} | json | stage="ResponseComplete" | requestURI !~ ".*dryRun=All.*"

# Project filter
| annotations_resourcemanager_miloapis_com_project_name="project-name"

# Resource type filter
| objectRef_resource="httpproxy"

# Resource ID filter
| objectRef_name="acme-corp"

# Resource type and ID filter
| objectRef_resource="httpproxy" | objectRef_name="acme-corp"

# User filter
| user_username="swells@datum.net"

# Action filter (regex)
| verb=~"(?i)(create|update|delete)"

# Status filter
| responseStatus_code < 400

# Specific response code
| responseStatus_code = 404

# API group filter
| objectRef_apiGroup="customers.datumapis.com"

# Namespace filter
| objectRef_namespace="project-namespace"

# Source IP filter (regex)
| sourceIPs=~"192.168.1.100"
```

## API Usage

### Function Signature

```typescript
activityListQuery(
  resourceType?: string,
  resourceId?: string,
  params?: {
    limit?: number;
    search?: string;
    filters?: {
      start?: string;
      end?: string;
      user?: string;
      project?: string;
      status?: string;
      actions?: string;
      responseCode?: string;
      apiGroup?: string;
      namespace?: string;
      sourceIP?: string;
    };
  }
)
```

### Example Usage

```typescript
import { activityListQuery } from '@/resources/request/client';

// Query httpproxy activity
const activity = await activityListQuery('httpproxy', 'acme-corp', {
  filters: {
    user: 'swells@datum.net',
    actions: 'create,update,delete',
    status: 'error',
    start: '2025-07-13T00:00:00Z',
    end: '2025-07-13T23:59:59Z',
  },
});
```

## Best Practices

1. **Use appropriate time ranges**: Shorter ranges for debugging, longer ranges for trend analysis
2. **Add specific filters early**: More specific filters reduce data processing
3. **Use flexible resource filtering**: Filter by type, ID, or both as needed
4. **Leverage regex patterns**: For flexible pattern matching on string fields
5. **Combine filters effectively**: Use AND conditions for precise filtering
6. **Handle errors gracefully**: The module includes safe error handling for LogQL query failures
