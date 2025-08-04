# Features Directory

This directory contains **feature-based components** that represent complete user workflows or business capabilities.

## Components vs Features: Rules of Thumb

### When to use `app/components/` (Generic Components)

Use the components directory for **reusable UI building blocks** that are:

- ✅ **Domain-agnostic** - Can be used across multiple features
- ✅ **Highly composable** - Accept props for customization
- ✅ **Focused on presentation** - Handle UI rendering and basic interactions
- ✅ **Stateless or minimal state** - Don't contain complex business logic

**Examples:**

- `Button`, `Input`, `DataTable`, `Badge`, `Tooltip`
- `DateRangePicker`, `Modal`, `Dropdown`
- Layout components like `Card`, `Container`

### When to use `app/features/` (Feature Components)

Use the features directory for **domain-specific functionality** that:

- ✅ **Represents a complete workflow** - Handles a specific business capability
- ✅ **Contains business logic** - API calls, data transformation, complex state
- ✅ **Is self-contained** - Has its own components, hooks, and utilities
- ✅ **Is feature-specific** - Won't be reused across different domains

**Examples:**

- `activity/` - Activity logging and monitoring
- `user-management/` - User CRUD operations
- `project-dashboard/` - Project-specific analytics
- `organization-settings/` - Organization configuration

## Feature Structure

Each feature should follow this structure:

```
app/features/
├── feature-name/
│   ├── components/          # Feature-specific components
│   │   ├── feature-list.tsx
│   │   ├── feature-form.tsx
│   │   └── feature-detail.tsx
│   ├── hooks/              # Feature-specific hooks
│   │   ├── use-feature-query.tsx
│   │   └── use-feature-mutation.tsx
│   ├── types/              # Feature-specific types
│   │   └── feature.types.ts
│   ├── utils/              # Feature-specific utilities
│   │   └── feature.utils.ts
│   └── index.ts            # Public API exports
```

## Migration Guidelines

### Moving from `components/` to `features/`

1. **Identify feature-specific components** that contain business logic
2. **Create the feature directory structure**
3. **Move the component** and rename it appropriately
4. **Extract feature-specific hooks and types**
5. **Update imports** throughout the codebase
6. **Create feature index file** for clean exports

### Example Migration

**Before:**

```
app/components/list/list-activity.tsx
```

**After:**

```
app/features/activity/
├── components/
│   └── activity-list.tsx
├── hooks/
│   └── use-activity-query.tsx
├── types/
│   └── activity.types.ts
└── index.ts
```

## Benefits

- **Better separation of concerns** - Business logic vs UI components
- **Improved maintainability** - Related code is co-located
- **Easier testing** - Feature-specific test suites
- **Better code splitting** - Features can be lazy-loaded
- **Clearer ownership** - Who owns what functionality

## Import Guidelines

### From other features:

```typescript
import { ActivityList } from '@/features/activity';
```

### From shared components:

```typescript
import { Button, DataTable } from '@/components';
```

### From modules:

```typescript
import { useQuery } from '@/modules/tanstack';
```

## Sharing Code Between Features

### When to Keep Code in Features

Keep code within a feature directory when it's:

- ✅ **Feature-specific logic** - Only relevant to that particular feature
- ✅ **Feature-specific state** - State management specific to the feature
- ✅ **Feature-specific UI behavior** - UI patterns unique to the feature
- ✅ **Feature-specific data transformation** - Data processing specific to the feature

**Examples:**

- Activity-specific API calls and data formatting
- User management specific form validation
- Project dashboard specific chart configurations

### When to Move Code to Modules

Move code to the `modules/` directory when it's:

- ✅ **Used by 2+ features** - Multiple features need the same functionality
- ✅ **Generic business logic** - Reusable patterns across different domains
- ✅ **Cross-cutting concerns** - Authentication, data fetching, form handling
- ✅ **Shared utilities** - Common data transformation, validation, or helper functions

**Examples:**

- Generic CRUD operations used by multiple features
- Shared authentication and authorization logic
- Common data table patterns
- Reusable form handling and validation

### Decision Framework

1. **Start with feature-specific code** in the feature directory
2. **Identify patterns** as you build more features
3. **Extract shared logic** to modules when you see repetition
4. **Keep feature-specific logic** in the feature directory

### Migration Strategy

1. **Build features first** - Focus on getting the feature working
2. **Look for patterns** - Identify common code across features
3. **Extract gradually** - Move shared code to modules incrementally
4. **Maintain boundaries** - Keep feature-specific code separate from shared code
