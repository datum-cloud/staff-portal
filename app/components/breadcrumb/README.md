# Flexible Breadcrumb Component

A flexible breadcrumb component that supports auto-generation from route matches and page-level custom breadcrumb definitions.

## Features

- **Auto-generation**: Automatically generates breadcrumbs from React Router matches
- **Page-level custom breadcrumbs**: Define custom breadcrumbs directly in your route files
- **Custom items**: Override auto-generation with custom breadcrumb items
- **Clickable/non-clickable**: Control whether each breadcrumb item is clickable
- **Custom links**: Use custom link components instead of standard navigation
- **Custom separators**: Customize the separator between breadcrumb items
- **Custom styling**: Apply custom CSS classes to breadcrumb items and containers
- **TypeScript support**: Full TypeScript support with proper type definitions

## Quick Start

### Basic Usage (Auto-generated breadcrumbs)

```tsx
import { Breadcrumb } from '@/components/breadcrumb';

function MyComponent() {
  return <Breadcrumb />;
}
```

This will automatically generate breadcrumbs based on your route matches and their `handle.breadcrumb` properties, **plus any custom breadcrumb configurations**.

## Page-Level Custom Breadcrumbs (Recommended)

The **preferred approach** is to define custom breadcrumbs directly in your route files. This keeps the breadcrumb logic close to the page it belongs to.

### How It Works

Add a `customBreadcrumb` property to your route's `handle`:

```tsx
// In your route file (e.g., app/routes/project/detail/layout.tsx)
import {
  createClickableBreadcrumbItem,
  createStaticBreadcrumbItem,
  type BreadcrumbItem,
} from '@/components/breadcrumb';
import { Project } from '@/resources/schemas';
import { orgRoutes } from '@/utils/config/routes.config';
import { Trans } from '@lingui/react/macro';

export const handle = {
  customBreadcrumb: {
    generateItems: (params: any, data: Project): BreadcrumbItem[] => {
      const organizationName = data?.spec?.ownerRef?.name;
      const projectName =
        data?.metadata?.annotations?.['kubernetes.io/description'] || data?.metadata?.name;

      return [
        createClickableBreadcrumbItem(<Trans>Customers</Trans>, '/customers'),
        createClickableBreadcrumbItem(organizationName, orgRoutes.detail(organizationName)),
        createClickableBreadcrumbItem(<Trans>Projects</Trans>, orgRoutes.project(organizationName)),
        createStaticBreadcrumbItem(projectName),
      ];
    },
    replace: true, // Replace auto-generated breadcrumbs
  },
};
```

## Examples

### Example 1: User Detail Page

**Result**: `Customers > Users > John Doe`

```tsx
// In app/routes/user/detail/layout.tsx
import {
  createClickableBreadcrumbItem,
  createStaticBreadcrumbItem,
  type BreadcrumbItem,
} from '@/components/breadcrumb';
import { User } from '@/resources/schemas';
import { Trans } from '@lingui/react/macro';

export const handle = {
  customBreadcrumb: {
    generateItems: (params: any, data: User): BreadcrumbItem[] => {
      const userName = `${data?.spec?.givenName} ${data?.spec?.familyName}`;

      return [
        createClickableBreadcrumbItem(<Trans>Customers</Trans>, '/customers'),
        createClickableBreadcrumbItem(<Trans>Users</Trans>, '/customers/users'),
        createStaticBreadcrumbItem(userName),
      ];
    },
    replace: true,
  },
};
```

### Example 2: Organization Detail Page

**Result**: `Customers > Acme Corporation`

```tsx
// In app/routes/organization/detail/layout.tsx
import {
  createClickableBreadcrumbItem,
  createStaticBreadcrumbItem,
  type BreadcrumbItem,
} from '@/components/breadcrumb';
import { Organization } from '@/resources/schemas';
import { Trans } from '@lingui/react/macro';

export const handle = {
  customBreadcrumb: {
    generateItems: (params: any, data: Organization): BreadcrumbItem[] => {
      const orgName =
        data?.metadata?.annotations?.['kubernetes.io/display-name'] || data?.metadata?.name;

      return [
        createClickableBreadcrumbItem(<Trans>Customers</Trans>, '/customers'),
        createStaticBreadcrumbItem(orgName),
      ];
    },
    replace: true,
  },
};
```

### Example 3: Organization Projects Page

