# Tasks — #758 Contact overview layout

## Phase 1 — Building blocks ✅
- [x] 1.1 Add **Prospect / Platform user** badge (`ContactTypeBadge` + `isPlatformUser` helper in `lib/contact-user-link.ts`). Uses `BadgeState`.
- [x] 1.2 Add **summary strip**: `StatTile` (label + value + sub-line) and `ContactSummaryStrip` (responsive flex row, divide-x, stacks at narrow). Caller omits user-only tiles.
- [x] 1.3 Unit tests for `isPlatformUser` (5 cases). eslint ✓ · tsc ✓ · vitest 5/5 ✓.

## Phase 2 — Routing & entity rail ✅
- [x] 2.1 Added `contactRoutes.notes/emailsSent/activity` in `routes.config.ts`.
- [x] 2.2 Added placeholder stubs `notes.tsx` / `emails.tsx` / `activity.tsx` + registered in `routes.ts`. Added `ENTITY_ICONS.note` (StickyNote).
- [x] 2.3 Expanded `handle.entityNav` to 5 items (Overview, Notes, Contact Groups, Emails sent, Activity). Flat group.

## Phase 3 — Overview page ✅
- [x] 3.1 Replaced `detail/index.tsx`: removed always-open `ContactForm`. Badge placed inline with the name in the header (layout `name` prop), not a duplicate identity row. Header action buttons OMITTED (sibling-owned; no dead buttons).
- [x] 3.2 Summary strip wired to real data; user-only tiles (platform access / organizations / emails sent / fraud) gated behind linked-user; Contact groups always shown. Added shared `useUserEmailListQuery` hook.
- [x] 3.3 Two-column grid (`lg:grid-cols-3`, main `col-span-2` + rail) with placeholder cards; stacks to one column narrow.
- [x] 3.4 Prospect variant: "Prospect" badge; user-only tiles + Platform account/Organizations placeholder cards omitted.

## Phase 4 — Verify
- [x] 4.1 eslint --fix clean on all changed files; prettier clean.
- [x] 4.2 tsc clean (touched files); vitest 5/5.
- [ ] 4.3 Run the app (dev server via `!`) — PENDING developer: confirm Overview + Prospect case + narrow-width stacking + the 3 new tab stubs.
