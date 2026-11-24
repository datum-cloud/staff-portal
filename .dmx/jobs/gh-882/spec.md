---
ticket: gh-882
branch: chore-gh-882-let-renovate-update-vite
summary: Let Renovate update Vite
ticketing: github-issues
---

# Let Renovate update Vite

**Ticket:** [#882](https://github.com/datum-cloud/staff-portal/issues/882)
**Type:** chore
**Branch:** chore-gh-882-let-renovate-update-vite

---

## Context
`renovate.json` holds Vite below 8 ("React Router and Cypress component testing do not yet support Vite 8"). The rule was added in `d43dfdc1` (2026-06-22) when the Cypress test migration moved Vite back to 7. `a7c38f62` (2026-10-30) upgraded to React Router 8 and Vite `^8.2.0`, which React Router 8 and `react-router-hono-server` 3 require, but left the rule. Renovate now filters out every Vite 8.x release: the lockfile has 8.3.5, the latest is 8.3.8. Cypress component testing (`test:unit:prod`) already passes on Vite 8 in CI.

## Scope
- Remove the Vite `allowedVersions: "<8"` package rule from `renovate.json` (its only `packageRules` entry; the rest comes from the org config `local>datum-cloud/.github:renovate-config`).
- Validate the Renovate config.

## Out of Scope
- Upgrading Vite itself: Renovate proposes 8.x updates once the rule is gone.
- Other Renovate rules.

## Technical Approach
Delete the one package rule. Validate the config with Renovate's `renovate-config-validator`. After merge, check that Renovate's next run (or its Dependency Dashboard) lists the Vite 8.x update.

---

## Questions
<!-- Answer these before running /dmx/plan. -->

1. The Vite rule is the only `packageRules` entry; everything else comes from `local>datum-cloud/.github:renovate-config`. Should Vite get a replacement rule here (for example grouping it with `@vitejs/plugin-react` and `vitest`), or follow the org config like every other package and drop `packageRules` entirely?
   Answer: Drop `packageRules` entirely. cloud-portal's `renovate.json` has no package rules and leaves Vite to the org config.
