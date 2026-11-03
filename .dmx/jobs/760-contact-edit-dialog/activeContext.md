# Active context — #760

## Open learnings
- [repo-wide] Contact detail header (`detail/layout.tsx`) and the overview's cards (`detail/index.tsx` via `useContactDetailData` → `useRouteLoaderData('contact-detail')`) read the **same** route loader in `detail/layout.tsx`. After a mutation, `useRevalidator().revalidate()` refreshes both with no reload — no manual query cache work.
- [repo-wide] `SectionCard` (milo) has a right-aligned header `action` slot. `DetailShell`/`EntityHeader` (milo) take an `actions` prop for header-level actions.
- [repo-wide] `ContactForm` now takes optional `onCancel`/`onSuccess` so it can be hosted in a dialog; defaults preserve the create route's navigate-to-list behaviour. Edit mode hides the groups/association fields already (`{!contact && ...}`), so it drops cleanly into a small dialog.

## Open decisions
- Reused `ContactForm` in a `Dialog` rather than the generic `DialogForm` helper, because the ticket calls for the existing form + its `FormUniquenessGuard` duplicate-email check. `DialogForm` owns its own schema/footer and would have meant duplicating both.

## Session notes
- Branch `feat/contact-edit-dialog` stacked on the merged overview; fast-forwarded onto main after #781 merged.
- Not yet committed — holding for developer's live test (task 4.3).
