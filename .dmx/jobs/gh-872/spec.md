---
ticket: gh-872
branch: chore-gh-872-install-with-pnpm
summary: Install, build and run CI with pnpm
ticketing: github-issues
---

# Install, build and run CI with pnpm

**Ticket:** [#872](https://github.com/datum-cloud/staff-portal/issues/872)
**Type:** chore
**Branch:** chore-gh-872-install-with-pnpm
**Reference:** datum-cloud/cloud-portal#1790 (commit `1499ba75`), the same migration in cloud-portal

---

## Context
npm installs are slow and heavy on every laptop and CI run. cloud-portal moved to pnpm 11 while keeping plain Node at runtime, and staff-portal follows the same pattern.

Today the repo installs with npm: `package-lock.json`, `.npmrc` (`legacy-peer-deps=true`), npm `overrides` in `package.json`, `npm ci` in the Dockerfile and `.github/workflows/ci.yml`, `npx` in `lefthook.yml`, and `npm run` / `npx` throughout docs and script usage strings. Renovate pins `npm <12` (#848).

## Scope
- **Install with pnpm.** Pin pnpm with `packageManager` in `package.json`, and raise `engines.node` to `>=26.13.0` to match cloud-portal. Add `pnpm-workspace.yaml` (single package, no `packages:`) holding:
  - `minimumReleaseAgeExclude` for `@datum-cloud/*`
  - an `allowBuilds` allowlist for install scripts
  - the npm `overrides` in pnpm syntax, plus `yaml@1: ^1.10.3` (GHSA-48c2-rrv3-qjmp, newly reported because vuln-scan reads every package in `pnpm-lock.yaml`), with a `catalog:` for versions an override must share with `package.json` (replaces npm's `$axios` reference)
- **Same versions.** Generate `pnpm-lock.yaml` with `pnpm import` from `package-lock.json`, so every package stays at the version npm resolved. Remove `package-lock.json` and `.npmrc`.
- **Strictness fixes.** Declare any dependency the app or generated code imports but only reached through hoisting, and meet peer ranges pnpm enforces (`legacy-peer-deps` goes away).
- **Scripts and tooling.** `package.json` scripts, `lefthook.yml` and `scripts/*` usage strings use `pnpm` / `pnpm exec`.
- **Docker image.** A `.dockerignore` (based on cloud-portal's) keeps `node_modules`, `.git`, `build`, `.env*`, tests, docs and tooling out of the build context; added after review on #879, since CI restores `node_modules` into the checkout and copying it over pnpm's tree stops the image build. The build stage installs the pinned pnpm (Node 26 ships no corepack), installs with `--frozen-lockfile`, builds and prunes with pnpm. The runtime stage stays plain Node.
- **CI.** `ci.yml` sets up pnpm in every job, keys the dependency cache on the pnpm files, installs with `pnpm install --frozen-lockfile --ignore-scripts`, runs `pnpm <script>` / `pnpm exec`, rebuilds the production tree check with pnpm, and fails fast on a cache miss outside the install job. `renovate.json` drops the npm constraint; #848 stays open for the other repositories.
- **Docs.** README, `tests/`, `scripts/`, `docs/`, module READMEs, code comments and `.dmx/techContext.md` use pnpm. npm stays where it names the registry, the `npm:` alias or the changelog.

## Out of Scope
- Changing the Node runtime (`.nvmrc` and the Docker base image stay at 26.13.1)
- Upgrading any dependency beyond what pnpm's peer checks force
- The reusable workflows in `datum-cloud/actions` (`ci-basic`, `vuln-scan`, `publish-docker`)

## Technical Approach
Follow cloud-portal's commit sequence, one commit per area:
1. `build: Install dependencies with pnpm 11`: `packageManager`, `pnpm-workspace.yaml`, `pnpm import`, remove npm files
2. `build: Declare … and meet peer ranges`: strictness fixes found by typecheck, build and tests
3. `build: Run scripts and dev tooling through pnpm`
4. `build: Build the image with pnpm`
5. `ci: Install and run with pnpm` and `ci: Fail fast when cached dependencies are missing`
6. `docs: Use pnpm in docs, guides and comments`

Verify by comparing the client build output with the npm build, building and starting the image (`NODE_ENV=production`, `/_healthz`), and letting CI run the Cypress suites and `ci-basic`/`vuln-scan` against `pnpm-lock.yaml`.

---

## Questions
<!-- Answer these before running /dmx/plan. -->

1. Which pnpm version?
   Answer: `pnpm@11.28.9`, the version cloud-portal pins.

2. Should the PR close #848 (the Renovate `npm <12` pin), since the repo no longer installs with npm?
   Answer: Remove the constraint here, but don't close #848: it tracks the pin in four repositories. The PR references #848 (no closing keyword) so it records that staff-portal no longer needs the pin.

3. Should `engines.node` move to cloud-portal's `>=26.13.0`?
   Answer: Yes, match cloud-portal. `.nvmrc` already pins 26.13.1.
