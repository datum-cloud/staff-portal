# Active Context: gh-880

## Open Learnings
- [repo-wide] `trustPolicy: no-downgrade` rejected five locked versions, each published without provenance after an earlier release of the same package had it: `@mjackson/headers@0.10.0` (through remix-auth-oauth2), `@reduxjs/toolkit@2.9.0` and `react-redux@9.2.0` (through recharts), `lefthook@2.2.2` (direct, latest), `undici-types@6.21.0` (through `@types/node` 22, which pins `~6.21.0`). pnpm 12 exempts them with `trustPolicyExclude`; exact `name@version` entries keep the next release of each checked.
- [repo-wide] pnpm 12 verifies the whole lockfile against the trust policy on install and fetches full metadata for every entry to do it. The first check here took over 11 minutes for 1490 entries with other installs running on the machine. In a fresh image build the check took 72s of an 87s install; on a machine that already verified the lockfile, pnpm reuses the result ("verified 34s ago").
- [repo-wide] The pnpm 12 image is 61 MB smaller than the pnpm 11 one with the same 870 packages: pnpm 12 hardlinks identical files from its store (2538 of 5136 files in date-fns), and the image layer keeps the links.
- [repo-wide] osv-scanner 2.7.1 reads the pnpm 12 lockfile, including the 17 `@pnpm/exe.*` entries pnpm records for itself (1507 packages against 1490 on pnpm 11).
- [repo-wide] `schema.test.ts > digitsOnly > drops anything that is not a digit` times out at 5s in the full vitest run under load, on `main` too; it passes alone. Its dynamic `import('./whole-number-input')` is the slow part.
- [repo-wide] pnpm 12 lists packages that ship agent skills as awaiting approval (`pnpm approve`, setting `allowSkills`). Install still exits 0.

## Open Decisions
- Whether to set `allowSkills` (approve or deny) for `@tanstack/react-table`, `@tanstack/table-core`, `ai` and `dotenv`. Raised with the developer.

## Session Notes
- Verified: frozen install, typecheck, lint (7 existing warnings), format check, vitest (971 pass alone; the digitsOnly timeout above in full runs), production build, `docker build` from a `git archive` context, container on port 38080: `/_healthz` 200, `/login` 302 to the OIDC authorize URL, `/` 302 to `/login`, CSS asset 200. No push or PR yet: the developer opens it.
- Branch `build/pnpm-12` off `main` at `a7c87eaa`. Numbers measured in scratchpad worktrees: npm at `09d67664` (parent of the #879 merge), pnpm 11.28.9 at `a7c87eaa`.
