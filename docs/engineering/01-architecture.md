# Architecture and Project Structure

## Stack Overview

`staff-portal` is a React Router v7 full-stack app running on Node.js + Vite with a Hono server layer.

- Frontend app: React + React Router + Tailwind CSS v4
- Data layer: TanStack Query + OpenAPI-generated SDK
- Server layer: Hono routes and middleware
- Auth/session: `remix-auth` + cookie-based session handling
- Design/UI: the `@datum-cloud/datum-ui` package (primitives plus form, data-table and code-editor), imported by subpath

## Source Tree and Responsibilities

### `app/routes.ts`

Authoritative URL tree and nesting rules.

- Uses explicit route config (`layout`, `route`, `index`, `prefix`)
- Defines both private and public route segments
- Defines dynamic route params and catch-all behavior

### `app/routes/**`

Route modules for pages and sub-layouts.

- Typically exports `loader`, `meta`, `handle`, default component
- Uses `index.tsx` for default pages and `layout.tsx` for nested shells
- Complex features are grouped by folder (`project`, `organization`, `fraud`, etc.)
- Route links should use helpers from `app/utils/config/routes.config.ts` (favor nested route groups with `root/list/detail` semantics)

### `app/layouts/**`

App-level layout wrappers.

- `milo.layout.tsx`: auth gate + app shell (`MiloShell`: navbar, context bar, sub-nav rail, assistant dock)
- `public.layout.tsx`: login/callback routes

### `app/components/**`

Reusable cross-feature components:

- Shell-adjacent pieces shared with the Milo shell (`app-search`, `breadcrumb`, `logo`)
- Generic reusable UI wrappers (`dialog`, `sub-layout`, `chip`, etc.)

### `app/features/**`

Feature-local logic and components.

- Keeps domain-level logic close to domain UI
- Used by route modules to avoid large page files
- `milo/` is the app shell: `components/shell`, `navbar`, `context-bar`, `sub-nav`, the page templates in `components/page` (`ListPage`, `DetailPage`, `PlainPage`, `ListTable`), and the navigation config in `lib/nav-config.ts`

### `app/modules/**`

Cross-cutting foundations.

- `axios/`: browser/server HTTP clients
- `auth/`: authenticator, session handling and the staff gate (`require-staff.server.ts`)
- `graphql/`, `tanstack/`: GraphQL (urql) and TanStack Query setup
- `i18n/`: Lingui setup and message catalogs
- `assistant/`, `billing/`, `plugins/`: assistant tools, billing helpers, plugin host
- `loki/`, `prometheus/`, `sentry/`: logs, metrics and error reporting

There is no local UI module. Primitives and extended UI come from `@datum-cloud/datum-ui`.

### `app/resources/**`

API and type resources.

- `openapi/`: generated SDK and types
- `request/client/apis`: browser-side API functions (no React hooks)
- `request/client/queries`: browser-side React Query hooks + query keys
- `request/server`: server-side wrappers needing bearer token
- `schemas/`: zod schemas

### `app/server/**`

Hono server entry, middleware, and API routes.

- Internal proxy endpoint (`/api/internal/*`)
- Metrics and supporting backend routes
- Structured request logging and error responses

## Runtime Provider Flow

### Root level (`app/root.tsx`)

- Theme provider and script
- Query client provider
- Nuqs adapter
- Lingui locale integration
- Toaster and global app shell document

### Private shell (`app/layouts/milo.layout.tsx`)

- The loader calls `requireStaffUser` (`app/modules/auth/require-staff.server.ts`), which checks the session through `authenticator`, enforces staff-group membership and fetches the current user (`userDetailQuery`)
- Wraps the page with `AppProvider`, `TaskQueueProvider` and a `SidebarProvider` (still needed by `SubLayout` menus), then renders `MiloShell`
- `MiloShell` (`app/features/milo/components/shell/milo-shell.tsx`) lays out `MiloNavbar`, `MiloContextBar` (breadcrumb), the optional `MiloSubNav` rail, the routed page and the assistant dock
- When `CHATBOT_ENABLED` is set, the layout adds `AssistantProvider` and passes `AssistantPanel` as the shell's side panel

## Routing Pattern Summary

- Routes are grouped by business area in `app/routes.ts`
- Nested detail pages often use nested `layout.tsx` files
- Feature route trees usually look like:
  - list (`index.tsx`)
  - create (`create.tsx`)
  - detail (`:id` + nested child pages)

## Navigation Pattern

Shell navigation is driven by `app/features/milo/lib/nav-config.ts` (`NAV_SECTIONS`):

- Main menu: one entry per section, rendered by `MiloNavbar`
- Section sub-nav: a section's `subNav` renders in the left rail (`MiloSubNav`), or in the list toolbar when `placement: 'toolbar'`
- Entity nav: a detail layout declares `handle.entityNav`, and the rail shows that entity's pages instead of the section sub-nav (`organization/detail`, `contact/detail`, `group/detail`)
- Breadcrumb: `MiloContextBar`, fed by route `handle.breadcrumb`

Choose based on information architecture:

- Add a section or sub-nav item in `nav-config.ts` when the page is a peer of existing top-level pages
- Use `handle.entityNav` when users stay inside one resource with several subsections
- `SubLayout.SidebarMenu` (`app/components/sub-layout`) is the older in-page menu, still used by `profile` and `operations/activity`. Prefer the Milo page templates for new pages

## Fraud Feature Structure (current)

Fraud was standardized to keep route files thin and move heavy UI to feature modules:

- Route orchestration: `app/routes/customer/fraud/**`
- Feature components: `app/features/fraud/**`
  - `policy/policy-form.tsx`
  - `policy/policy-detail.tsx`
  - `detail/evaluation-sections.tsx`

## Implementation Principles

- Keep URL topology in `app/routes.ts`, not spread across code
- Use nested layouts for section-level frame and breadcrumbs
- Keep route modules focused on orchestration and page composition
- Push reusable behavior to `features`, `components`, and `resources/request`
