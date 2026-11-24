---
ticket: gh-880
branch: build/pnpm-12
summary: Move to pnpm 12.23.0 and set the install policy
ticketing: github-issues
---

# Move to pnpm 12.23.0 and set the install policy

**Ticket:** [#880](https://github.com/datum-cloud/staff-portal/issues/880)
**Type:** build
**Branch:** build/pnpm-12
**Epic:** datum-cloud/infra#10104 (staff-portal is the pilot)

---

## Context
staff-portal moved from npm to pnpm 11.28.9 in #879. Its `pnpm-workspace.yaml` sets no release delay and no trust policy. The epic moves every repository to pnpm 12.23.0 with both, and staff-portal posts the before and after numbers first.

## Scope
- `packageManager` pins `pnpm@12.23.0`; the lockfile records it.
- `pnpm-workspace.yaml` sets `minimumReleaseAge: 1440` and `trustPolicy: no-downgrade`. Versions the trust policy rejects are exempted by exact version in `trustPolicyExclude`, each with a comment.
- The Dockerfile installs pnpm from `packageManager` without any `+sha` suffix.
- README and `.dmx/techContext.md` name pnpm 12.
- Measure npm (parent of the #879 merge), pnpm 11.28.9 (`main`) and pnpm 12.23.0 (this branch): cold and warm install, `node_modules` size, build time, image size, osv-scanner findings.

## Out of scope
- `allowSkills` for the packages pnpm 12 lists as awaiting approval for agent skills (`@tanstack/react-table`, `@tanstack/table-core`, `ai`, `dotenv`). The brief doesn't cover it; raised with the developer.
- Bumping `recharts`' redux packages to releases that publish from CI.
