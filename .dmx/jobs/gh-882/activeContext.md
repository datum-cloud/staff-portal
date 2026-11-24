# Active Context: gh-882

## Open Learnings

## Open Decisions
- cloud-portal's `renovate.json` also extends `helpers:pinGitHubActionDigests` and `docker:pinDigests` and sets `rangeStrategy: update-lockfile`; staff-portal has none of these. Out of scope for #882.

## Session Notes
- PR opened. Memory sync: the validator learning went to `techContext.md` at commit; the cloud-portal Renovate differences stay as an open decision, outside this ticket.
- Phase 1 complete: `renovate.json` now holds only `$schema` and the org `extends`, as cloud-portal does (cloud-portal adds presets and `rangeStrategy`; see Open Decisions). `renovate-config-validator --strict` (renovate 44.225.1) passes; it rejects a config with an unknown option, so the check works. Prettier clean. Post-merge check: Renovate's next run or Dependency Dashboard should list Vite 8.3.x (8.3.8 latest; lockfile 8.3.5).
- Branch created off `main` at `a7c87eaa` (pnpm migration merged). The dmx MCP server isn't connected, so the branch and spec were made by hand (`git push origin origin/main:refs/heads/...`).
