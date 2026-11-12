# Component and UI Patterns

## UI Layers in This Project

The app uses three UI layers together:

1. `@datum-cloud/datum-ui` (package) for primitives and extended UI, imported by subpath (`@datum-cloud/datum-ui/button`, `/form`, `/data-table`, `/code-editor`, `/toast`)
2. Shared app wrappers in `app/components/**`
3. Domain UI in `app/features/**`, including the shell and page templates in `app/features/milo`

There is no local shadcn setup and no `@datum-ui/*` alias. `tsconfig.json` defines only `@/*`, `@/tests/*` and `@openapi/*`.

Use the layer that best matches the use-case:

- Component already exists in the package -> use `@datum-cloud/datum-ui/...`
- App-specific wrapper reused across features -> `app/components/**`
- Page frame, list table or detail layout -> the templates exported from `@/features/milo` (`ListPage`, `DetailPage`, `PlainPage`, `ListTable`)
- A primitive is missing -> add it to the datum-ui package, not to this repo

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
- `cn()` from `@datum-cloud/datum-ui/utils` for class merging
- `tailwind-variants` (`tv`) for reusable component variants
- Theme uses `ThemeProvider` and `ThemeScript`
- Prefer `@datum-cloud/datum-ui/typography` for text styles and headings
- Prefer `@datum-cloud/datum-ui/grid` (`Row`/`Col`) for responsive layout grids when practical

Avoid inline ad-hoc variant systems when an existing variant component already exists.

Practical guidance:

- Keep utility classes for spacing/flex/truncation and one-off behavior.
- Use design-system primitives for repeatable visual patterns (typography, grid).
- Do not force `Row`/`Col` into component-internal special grids (for example, tab-list internals or custom template grids) unless behavior is preserved.

## Form Pattern

For non-trivial forms, favor `@datum-cloud/datum-ui/form`:

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
2. Pick base layer (`@datum-cloud/datum-ui` subpath, shared `app/components` wrapper, or feature component).
3. Use `cn` and existing variants for class composition.
4. Keep API/data concerns outside presentational components.
5. Export from feature/index barrel when reused.
