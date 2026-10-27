# Project Brief

## Project

**Datum Staff Portal** (`datum-cloud/staff-portal`) is the internal operations console for Datum Cloud staff. It is a full-stack React Router v7 application served by a Hono server on Node.js, used to inspect and manage customers, organizations, projects, billing, fraud, DNS, email and platform operations across the Datum platform.

## Primary goals

- Give Datum staff one place to look up and act on customer resources (users, organizations, projects, contacts) without going to raw APIs or clusters.
- Support operational workflows: activity/audit logs, email activity, quota, billing and usage, fraud policy and evaluations, feature flags, service catalog and offers, chainsaw test runs.
- Provide an embedded AI assistant ("Patch") that can query platform data, Sentry and cluster tools on a staff member's behalf.
- Keep the portal observable (OpenTelemetry, Prometheus metrics, Loki logs, Sentry) and safe (staff-only auth, token-scoped upstream calls).

## Scope

In scope for this codebase:

- The browser UI (`app/routes`, `app/features`, `app/components`, `app/layouts`).
- The Hono server layer that authenticates staff, proxies requests to Milo/Datum APIs, serves the GraphQL gateway proxy, metrics and assistant endpoints (`app/server`).
- Typed API access: generated OpenAPI SDKs and GraphQL codegen (`app/resources`, `app/modules/graphql`).
- Runtime plugin loading via module federation (`app/modules/plugins`).
- Local observability stack for development (`docker-compose.yml`, `dev/docker`, `observability/`).

Out of scope:

- The upstream APIs themselves (Milo control plane, `*.miloapis.com` services, GraphQL gateway, AI gateway) — the portal consumes them.
- The customer-facing Cloud Portal (linked via `CLOUD_PORTAL_URL`).
- The shared design system `@datum-cloud/datum-ui` and `@datum-cloud/activity-ui`, which are consumed as npm packages.
