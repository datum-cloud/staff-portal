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

## Quick Mental Model

- Route definitions are centralized in `app/routes.ts`.
- The authenticated shell is applied by `app/layouts/private.layout.tsx`.
- Page modules live in `app/routes/**`, and route-level data usually mixes:
  - `loader` for access checks and shell-critical data
  - React Query hooks from `app/resources/request/client/**` for page data
- API calls are OpenAPI-generated first, then wrapped by:
  - `client/apis/*.api.ts` for pure API functions
  - `client/queries/*.queries.ts` for React Query hooks and keys

## Core Paths

- Route map: `app/routes.ts`
- Root providers/document: `app/root.tsx`
- Authenticated shell: `app/layouts/private.layout.tsx`
- Shared components: `app/components/**`
- Feature components: `app/features/**`
- UI primitives: `app/modules/shadcn/**`
- App-local extended UI: `app/modules/datum-ui/**`
- Request wrappers: `app/resources/request/**`
- OpenAPI generated code: `app/resources/openapi/**`
- Internal proxy/API routes: `app/server/routes/api.ts`
