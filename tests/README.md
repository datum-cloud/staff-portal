# Testing Strategy

Staff Portal uses **Cypress** for both unit and end-to-end testing (mirroring the
cloud-portal setup). There is no Vitest.

## Layout

```
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

## Unit / component tests (`cypress/component/**`)

Run with the Cypress **component** runner (Vite-bundled, real browser):

```bash
bun run test:unit          # interactive (cypress open --component)
bun run test:unit:prod     # headless (CI)
```

Two flavours:

- **Logic specs** (`*.cy.ts`) — import a util/module and assert with Chai
  (`expect(x).to.equal(...)`). Examples: `error-parser`, `service-catalog`,
  `maxmind`, `quotas-grouping`, `string-helper`.
- **Component specs** (`*.cy.tsx`) — `cy.mount(<Component />)` and assert on the
  real rendered DOM. Examples: `badge-state`, `button-delete-action`,
  `danger-zone-card`, `recent-users-widget`.

### Golden rule: render real components, don't mock modules

Cypress component tests cannot use `vi.mock`. Render the real UI and assert on
behaviour. When a component needs API data, seed the React Query cache instead of
mocking the request module (see `recent-users-widget.cy.tsx`, which calls
`queryClient.setQueryData([...], fixture)` with `staleTime: Infinity`).

The `cy.mount` command wraps the subject in the same providers the app uses
(Lingui i18n + TanStack Query + Router), so components behave like production.

## E2E tests (`cypress/e2e/smoke/**`)

Hit a **real backend** with a **real signed staff session** — nothing is mocked.

```bash
bun run test:e2e           # start dev server + run e2e
bun run test:e2e:prod      # start prod build + run e2e
bun run test:e2e:debug     # start prod build + cypress open
```

`cy.login()` builds and signs a `_session` cookie the same way the app does
(`app/utils/cookies/session.ts`) via the `signSessionCookie` Node task, then caches
it across specs. The session user **must belong to the staff group**, otherwise the
private layout redirects to `/login`.

Required env / CI secrets: `SESSION_SECRET`, `ACCESS_TOKEN` (staff user), `SUB`,
`API_URL`, `GRAPHQL_URL`, `AUTH_OIDC_ISSUER`, `AUTH_OIDC_CLIENT_ID`, `VERSION`.

## Fixtures (`tests/fixtures/`)

Reusable, type-safe test data shared across specs (e.g. `activity-list.ts`).
Imported via the `@/tests/*` path alias.
