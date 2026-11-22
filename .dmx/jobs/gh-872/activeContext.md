# Active Context: gh-872

## Open Learnings
- pnpm-lock.yaml (from `pnpm import`) has no version npm didn't resolve. 16 npm versions are gone: 5 bundled inside `@tailwindcss/oxide-wasm32-wasi` (pnpm doesn't list bundled deps); `js-yaml@4.3.2` + `argparse@2.0.1`, a stale nested copy under `@hey-api/json-schema-ref-parser` that npm never moved onto the `js-yaml ^5.5.0` override; and in-range dedupes to versions already in the tree: ansi-regex 6.2.2→6.4.0, ansi-styles 6.2.1→6.2.3, brace-expansion 1.1.21→1.1.22 and 5.0.12→5.0.13, eventsource-parser 3.0.6→3.1.0, hasown 2.0.2→2.0.4, minimatch 11.0.5→11.0.9, semver 6.3.1→6.3.2, string-width 8.2.1→8.3.0.

## Open Decisions
- Every request is logged twice by the production server (`GET …` and `GET … - 302` each appear twice). The npm build on `main` does the same, so it predates this ticket; out of scope. Tracked as #873: `honoLoggerMiddleware` is registered in both `app/server/entry.ts` and the Node adapter's `configure` hook, which share one Hono router.

## Session Notes
- Developer accepted the ~146 MB larger production `node_modules` (peers kept by pnpm), matching cloud-portal, which ships the same. Mention it in the PR description.
- Phase 4 in progress: Dockerfile build stage moved to pnpm. No Docker here, so the build stage was replayed on a `git archive`-style export with `NODE_ENV=production` (pinned pnpm installed with `npm install -g`, frozen install, build, prune), and the server started from the runtime stage's file set: `/_healthz` 200, `/login` 302, CSS asset 200; `check-server-imports.mjs` passes after declaring `@hono/node-ws`. The image itself is first built by CI (`publish-docker`).
- Phase 3 complete: `test:e2e*` start the server with `pnpm dev`/`pnpm start`; lefthook runs eslint, prettier and lingui with `pnpm exec` (hook run and lingui extract/compile checked, catalogs unchanged); `scripts/openapi.ts` runs `pnpm exec openapi-ts` in place of `npx --no-install`; usage strings drop npm's `--` (pnpm passes it through literally and node swallows it, so both forms work).
- Phase 2 complete: typecheck, lint (7 existing warnings), format check, vitest (884) and build pass under pnpm. The production server built with pnpm starts (`/_healthz` 200, `/login` 302). `@hey-api/json-schema-ref-parser` bundles a YAML spec with js-yaml 5.5.0.
- Phase 1 complete: `packageManager: pnpm@11.28.9`, `engines.node >=26.13.0`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` imported; `package-lock.json` and `.npmrc` removed. `pnpm install` and `pnpm install --frozen-lockfile --ignore-scripts` succeed on Node 26.13.1. The npm lockfile is kept for comparison in the session scratchpad.
- Branch created off `main` at `a0c4cd3e`. The dmx MCP server wasn't connected, so the ticket, branch and job files were made by hand (`gh`, git).
- Local environment: Node 26.13.1 through nvm (load `~/.nvm/nvm.sh`, then `nvm use`; the system Node is 24.22.3) and pnpm 11.22.0. `packageManager` will switch pnpm to the pinned version.
