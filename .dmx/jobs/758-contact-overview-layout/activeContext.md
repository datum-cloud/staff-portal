# activeContext — #758

## Done
All 4 phases implemented; lint/tsc/vitest green. Only the manual app-run (4.3) is pending the developer. No commit yet.

## Open decisions (resolved this session)
- [repo-wide] New rail tabs (Notes/Emails sent/Activity) → **thin placeholder routes now** (stubs added), fleshed out by siblings #759 + emails/activity tickets.
- [repo-wide] Overview body → **shell + placeholders** (no reuse-wiring of existing cards). The previously-shown `ContactOrganizationsCard` + `NotesCard` were removed from the page; siblings #760/#761/#762 re-add them properly in the right rail. This is an intentional interim change, not a regression to fix.
- Badge placement: inline with the name in the header (`DetailShell` `name` prop) instead of a duplicate identity row, to avoid repeating the avatar/name the header already shows.
- Header action buttons (Add to group/Edit/Add note): **omitted** in #758 (sibling-owned dialogs #761/#760/#759) rather than rendered as dead/disabled buttons.

## Open learnings
- [repo-wide] No stat/summary-tile component existed; added `StatTile` + `ContactSummaryStrip` in the contact feature. **Promote candidate**: if another overview needs a stat strip, lift these to `@/features/milo`.
- [repo-wide] Added shared `useUserEmailListQuery(userId, email)` in `user.queries.ts` (emails unioned by email + userRef). The Emails-sent sibling tab should reuse this instead of re-wiring `userEmailListQuery`.
- Prospect strip currently shows **only Contact groups** (user-only tiles gated on linked user; Emails sent gated too because the by-userRef selector needs a userId). If showing prospect email counts by email alone is wanted, relax the Emails tile's `enabled` to `!!email` — verify the empty-userRef field selector behavior first.
- `isPlatformUser(contact)` = `spec.subject?.kind === 'User' && !!spec.subject?.name` is the single discriminator for badge + user-only gating.

## Files touched
New: `features/contact/lib/contact-user-link.ts` (+test), `features/contact/components/contact-type-badge.tsx`, `features/contact/components/contact-summary-strip.tsx`, `routes/marketing/contact/detail/{notes,emails,activity}.tsx`.
Edited: `features/contact/index.ts`, `routes/marketing/contact/detail/{layout,index}.tsx`, `resources/request/client/queries/user.queries.ts`, `utils/config/{icons.config,routes.config}.ts`, `routes.ts`.
