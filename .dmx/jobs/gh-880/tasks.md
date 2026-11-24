# Tasks: Move to pnpm 12.23.0 and set the install policy

**Spec:** `.dmx/jobs/gh-880/spec.md`
**Branch:** build/pnpm-12
**Ticket:** [gh-880](https://github.com/datum-cloud/staff-portal/issues/880)
**Status:** Ready for PR

---

## Phase 1: pnpm 12 and the install policy
- [x] Pin `pnpm@12.23.0` in `packageManager`
- [x] Set `minimumReleaseAge: 1440` and `trustPolicy: no-downgrade` in `pnpm-workspace.yaml`
- [x] Exempt each version the trust policy rejects by exact version in `trustPolicyExclude`, with the reason
- [x] Dockerfile strips any `+sha` from `packageManager` before installing pnpm; README and techContext name pnpm 12

## Phase 2: Verify
- [x] Clean `pnpm install --frozen-lockfile`
- [x] Typecheck, lint, format check, vitest, production build
- [x] `docker build`, run the container on a free port and request `/_healthz` and `/login`

## Phase 3: Numbers
- [x] Cold and warm install, `node_modules` size, build time for npm, pnpm 11.28.9 and pnpm 12.23.0
- [x] Image size for each
- [x] osv-scanner on each lockfile
