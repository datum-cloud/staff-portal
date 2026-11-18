# Testing Strategy

Staff Portal has three test runners:

| Runner            | What it covers                                        | Where specs live         | Command                  |
| ----------------- | ----------------------------------------------------- | ------------------------ | ------------------------ |
| Vitest            | Pure logic and server code (Node environment)         | `app/**/*.test.{ts,tsx}` | `npm test`               |
| Cypress component | Rendered UI in a real browser, plus older logic specs | `cypress/component/**`   | `npm run test:unit:prod` |
| Cypress e2e       | Smoke checks against a running app and real backend   | `cypress/e2e/smoke/**`   | `npm run test:e2e`       |

CI runs all three (`.github/workflows/ci.yml`: `vitest`, `unit-tests`, `e2e-smoke`).

Where a new test goes:

- Utilities, data transforms, schemas, API wrappers, server code: Vitest, next to the
  source file.
- Anything that must render a component and assert on the DOM: Cypress component.
- A user flow across pages against the real backend: Cypress e2e.

## Layout

```
app/
  **/*.test.ts            — Vitest specs, colocated with the code they test
cypress/
  support/
    e2e.ts                — login (signed _session cookie) + global e2e hooks
    component.tsx         — cy.mount / cy.mountRemixRoute with app providers
    remixStub.tsx         — React Router v7 RouterProvider stub for route components
    component-index.html
  component/              — unit + component tests (*.cy.ts logic, *.cy.tsx UI)
  e2e/
    smoke/                — fast render/read checks, run on every PR
tests/
  fixtures/               — shared test data (e.g. activity-list.ts)
```

## Unit tests (`app/**/*.test.ts`, Vitest)

Configured in `vitest.config.ts`: Node environment, `app/**/*.test.{ts,tsx}`, the
`@/*` path aliases, and stub env values so server modules load without a `.env`.

```bash
npm test                                   # whole suite (vitest run)
npx vitest run app/features/billing/lib    # one folder or file
npx vitest app/utils/cookies               # watch mode
```

Specs use `describe` / `it` / `expect(x).toBe(...)` and may use `vi.mock` and
`vi.fn`. Examples: `app/features/milo/lib/filter-rules.test.ts`,
`app/server/lib/*.test.ts`, `app/modules/plugins/server/*.test.ts`.

There is no DOM in this runner. A test that needs rendered output belongs in
Cypress component.

## Component tests (`cypress/component/**`)

Run with the Cypress **component** runner (Vite-bundled, real browser):

```bash
npm run test:unit          # interactive (cypress open --component)
npm run test:unit:prod     # headless (CI)
```

Two flavours:

- **Component specs** (`*.cy.tsx`) — `cy.mount(<Component />)` and assert on the
  real rendered DOM. Examples: `badge-state`, `button-delete-action`,
  `danger-zone-card`, `chainsaw-tests-widget`.
- **Logic specs** (`*.cy.ts`) — import a util/module and assert with Chai
  (`expect(x).to.equal(...)`). Examples: `error-parser`, `service-catalog`,
  `maxmind`, `quotas-grouping`, `string-helper`. These predate the Vitest setup.
  Write new logic tests in Vitest.

### Golden rule: render real components, don't mock modules

Cypress component tests cannot use `vi.mock`. Render the real UI and assert on
behaviour. When a component needs API data, seed the React Query cache instead of
mocking the request module (see `chainsaw-tests-widget.cy.tsx`, which calls
`queryClient.setQueryData([...], fixture)` with `staleTime: Infinity`).

The `cy.mount` command wraps the subject in the same providers the app uses
(Lingui i18n + TanStack Query + Router), so components behave like production.

## E2E tests (`cypress/e2e/smoke/**`)

Hit a **real backend** with a **real signed staff session** — nothing is mocked.

```bash
npm run test:e2e           # start dev server + run e2e
npm run test:e2e:prod      # start prod build + run e2e
npm run test:e2e:debug     # start prod build + cypress open
```

`cy.login()` builds and signs a `_session` cookie the same way the app does
(`app/utils/cookies/session.ts`) via the `signSessionCookie` Node task, then caches
it across specs. The session user **must belong to the staff group**, otherwise the
Milo layout loader (`requireStaffUser`) redirects to `/error/unauthorized`. The
staff check is skipped when the server runs with `CYPRESS=true`, as in CI, where
the caller is a service account.

Required env / CI secrets: `SESSION_SECRET`, `ACCESS_TOKEN` (staff user), `SUB`,
`API_URL`, `GRAPHQL_URL`, `AUTH_OIDC_ISSUER`, `AUTH_OIDC_CLIENT_ID`, `VERSION`.

## Fixtures (`tests/fixtures/`)

Reusable, type-safe test data shared across specs (`activity-list.ts`,
`chainsaw-tests.ts`).
Imported via the `@/tests/*` path alias.
