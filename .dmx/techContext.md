# Tech Context

## Stack

- **Language:** TypeScript (v6), ESM (`"type": "module"`).
- **Runtime:** Node.js 26.12.1 (`.nvmrc`, `engines.node >= 26.12.1`). The Docker image builds on Node 26 Alpine.
- **Framework:** React 19 + React Router 7 (SSR, explicit route config), served by Hono via `react-router-hono-server` and `@hono/node-server`.
- **Build:** Vite 7 (`react-router build`, plus a separate observability bundle via `vite.observability.config.ts`).
- **Styling:** Tailwind CSS v4, `tailwind-variants`, `@datum-cloud/datum-ui` design system.
- **Package manager:** npm (`package-lock.json`; CI runs `npm ci`). A stray `bun.lock` may exist locally but is not used by CI.

## Key dependencies

- `@tanstack/react-query`, `@tanstack/react-table`, `@tanstack/react-virtual` — data fetching, tables, virtualisation.
- `axios` + `@hey-api/openapi-ts` / `@hey-api/client-axios` — generated REST SDKs for `*.miloapis.com` APIs.
- `urql`, `@urql/core`, `@gqlts/*`, `graphql` — GraphQL gateway client and codegen.
- `remix-auth`, `remix-auth-oauth2` — OIDC staff login and cookie sessions.
- `@lingui/*` — internationalisation.
- `react-hook-form`, `zod`, `@hookform/resolvers` — forms and validation.
- `nuqs` — URL query state.
- `ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`, `@modelcontextprotocol/sdk` — assistant chat, model providers and MCP cluster tools.
- `@module-federation/runtime` — runtime plugins.
- `@sentry/react-router`, `@opentelemetry/*`, `prom-client`, `@hono/prometheus`, `@myunisoft/loki` — error reporting, tracing, metrics, logs.
- `@monaco-editor/react`, `@tiptap/*`, `streamdown`, `recharts` — editors, rich text, markdown streaming, charts.

## Dev setup

- `npm install`, copy `.env.sample` to `.env` and fill in API, OIDC, session and optional Sentry/OTEL/AI settings.
- `npm run dev` starts the dev server on port 3000 (health check at `/_healthz`).
- `docker compose up` brings up the local observability stack (OTEL collector, Prometheus, Jaeger, Grafana on :3002).
- Codegen: `npm run openapi:generate` (REST SDKs), `npm run graphql` (GraphQL schema), `npm run i18n:extract` / `i18n:compile` (Lingui catalogs).

## Testing and quality

- Unit tests: vitest, `*.test.ts` next to the code under `app/`; run `npm test`.
- Component tests: Cypress component testing in `cypress/component`; `npm run test:unit:prod`.
- E2E: Cypress in `cypress/e2e`; `npm run test:e2e` (starts dev server) or `test:e2e:prod`.
- `npm run lint` (ESLint), `npm run format:check` (Prettier with import sorting and Tailwind plugins), `npm run typecheck` (`react-router typegen && tsc`).
- CI (`.github/workflows/ci.yml`) runs install → lint/format + typecheck → build → vitest, Cypress component tests and an E2E smoke job.
- Lefthook pre-commit runs ESLint and Prettier on staged files and re-extracts/compiles Lingui catalogs.

## Constraints

- Node 26.12.1 or newer is required.
- Generated OpenAPI and GraphQL code must be regenerated, never edited by hand.
- `graphql` is pinned to 17.0.2 via `overrides`; `react-is` and `form-data` are also overridden.
- Upstream credentials are attached only on the server; browser code goes through `/api/internal/*`.
