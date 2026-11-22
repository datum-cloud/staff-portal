# Active Context: gh-872

## Open Learnings
- pnpm-lock.yaml (from `pnpm import`) has no version npm didn't resolve. 16 npm versions are gone: 5 bundled inside `@tailwindcss/oxide-wasm32-wasi` (pnpm doesn't list bundled deps); `js-yaml@4.3.2` + `argparse@2.0.1`, a stale nested copy under `@hey-api/json-schema-ref-parser` that npm never moved onto the `js-yaml ^5.5.0` override; and in-range dedupes to versions already in the tree: ansi-regex 6.2.2→6.4.0, ansi-styles 6.2.1→6.2.3, brace-expansion 1.1.21→1.1.22 and 5.0.12→5.0.13, eventsource-parser 3.0.6→3.1.0, hasown 2.0.2→2.0.4, minimatch 11.0.5→11.0.9, semver 6.3.1→6.3.2, string-width 8.2.1→8.3.0.

## Open Decisions
- Phase 2 peer ranges (`pnpm peers check`), hidden by npm's `legacy-peer-deps`: eslint 10.15.0 vs eslint-plugin-import / jsx-a11y / react (max ^9); monaco-editor 0.57.0 vs `@datum-cloud/activity-ui@0.7.1` (^0.52 || ^0.55); `@hono/node-server` 2.1.9 vs `@hono/node-ws@1.3.1` (^1.19.11). cloud-portal handled eslint and monaco by overriding the peer with `parent>peer: 'catalog:'`. No `ws` peer issue showed up here.
- `@hey-api/json-schema-ref-parser` now really gets js-yaml 5.5.0 (the override's intent). Only `openapi:generate` uses it; check it still runs.

## Session Notes
- Phase 1 complete: `packageManager: pnpm@11.28.9`, `engines.node >=26.13.0`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` imported; `package-lock.json` and `.npmrc` removed. `pnpm install` and `pnpm install --frozen-lockfile --ignore-scripts` succeed on Node 26.13.1. The npm lockfile is kept for comparison in the session scratchpad.
- Branch created off `main` at `a0c4cd3e`. The dmx MCP server wasn't connected, so the ticket, branch and job files were made by hand (`gh`, git).
- Local environment: Node 26.13.1 through nvm (load `~/.nvm/nvm.sh`, then `nvm use`; the system Node is 24.22.3) and pnpm 11.22.0. `packageManager` will switch pnpm to the pinned version.
