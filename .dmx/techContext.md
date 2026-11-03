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
- Run everything on Node 26 (`nvm use` reads `.nvmrc`): since React Router 8, `node_modules` installed on Node 26 won't run vitest, lingui or the lefthook i18n step on Node 20.
- In a container: `docker run -p 3000:3000 -v "$PWD":/app -v staff-portal-node-modules:/app/node_modules -w /app node:26.12.1-alpine3.24 sh -c "npm ci --ignore-scripts && node --env-file-if-exists=.env node_modules/vite/bin/vite.js --host 0.0.0.0"` runs the dev server with hot reload; Vite must bind `0.0.0.0`. A production image (`Dockerfile`) must run with `NODE_ENV=production`, or the server never listens. There is no `.dockerignore`, so build from a clean export (`git archive`), not the working tree.
- `docker compose up` brings up the local observability stack (OTEL collector, Prometheus, Jaeger, Grafana on :3002).
- Codegen: `npm run openapi:generate` (REST SDKs), `npm run graphql` (GraphQL schema), `npm run i18n:extract` / `i18n:compile` (Lingui catalogs).
- Regenerating one REST SDK: run on Node 26 (the script is `.ts` and won't load on Node 20), e.g. `API_TOKEN="$(datumctl auth get-token)" API_URL=<server from ~/.datumctl/config> npm run openapi:generate -- --resources billing.miloapis.com/v1alpha1`. The output isn't Prettier-formatted, so run `npx prettier --write` on the regenerated folder before committing. A staging spec can include resources not yet in production.

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
- Billing cycle maths (`app/modules/billing/billing-cycle.ts`) runs in the browser as well as the server, so it steps months and formats range labels in UTC. Never use date-fns `addMonths`/`format` for cycle boundaries: they work in local time and land a day early west of UTC. Tests run the same cases under New York and Auckland time. Cycle, period and due dates display with `timezone="UTC"`.
- The activity API rejects query ranges over 720h, so feeds look back at most `now-30d`.
- `app/features/billing/components/card-brand-icons/` are copies of cloud-portal's card brand marks (Apache-2.0, attributed in each file); keep the two in step. Neither datum-ui nor another installed package ships them.
