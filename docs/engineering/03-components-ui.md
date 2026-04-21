# Component and UI Patterns

## UI Layers in This Project

The app uses three main UI layers together:

1. `@datum-cloud/datum-ui` (package) for product-consistent components
2. Local shadcn primitives in `app/modules/shadcn/**`
3. App-local extended UI in `app/modules/datum-ui/**` (`@datum-ui/*` alias)

Use the layer that best matches the use-case:

- Product-standard component already exists in package -> use `@datum-cloud/datum-ui/...`
- Need primitive composition or Radix behavior -> use local shadcn components
- Need app-specific rich wrappers (form/data-table/editor) -> use `@datum-ui/*`

## Component Placement Rules

### `app/components/**`

Put here when:

- reused across multiple features/routes
- tied to shell/layout/navigation
- not strongly tied to one domain

### `app/features/<feature>/components/**`

Put here when:

- component is domain-specific
- used primarily by one feature area
- feature hooks/actions live nearby

### `app/modules/**`

Put here when:

- it is a foundation primitive/provider/util
- it supports many domains and should stay framework-level

## Styling and Class Strategy

- Tailwind v4 from `app/styles/root.css`
- `cn()` from `@/modules/shadcn/lib/utils` for class merging
- CVA-style variants for reusable component variants
- Theme uses `ThemeProvider` and `ThemeScript`
- Prefer `@datum-cloud/datum-ui/typography` for text styles and headings
- Prefer `@datum-cloud/datum-ui/grid` (`Row`/`Col`) for responsive layout grids when practical

Avoid inline ad-hoc variant systems when an existing variant component already exists.

Practical guidance:

- Keep utility classes for spacing/flex/truncation and one-off behavior.
- Use design-system primitives for repeatable visual patterns (typography, grid).
- Do not force `Row`/`Col` into component-internal special grids (for example, tab-list internals or custom template grids) unless behavior is preserved.

## Form Pattern

For non-trivial forms, favor `@datum-ui/form`:

- central field rendering and validation integration
- consistent submit and field handling
- reduces repeated field boilerplate in route files

Keep route files as orchestrators and move form internals to feature components.

## Data Table Pattern

For complex list screens, follow `@datum-cloud/datum-ui/data-table` and TanStack pattern:

- query params/state management
- pagination/cursor behavior
- error handling integration (including expired cursor handling)

Prefer shared table utilities over custom one-off table logic.

## Suggested "new component" checklist

1. Decide scope: global component vs feature component.
2. Pick base layer (`datum-ui` package, local shadcn, or local `@datum-ui` module).
3. Use `cn` and existing variants for class composition.
4. Keep API/data concerns outside presentational components.
5. Export from feature/index barrel when reused.
