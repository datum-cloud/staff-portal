# Architecture and Project Structure

## Stack Overview

`staff-portal` is a React Router v7 full-stack app running on Bun + Vite with a Hono server layer.

- Frontend app: React + React Router + Tailwind CSS v4
- Data layer: TanStack Query + OpenAPI-generated SDK
- Server layer: Hono routes and middleware
- Auth/session: `remix-auth` + cookie-based session handling
- Design/UI: `@datum-cloud/datum-ui`, local shadcn setup, local `@datum-ui/*` modules

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

- `private.layout.tsx`: auth gate + app shell (sidebar/topbar/toolbar)
- `public.layout.tsx`: login/callback routes

### `app/components/**`

Reusable cross-feature components:

- Navigation/shell pieces (`app-sidebar`, `app-topbar`, `app-toolbar`)
- Generic reusable UI wrappers (`dialog`, `sub-layout`, `chip`, etc.)

### `app/features/**`

Feature-local logic and components.

- Keeps domain-level logic close to domain UI
- Used by route modules to avoid large page files

### `app/modules/**`

Cross-cutting foundations.

- `shadcn/`: local primitive UI setup
- `datum-ui/`: app-local extensions (form/data-table/editor)
- `axios/`: browser/server HTTP clients
- `auth/`, `i18n/`, `tanstack/`, etc.

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

### Private shell (`app/layouts/private.layout.tsx`)

- Auth check via `authenticator`
- Fetches current user on server (`userDetailQuery`)
- Wraps page with `AppProvider`, `TaskQueueProvider`, sidebar and toolbar layout

## Routing Pattern Summary

- Routes are grouped by business area in `app/routes.ts`
- Nested detail pages often use nested `layout.tsx` files
- Feature route trees usually look like:
  - list (`index.tsx`)
  - create (`create.tsx`)
  - detail (`:id` + nested child pages)

## Navigation Pattern

Two navigation patterns are currently used:

- Toolbar tabs (`AppNavigation` + tabs) for top-level hubs (`activity-hub`, `fraud`)
- Left sub-layout sidebar (`SubLayout.SidebarMenu`) for detail/workspace contexts (`project/detail`, `contact/detail`, `profile`)

Choose based on information architecture:

- Use toolbar tabs when sections are peer-level pages under one area
- Use sidebar menu when users stay in a resource/workspace context with deeper subsections

## Fraud Feature Structure (current)

Fraud was standardized to keep route files thin and move heavy UI to feature modules:

- Route orchestration: `app/routes/fraud/**`
- Feature components: `app/features/fraud/**`
  - `policy/policy-form.tsx`
  - `policy/policy-detail.tsx`
  - `detail/evaluation-sections.tsx`

## Implementation Principles

- Keep URL topology in `app/routes.ts`, not spread across code
- Use nested layouts for section-level frame and breadcrumbs
- Keep route modules focused on orchestration and page composition
- Push reusable behavior to `features`, `components`, and `resources/request`