**Result**: `Customers > Acme Corporation > Projects`

```tsx
// In app/routes/organization/detail/project.tsx
import {
  createClickableBreadcrumbItem,
  createStaticBreadcrumbItem,
  type BreadcrumbItem,
} from '@/components/breadcrumb';
import { Organization } from '@/resources/schemas';
import { orgRoutes } from '@/utils/config/routes.config';
import { Trans } from '@lingui/react/macro';

export const handle = {
  customBreadcrumb: {
    generateItems: (params: any, data: Organization): BreadcrumbItem[] => {
      const orgName =
        data?.metadata?.annotations?.['kubernetes.io/display-name'] || data?.metadata?.name;

      return [
        createClickableBreadcrumbItem(<Trans>Customers</Trans>, '/customers'),
        createClickableBreadcrumbItem(orgName, orgRoutes.detail(data.metadata.name)),
        createStaticBreadcrumbItem(<Trans>Projects</Trans>),
      ];
    },
    replace: true,
  },
};
```

### Example 4: Project with External Documentation Link

**Result**: `Customers > Acme Corporation > Projects > My Project > Documentation` (external link)

```tsx
// In app/routes/project/detail/docs.tsx
import {
  createClickableBreadcrumbItem,
  createStaticBreadcrumbItem,
  type BreadcrumbItem,
} from '@/components/breadcrumb';
import { Project } from '@/resources/schemas';
import { orgRoutes, projectRoutes } from '@/utils/config/routes.config';
import { Trans } from '@lingui/react/macro';

export const handle = {
  customBreadcrumb: {
    generateItems: (params: any, data: Project): BreadcrumbItem[] => {
      const organizationName = data?.spec?.ownerRef?.name;
      const projectName =
        data?.metadata?.annotations?.['kubernetes.io/description'] || data?.metadata?.name;

      return [
        createClickableBreadcrumbItem(<Trans>Customers</Trans>, '/customers'),
        createClickableBreadcrumbItem(organizationName, orgRoutes.detail(organizationName)),
        createClickableBreadcrumbItem(<Trans>Projects</Trans>, orgRoutes.project(organizationName)),
        createClickableBreadcrumbItem(projectName, projectRoutes.detail(data.metadata.name)),
        {
          label: <Trans>Documentation</Trans>,
          link: (
            <a
              href={`https://docs.example.com/projects/${data.metadata.name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600">
              <Trans>Documentation</Trans>
            </a>
          ),
        },
      ];
    },
    replace: true,
  },
};
```

### Example 5: Conditional Breadcrumb Based on Data

**Result**: `Customers > Acme Corporation > Enterprise Settings` (for enterprise orgs) or `Customers > Acme Corporation > Settings` (for regular orgs)

```tsx
// In app/routes/organization/detail/settings.tsx
import {
  createClickableBreadcrumbItem,
  createStaticBreadcrumbItem,
  type BreadcrumbItem,
} from '@/components/breadcrumb';
import { Organization } from '@/resources/schemas';
import { orgRoutes } from '@/utils/config/routes.config';
import { Trans } from '@lingui/react/macro';

export const handle = {
  customBreadcrumb: {
    generateItems: (params: any, data: Organization): BreadcrumbItem[] => {
      const orgName =
        data?.metadata?.annotations?.['kubernetes.io/display-name'] || data?.metadata?.name;

      const items = [
        createClickableBreadcrumbItem(<Trans>Customers</Trans>, '/customers'),
        createClickableBreadcrumbItem(orgName, orgRoutes.detail(data.metadata.name)),
      ];

      // Add conditional breadcrumb based on organization type
      if (data?.spec?.type === 'enterprise') {
        items.push(createStaticBreadcrumbItem(<Trans>Enterprise Settings</Trans>));
      } else {
        items.push(createStaticBreadcrumbItem(<Trans>Settings</Trans>));
      }

      return items;
    },
    replace: true,
  },
};
```

### Example 6: Project Activity Page

**Result**: `Customers > Projects > My Project > Activity`

```tsx
// In app/routes/project/detail/activity.tsx
import {
  createClickableBreadcrumbItem,
  createStaticBreadcrumbItem,
  type BreadcrumbItem,
} from '@/components/breadcrumb';
import { Project } from '@/resources/schemas';
import { projectRoutes } from '@/utils/config/routes.config';
import { Trans } from '@lingui/react/macro';

