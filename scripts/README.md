# OpenAPI TypeScript Generator

This setup uses `@hey-api/openapi-ts` to automatically generate TypeScript types, Zod schemas, and Axios clients from OpenAPI specifications.

## Setup

1. Set your API token as an environment variable (just the token, without "Bearer " prefix):

   ```bash
   export API_TOKEN="your-bearer-token-here"
   ```

   Note: The scripts automatically add the "Bearer " prefix to the token, so only provide the token itself.

2. Optionally set `API_URL` if different from default:

   ```bash
   export API_URL="https://api.staging.env.datum.net"
   ```

## Usage

### 1. List Available Resources

List all available OpenAPI resources from the API server:

```bash
bun run openapi:list
```

This will:

- Fetch the root OpenAPI spec from `${API_URL}/openapi/v3`
- Display all available API resources
- Save the list to `openapi-resources.json`

### 2. Generate TypeScript for Resources

Generate TypeScript types, Zod schemas, and Axios clients for specific API resources:

```bash
bun run openapi:generate -- --resources networking.datumapis.com/v1alpha --name networking
```

**Options:**

- `--resources` - One or more API resources to generate (required)
- `--name` - Name for the API group (e.g., "networking"). If not provided, extracted from resource name
- `--api-url` - API URL (default: from `API_URL` env var or `https://api.staging.env.datum.net`)
- `--token` - API token (default: from `API_TOKEN` env var)
- `--output-dir` - Output directory (default: `./app/resources/generated`)
- `--keep-shared` - Keep existing shared core/client instead of replacing with latest

**Examples:**

```bash
# Single resource
bun run openapi:generate -- --resources networking.datumapis.com/v1alpha --name networking

# Multiple resources
bun run openapi:generate -- --resources networking.datumapis.com/v1alpha notification.miloapis.com/v1alpha1 --name networking notification

# Keep existing shared core/client
bun run openapi:generate -- --resources networking.datumapis.com/v1alpha --name networking --keep-shared
```

### 3. Use Generated Code

The generated code will be in `app/resources/generated/`:

**Simple API (Recommended):**

```typescript
import { networking } from '@/resources/generated';

// Client-side (default) - uses /api/internal
const proxies = await networking.listNetworkingDatumapisComV1AlphaHttpProxyForAllNamespaces();

// Server-side - uses env.API_URL (for server actions, API routes, etc.)
const serverProxies =
  await networking.server.listNetworkingDatumapisComV1AlphaHttpProxyForAllNamespaces();
```

**Direct SDK Functions (Alternative):**

```typescript
import { apiClient, apiServer } from '@/resources/generated/client';
import { listNetworkingDatumapisComV1AlphaNamespacedNetwork } from '@/resources/generated/networking.datumapis.com-v1alpha/sdk.gen';

// Client-side
const networks = await listNetworkingDatumapisComV1AlphaNamespacedNetwork({
  client: apiClient,
  path: { namespace: 'default' },
});

// Server-side
const serverNetworks = await listNetworkingDatumapisComV1AlphaNamespacedNetwork({
  client: apiServer,
  path: { namespace: 'default' },
});
```

## Generated Structure

```
app/resources/generated/
├── client.ts                     # Shared clients (apiClient, apiServer)
├── factory.ts                     # Smart factory (auto-generated)
├── index.ts                       # Unified exports (auto-generated)
├── _shared/                       # Shared core/client (used by all resources)
│   ├── core/                     # Core utilities
│   └── client/                   # Client implementation
└── {resource-name}/               # Generated code per resource
    ├── sdk.gen.ts                 # API functions - USE THESE
    ├── types.gen.ts               # TypeScript types
    ├── schemas.gen.ts             # JSON Schema
    └── transformers.gen.ts        # Data transformers
```

## Features

✅ **Smart Factory** - Default uses client axios, access server via `.server` property  
✅ **Auto-updates** - Factory and index files are automatically updated  
✅ **Shared Core/Client** - No duplication, all resources share the same core/client  
✅ **Type-safe** - Full TypeScript support with autocomplete  
✅ **Prettier** - Auto-formats generated files  
✅ **Client & Server** - Supports both client-side and server-side axios instances

## Migration from Manual Files

**Before:**

```typescript
export const contactListQuery = (params?: ListQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: '/apis/notification.miloapis.com/v1alpha1/contacts',
    params: { ... },
  })
    .output(ContactListResponseSchema)
    .execute();
};
```

**After:**

```typescript
import { notification } from '@/resources/generated';

export const contactListQuery = (params?: ListQueryParams) => {
  return notification.listNotificationMiloapisComV1Alpha1NamespacedContact({
    path: { namespace: 'default' },
    query: params,
  });
};
```

## Notes

- `factory.ts` and `index.ts` are auto-generated - don't edit manually
- `client.ts` is manual - you can edit it if needed
- All resources share the same client instance (no runtime duplication)
- Core/client files are duplicated on disk but identical (generator limitation)
- Tree-shaking removes unused code in production builds
