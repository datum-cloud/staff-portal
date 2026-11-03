---
ticket: 758
branch: feat/contact-overview-layout
epic: 674
components: []
---

# #758 — Lay out the contact page as an overview

## Summary

Replace the contact **Details** page (today an always-open edit form) with an **overview**: a header (identity row), a 5-stat summary strip, and a two-column body (main + right rail). Expand the left entity rail from 2 items to 5: Overview, Notes, Contact groups, Emails sent, Activity.

This is the **shell** that the sibling tickets of epic #674 sit in:
- #759 — notes + history timeline (fills the main column)
- #760 — edit-via-dialog + About card (right rail)
- #761 — manage contact groups (right rail card)
- #762 — platform account + organizations cards (right rail)

## Scope (decided with developer)

- **New rail tabs → thin placeholder routes now.** #758 adds the nav items *and* minimal route files (empty-state stubs) for Notes / Emails sent / Activity so the tabs resolve; siblings flesh them out. Contact groups + Overview use existing routes.
- **Overview body → shell + placeholders.** #758 builds header + summary strip + the responsive two-column grid with empty-state placeholders in each column. Siblings #759–762 drop their timeline/cards in. No reuse-wiring of existing cards in this ticket (avoids rework/overlap).

## Acceptance criteria (from ticket)

- [ ] Header + summary strip show real values for a contact with a linked user.
- [ ] For a contact with no linked user: badge reads "Prospect"; strip omits user-only stats (platform access, organizations, fraud).
- [ ] Columns stack into one at narrow widths.

## Approach / reuse

- Header chrome: existing `DetailShell` + `EntityHeader` (milo). Identity row (avatar, name, **Platform user/Prospect** badge, meta: email · "Contact since …" · resource name, actions Add to group/Edit/Add note) rendered at top of the Overview page.
- Rail: `handle.entityNav` in `routes/marketing/contact/detail/layout.tsx` (copy the 5-item shape incl. nested Activity from `routes/customer/user/detail/layout.tsx`).
- Data (all exist): contact (loader `contactDetailQuery`), linked user (`userDetailQuery`/`useUserDetailQuery`), `usePlatformAccessQuery`, `useFraudEvaluationListQuery`, `usePasskeyListQuery`, `useUserOrganizationListQuery`, `useContactGroupMembershipListQuery`.
- Prospect discriminator: `contact.spec.subject?.kind === 'User'` → loader `data.user` undefined for a prospect.
- Layout precedent: `routes/customer/user/detail/index.tsx` grid (`grid-cols-1 md:grid-cols-2`), `SectionCard` primitive. className overrides only — do NOT modify datum-ui.

## Build-new (not found in repo)

1. 5-stat summary strip (StatTile + strip) — no stat/tile component exists.
2. "Platform user" / "Prospect" badge.
3. Thin placeholder routes + `contactRoutes` helpers for notes/emails/activity.
4. The Overview two-column shell.

## Open decisions / flags

- **Header duplication:** `DetailShell`/`EntityHeader` already shows name+email; the design's identity row repeats some of that with badge+meta+actions. Resolve during impl (likely simplify DetailShell subtitle or fold identity row into header) — flag, don't expand scope.
- **Header action buttons** (Add to group/Edit/Add note) trigger sibling-owned dialogs (#761/#760/#759). In #758 they are visual placeholders (present, non-functional) wired by siblings.

## dmx setup

Branch + job folder scaffolded manually (dmx MCP prompts not wired this session); git flow per repo conventions (branch off latest main, signed commits, no AI footer).