export const handle = {
  customBreadcrumb: {
    generateItems: (params: any, data: Project): BreadcrumbItem[] => {
      const projectName =
        data?.metadata?.annotations?.['kubernetes.io/description'] || data?.metadata?.name;

      return [
        createClickableBreadcrumbItem(<Trans>Customers</Trans>, '/customers'),
        createClickableBreadcrumbItem(<Trans>Projects</Trans>, '/customers/projects'),
        createClickableBreadcrumbItem(projectName, projectRoutes.detail(data.metadata.name)),
        createStaticBreadcrumbItem(<Trans>Activity</Trans>),
      ];
    },
    replace: true,
  },
};
```

## Configuration Options

| Property        | Type       | Description                                                   |
| --------------- | ---------- | ------------------------------------------------------------- |
| `generateItems` | `function` | Function that returns breadcrumb items                        |
| `replace`       | `boolean`  | Whether to replace auto-generated breadcrumbs (default: true) |

## Manual Custom Breadcrumbs

### Custom breadcrumb items

```tsx
import {
  Breadcrumb,
  createClickableBreadcrumbItem,
  createStaticBreadcrumbItem,
} from '@/components/breadcrumb';

function MyComponent() {
  const items = [
    createClickableBreadcrumbItem('Home', '/'),
    createClickableBreadcrumbItem('Users', '/users'),
    createStaticBreadcrumbItem('User Details'), // Non-clickable
  ];

  return <Breadcrumb items={items} autoGenerate={false} />;
}
```

### Custom links with external URLs

```tsx
const items = [
  createBreadcrumbItem('Home', {
    link: <a href="https://example.com">Home</a>,
  }),
  createBreadcrumbItem('Documentation', {
    link: (
      <a href="/docs" target="_blank">
        Documentation
      </a>
    ),
  }),
  createStaticBreadcrumbItem('Current Page'),
];
```

## API Reference

### Breadcrumb Component Props

| Prop             | Type               | Default            | Description                                             |
| ---------------- | ------------------ | ------------------ | ------------------------------------------------------- |
| `items`          | `BreadcrumbItem[]` | `undefined`        | Custom breadcrumb items (overrides auto-generation)     |
| `showSeparators` | `boolean`          | `true`             | Whether to show separators between items                |
| `separator`      | `React.ReactNode`  | `<ChevronRight />` | Custom separator component                              |
| `autoGenerate`   | `boolean`          | `true`             | Whether to auto-generate breadcrumbs from route matches |
| `className`      | `string`           | `undefined`        | Custom className for the breadcrumb container           |
| `listClassName`  | `string`           | `undefined`        | Custom className for the breadcrumb list                |

### BreadcrumbItem Interface

```tsx
interface BreadcrumbItem {
  /** The display text for the breadcrumb */
  label: React.ReactNode;
  /** The path to navigate to (optional - if not provided, item is not clickable) */
  path?: string;
  /** Custom link component (overrides path if provided) */
  link?: React.ReactNode;
  /** Whether this item is clickable (defaults to true if path is provided) */
  clickable?: boolean;
  /** Custom className for this breadcrumb item */
  className?: string;
  /** Additional data for the breadcrumb item */
  data?: any;
}
```

## Utility Functions

### createBreadcrumbItem

Create a basic breadcrumb item:

```tsx
import { createBreadcrumbItem } from '@/components/breadcrumb';

const item = createBreadcrumbItem('My Label', {
  path: '/my-path',
  clickable: true,
  className: 'custom-class',
});
```

### createClickableBreadcrumbItem

Create a clickable breadcrumb item with a path:

```tsx
import { createClickableBreadcrumbItem } from '@/components/breadcrumb';

const item = createClickableBreadcrumbItem('My Label', '/my-path', {
  className: 'custom-class',
});
```

### createStaticBreadcrumbItem

Create a non-clickable breadcrumb item:

```tsx
import { createStaticBreadcrumbItem } from '@/components/breadcrumb';

const item = createStaticBreadcrumbItem('My Label', {
  className: 'custom-class',
});
```

## Hooks

### useEnhancedBreadcrumbs

Get breadcrumbs that automatically include custom configurations:

```tsx
import { useEnhancedBreadcrumbs } from '@/components/breadcrumb';

