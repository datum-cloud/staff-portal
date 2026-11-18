# Staff Portal Engineering Docs

This section documents the implementation patterns used in `staff-portal`, including:

- How the app is structured
- How to create new pages/routes
- How to build reusable components
- How requests, loaders, and API proxying work

## Recommended Reading Order

1. `01-architecture.md`
2. `02-pages-and-routes.md`
3. `03-components-ui.md`
4. `04-data-and-requests.md`
5. `05-error-handling-and-reporting.md` — error model, error flow, and Sentry reporting

## Quick Mental Model

- Route definitions are centralized in `app/routes.ts`.
- The authenticated shell is applied by `app/layouts/milo.layout.tsx`, which renders `MiloShell` from `app/features/milo`.
- Page modules live in `app/routes/**`, and route-level data usually mixes:
  - `loader` for access checks and shell-critical data
  - React Query hooks from `app/resources/request/client/**` for page data
- API calls are OpenAPI-generated first, then wrapped by:
  - `client/apis/*.api.ts` for pure API functions
  - `client/queries/*.queries.ts` for React Query hooks and keys

## Core Paths

- Route map: `app/routes.ts`
- Root providers/document: `app/root.tsx`
- Authenticated shell: `app/layouts/milo.layout.tsx` and `app/features/milo/**` (navbar, context bar, sub-nav rail, page templates)
- Shell navigation config: `app/features/milo/lib/nav-config.ts`
- Staff auth gate: `app/modules/auth/require-staff.server.ts`
- Shared components: `app/components/**`
- Feature components: `app/features/**`
- UI primitives and extended UI (form, data-table, code-editor, toast): the `@datum-cloud/datum-ui` package, imported by subpath (`@datum-cloud/datum-ui/button`)
- Cross-cutting modules: `app/modules/**` (`assistant`, `auth`, `axios`, `billing`, `graphql`, `i18n`, `loki`, `plugins`, `prometheus`, `sentry`, `tanstack`)
- Request wrappers: `app/resources/request/**`
- OpenAPI generated code: `app/resources/openapi/**`
- Internal proxy/API routes: `app/server/routes/api.ts`
- Tests: colocated `app/**/*.test.ts` (Vitest) and `cypress/**` (component and e2e), see `tests/README.md`
