# Creating Pages and Routes

## 1) Define URL in `app/routes.ts` first

Always start by adding the route tree entry in `app/routes.ts`. This keeps routing consistent and reviewable.

Example pattern:

- Add parent section route with `layout(...)` if the section needs shared tabs/breadcrumb frame.
- Add `index(...)` for default page.
- Add child `route(...)` entries for detail/sub-pages.

## 2) Choose the right route module shape

Typical file exports:

- `meta`: document title and metadata
- `loader`: server-side pre-checks or shell data
- `handle`: route metadata (often breadcrumbs/navigation labels)
- `default`: page component

Use `index.tsx` for default child screen and `layout.tsx` where children share common structure.

## 3) Where logic should live

- Route file:
  - Route params parsing
  - access/redirect logic
  - high-level composition
- Feature/component files:
  - detailed UI logic
  - reusable presentation blocks
  - forms/tables specific behavior
- Request modules:
  - API call definitions and query hooks

Fraud is a reference implementation of this split:

- route orchestration in `app/routes/fraud/policy.tsx` and `app/routes/fraud/detail/index.tsx`
- feature UI extracted to `app/features/fraud/**`

## 4) Loader usage pattern

Use loaders for:

- auth/session checks
- route-level redirects
- section-critical server data needed before rendering

Avoid overloading loaders with all CRUD fetches if the page already uses React Query hooks.

## 5) Practical "new page" checklist

1. Add route entry in `app/routes.ts`.
2. Create route module under `app/routes/<feature>/...`.
3. Add `meta` and optional `handle` for breadcrumb/title consistency.
4. Add `loader` only when server-time checks/data are needed.
5. Build page with shared components (`app/components`) and feature modules (`app/features`).
6. Move API calls to `app/resources/request/client/apis/<feature>.api.ts` and hooks/query keys to `app/resources/request/client/queries/<feature>.queries.ts`.
7. If needed for server loader calls, add companion in `app/resources/request/server`.

## 6) Suggested file layout for a new section

```text
app/routes/new-feature/
  layout.tsx
  index.tsx
  create.tsx
  detail/
    layout.tsx
    index.tsx
    settings.tsx
```

```text
app/features/new-feature/
  components/
    new-feature-form.tsx
    new-feature-table.tsx
  hooks/
    useNewFeatureActions.ts
  index.tsx
```

```text
app/resources/request/client/
  new-feature.request.ts
```

## 7) Breadcrumb and route metadata conventions

Many route modules expose `handle` metadata for breadcrumb renderers and section navigation.

Recommendation for consistency:

- Include readable labels in `handle`
- Keep page titles aligned with `meta`
- Reuse route config helpers from `app/utils/config/routes.config.ts` for links

## 8) Route Config Naming Convention (`routes.config.ts`)

Use nested route groups when multiple routes share the same base path.

Preferred pattern:

- `root`: canonical entry path for a section/workspace
- `list`: list page path for resource collections
- `detail`: detail path with route params
- `create` / `edit`: explicit CRUD leaf routes

Example:

```ts
export const projectRoutes = {
  detail: (projectName: string) => `/customers/projects/${projectName}`,
  activity: {
    root: (projectName: string) => `/customers/projects/${projectName}/activity`,
    events: (projectName: string) => `/customers/projects/${projectName}/activity/events`,
    auditLogs: (projectName: string) => `/customers/projects/${projectName}/activity/audit-logs`,
  },
};
```

Guidance:

- Use `root` for section hubs or nested workspaces (ex: `activity.root()`).
- Use `list` for resource list screens (ex: `providers.list()`, `evaluations.list()`).
- If a feature has both and they resolve to the same URL, keep both only when it improves readability at call sites; otherwise prefer one canonical helper.

## 9) Navigation placement convention

- If navigation belongs to a section-level hub, use route `layout.tsx` with `AppNavigation` tabs.
- If navigation belongs to a resource workspace (detail-oriented), use `SubLayout.SidebarMenu`.
- Keep global app sidebar (`app/components/app-sidebar`) focused on top-level domains, not page-local tabs.
