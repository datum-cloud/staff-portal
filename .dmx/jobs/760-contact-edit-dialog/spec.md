---
ticket: 760
branch: feat/contact-edit-dialog
epic: 674
components: []
---

# #760 — Edit a contact from a dialog instead of an inline form

## Summary

The old Details page opened straight into an always-open edit form. The overview (#758) already replaced that with a read-only **About** card in the right rail. This ticket adds the way back to editing: an **Edit** action in the About card and in the page header, each opening a dialog that hosts the existing contact form (edit mode) with its duplicate-email check. Saving updates the card and header in place; Cancel discards.

## Acceptance criteria (from ticket)

- [ ] The About card shows the contact's fields, and the page shows no form until staff choose Edit. (card already read-only from #758 — this ticket adds Edit.)
- [ ] Saving the dialog updates the card and header without a reload, and Cancel discards changes.
- [ ] The dialog refuses an email another contact already uses and links to that contact.

## State today (built in #758)

- `ContactAboutCard` renders the contact's fields read-only in the right rail of `detail/index.tsx`. No Edit entry point.
- `DetailShell` header in `detail/layout.tsx` has no actions wired (#758 omitted them as sibling-owned).
- `ContactForm` already supports **edit mode** (`contact` prop): on submit it calls `contactUpdateMutation` and toasts; the `FormUniquenessGuard` + `useContactEmailExists` duplicate-email check already excludes the current contact via `existsArgs={[contact?.metadata?.name]}`.

## Data flow (decides "without reload")

- Header (`layout.tsx`) and About card (`index.tsx` via `useContactDetailData` → `useRouteLoaderData('contact-detail')`) both read the **same route loader** in `detail/layout.tsx`.
- So after a successful update: close the dialog and `useRevalidator().revalidate()`. Re-running the loader refreshes header + card together. No manual cache surgery.

## Approach / reuse

- **New** `EditContactDialog` component (`features/contact/components/`): self-contained trigger + `Dialog` (datum-ui) hosting `ContactForm` in edit mode. Trigger is configurable so the same component serves the card action and the header action (e.g. a `trigger` render-prop or a `variant` prop).
- **Reuse `ContactForm`** rather than duplicate it. It needs two small, additive props so the dialog can own cancel/close:
  - `onCancel?: () => void` — in edit mode the Cancel button calls this instead of navigating to the list. Default (create) keeps navigating.
  - `onSuccess?: (contact) => void` — called after a successful update so the dialog can close + revalidate. Create path keeps its navigate + toast.
  - Everything else (schema, duplicate guard, buttons, disabled logic) stays as-is. Flag: this edits a shared form, but only additively — the create route is unaffected.
- **Entry points:**
  - About card: an Edit action in the card header (check `SectionCard` action slot; otherwise a small button in the card body).
  - Page header: pass `actions={<EditContactDialog variant="header" .../>}` to `DetailShell` in `layout.tsx`.
- **Duplicate-email:** already handled by `ContactForm`; no new work beyond surfacing it in the dialog. Verify the link to the existing contact renders inside the dialog.

## Out of scope

- Group management (#761), platform/org cards (#762), notes/timeline edit (#759).
- The separate create route (`create.tsx`) keeps its current full-page form.

## Open questions

- Does `SectionCard` expose a header action slot, or does the Edit control go in the card body? (resolve while implementing; prefer the header slot if present.)