function MyComponent() {
  const breadcrumbs = useEnhancedBreadcrumbs();
  // Returns custom breadcrumbs if available, otherwise auto-generated ones
}
```

### useCustomBreadcrumbs

Get only custom breadcrumbs (returns null if no custom breadcrumb is configured):

```tsx
import { useCustomBreadcrumbs } from '@/components/breadcrumb';

function MyComponent() {
  const customBreadcrumbs = useCustomBreadcrumbs();
  // Returns custom breadcrumbs or null
}
```

## Advanced Examples

### Custom styling

```tsx
<Breadcrumb
  items={items}
  className="rounded-lg bg-gray-100 p-4"
  listClassName="text-lg font-semibold"
  separator={<span className="mx-2 text-gray-400">/</span>}
/>
```

### Disable auto-generation

```tsx
<Breadcrumb items={customItems} autoGenerate={false} />
```

## Route Configuration

To use auto-generated breadcrumbs, ensure your routes have the `handle.breadcrumb` property:

### Simple Text (Clickable)

```tsx
export const handle = {
  breadcrumb: 'My Page',
};
```

### Function with Data (Clickable)

```tsx
export const handle = {
  breadcrumb: (data: MyDataType) => data.name,
};
```

### React Component (Clickable)

```tsx
export const handle = {
  breadcrumb: () => <Trans>My Page</Trans>,
};
```

### With Options (Recommended for Control)

```tsx
export const handle = {
  breadcrumb: () => ({
    label: <Trans>My Page</Trans>,
    clickable: false, // Make non-clickable
    className: 'text-blue-600', // Custom styling
  }),
};
```

### Available Options

| Option      | Type              | Default          | Description                            |
| ----------- | ----------------- | ---------------- | -------------------------------------- |
| `label`     | `React.ReactNode` | Required         | The breadcrumb text/label              |
| `clickable` | `boolean`         | `true`           | Whether the breadcrumb is clickable    |
| `className` | `string`          | `undefined`      | Custom CSS class for the breadcrumb    |
| `path`      | `string`          | `match.pathname` | Custom path (only used if clickable)   |
| `link`      | `React.ReactNode` | `undefined`      | Custom link component (overrides path) |

### Examples

#### Non-clickable breadcrumb

```tsx
export const handle = {
  breadcrumb: () => ({
    label: <Trans>Customers</Trans>,
    clickable: false,
  }),
};
```

#### Custom styled breadcrumb

```tsx
export const handle = {
  breadcrumb: () => ({
    label: <Trans>Important Page</Trans>,
    clickable: true,
    className: 'text-red-600 font-bold',
  }),
};
```

#### Custom link breadcrumb

```tsx
export const handle = {
  breadcrumb: () => ({
    label: <Trans>Documentation</Trans>,
    link: (
      <a href="https://docs.example.com" target="_blank" rel="noopener noreferrer">
        <Trans>Documentation</Trans>
      </a>
    ),
  }),
};
```

## Migration from Old System

The new breadcrumb system is backward compatible. Your existing route `handle.breadcrumb` properties will continue to work:

```tsx
// This still works
export const handle = {
  breadcrumb: () => <Trans>My Page</Trans>,
};
```

### Migration Paths

1. **For simple control** (like making non-clickable): Use the options approach
2. **For fully custom breadcrumbs**: Use `customBreadcrumb` property
3. **For one-off custom breadcrumbs**: Use manual `items` prop

## Best Practices

1. **Use page-level custom breadcrumbs** for routes that need custom breadcrumbs
2. **Keep route `handle.breadcrumb` properties** for simple cases
3. **Use manual `items` prop** for one-off custom breadcrumbs
4. **Test breadcrumb navigation** to ensure all links work correctly
5. **Use TypeScript** for better type safety when defining custom breadcrumbs
6. **Keep breadcrumb logic close to the page** it belongs to

## Final Result

With this system, you can easily create custom breadcrumbs like:

- **Project Detail**: `Customers > Acme Corporation > Projects > My Project`
- **User Detail**: `Customers > Users > John Doe`
- **Organization Settings**: `Customers > Acme Corporation > Enterprise Settings`
- **Project Docs**: `Customers > Acme Corporation > Projects > My Project > Documentation`

Each page defines its own breadcrumb logic, making it easy to maintain and understand what each page shows in its navigation hierarchy.
