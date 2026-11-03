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
- **Offer discounts:** staff set a general discount and per-service overrides (whole-number percentages) on Draft Offers. A service's override wins, otherwise it inherits the general discount. Publishing to GA snapshots each service's resolved discount into `spec.servicePricings[].discount`, which the detail page reads for GA Offers. The detail page shows each service's resolved percentage, marked override or inherited, not discounted prices.
- **Billing account dashboard:** the billing account page loads only the account in its loader; every card fills in on the client. It shows a status header (Past due outranks the account phase), an attention banner of checks with fix-it links, headline tiles, and cards for usage, invoices (aging, past due first), linked projects with spend, payment (cards, terms), offer, contact, configuration and people's billing changes. Stale Amberflo and old-OpenMeter invoices are hidden everywhere. Checks: past due; an invoice over 100× the median of the account's other non-void invoices (with at least 3); an open card balance over 10,000 (USD, EUR, GBP only); a failed or missing card; a card expiring within 30 days; this cycle's spend over the arrangement's per-cycle credit limit; spend at 5× last cycle's at the same point (once last cycle reached 1); a business with no tax ID; no offer. The header's Actions grant or change terms, review a pending terms application instead while one waits, or switch offer.
- **Email activity:** the Operations list and the project Email Activity tab load every Email page (100 per request) and sort newest first in the browser, because the Email list API can't sort. Search and filters work on the loaded set. milo-os/milo#932 tracks a time-ordered list upstream.
- **Data flow:** browser code calls typed API functions → OpenAPI SDK → `/api/internal/*` on the Hono server → server injects the staff bearer token and forwards upstream. Some reads go through the GraphQL gateway proxy instead.
- **Assistant ("Patch"):** a chat UI (`@ai-sdk/react`) backed by `app/server/routes/assistant.ts`, using the Datum AI gateway or a direct Anthropic key, with tools for platform data, Sentry and MCP cluster tools.
- **Plugins:** additional UI can be loaded at runtime via module federation manifests (`app/modules/plugins`).

## Who uses it

Internal Datum staff only: support and customer success, operations/SRE, billing, and trust & safety (fraud). Operator runbooks live in `docs/operators/` (feature flags, passkey recovery). Engineers maintaining the portal use `docs/engineering/`.
