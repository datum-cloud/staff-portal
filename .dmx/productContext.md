# Product Context

## Why this exists

Datum Cloud runs customer workloads on a Kubernetes-style control plane (Milo) with many resource APIs. Support, operations, billing and trust & safety staff need to see and change customer state quickly and safely. The staff portal wraps those APIs in a single authenticated UI so staff don't need cluster access or hand-written API calls, and so every action goes through staff-only auth with structured logging and error reporting.

## How it works

- **Sign-in:** staff authenticate via OIDC (`remix-auth` + `remix-auth-oauth2`, cookie sessions). Private routes are gated by an auth layout and a staff check (`app/modules/auth/require-staff.server.ts`).
- **Shell:** the Milo shell layout (`app/layouts/milo.layout.tsx`) wraps all private routes; a legacy `private.layout.tsx` still exists. The dashboard home hosts the assistant in a right-hand dock.
- **Main areas** (see `app/routes.ts`):
  - **Customers** — users (organizations, contacts, activity/audit logs, email activity), organizations (members, projects, quota, billing), projects.
  - **Marketing** — contacts and contact groups.
  - **Operations** — activity, email activity, chainsaw tests.
  - **Admin** — groups, offers, service catalog.
  - Fraud, DNS/domains, edge, feature flags, profile and preferences.
- **Data flow:** browser code calls typed API functions → OpenAPI SDK → `/api/internal/*` on the Hono server → server injects the staff bearer token and forwards upstream. Some reads go through the GraphQL gateway proxy instead.
- **Assistant ("Patch"):** a chat UI (`@ai-sdk/react`) backed by `app/server/routes/assistant.ts`, using the Datum AI gateway or a direct Anthropic key, with tools for platform data, Sentry and MCP cluster tools.
- **Plugins:** additional UI can be loaded at runtime via module federation manifests (`app/modules/plugins`).

## Who uses it

Internal Datum staff only: support and customer success, operations/SRE, billing, and trust & safety (fraud). Operator runbooks live in `docs/operators/` (feature flags, passkey recovery). Engineers maintaining the portal use `docs/engineering/`.
