# Tasks — #760 Edit a contact from a dialog

## Phase 1 — Make `ContactForm` dialog-friendly (additive) ✅
- [x] 1.1 Added optional `onCancel?: () => void` and `onSuccess?: () => void`. Edit path: Cancel → `onCancel ?? navigate(list)`; after update → `onSuccess?.()` (toast kept). Create path unchanged (still navigates).
- [x] 1.2 tsc + eslint clean; create route unaffected (only edit path touched).

## Phase 2 — `EditContactDialog` ✅
- [x] 2.1 New `features/contact/components/edit-contact-dialog.tsx`: datum-ui `Dialog` (controlled open, matches codebase pattern), hosts `ContactForm` in edit mode. `variant='header'|'card'` styles the trigger (`ACTION_ICONS.edit`).
- [x] 2.2 On success: close + `useRevalidator().revalidate()`. On cancel: close, discard. Radix unmounts Content on close → form remounts with fresh values on reopen.
- [x] 2.3 Exported from `features/contact/index.ts`.

## Phase 3 — Wire entry points ✅
- [x] 3.1 About card uses `SectionCard` `action` slot (it has one) → `EditContactDialog variant="card"`. Added `user` prop to the card; `index.tsx` passes it.
- [x] 3.2 `DetailShell` `actions` (EntityHeader forwards it) → `EditContactDialog variant="header"` in `detail/layout.tsx`.

## Phase 4 — Verify
- [x] 4.1 eslint --fix + prettier clean on changed files.
- [x] 4.2 tsc clean (0 non-date-fns errors); no new logic needing vitest.
- [ ] 4.3 Run the app (dev server via `!`): Edit from card and header opens dialog; save updates card+header without reload; Cancel discards; duplicate email blocks + links to the existing contact. ← developer to confirm
