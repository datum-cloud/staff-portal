# Active Context: gh-788

## Open Learnings
- [repo-wide] `payment-terms-card.tsx` no longer exports a card: it holds `usePaymentTerms`, `PaymentTermsDialogs`, the terms detail and history pieces, and `PaymentTermsFormDialog` (also used by `application-review.tsx`). A rename would make that clearer.

## Open Decisions
- Health issues are returned as typed data (`{ key, severity, ...params }`) rather than the spec's `{ title, detail, action }` strings, so the banner can translate them with Lingui. The banner maps each key to its copy and fix-it link.
- Usage spike threshold isn't in the spec: `USAGE_SPIKE_FACTOR = 5`× last cycle at the same point, ignored when last cycle's spend was under 1 (`USAGE_SPIKE_MIN_PREVIOUS`). Confirm or change.
- The next-invoice helper is `getNextInvoice` (issue date, due date, frequency, net days) rather than `getNextInvoiceDate`, because the health card shows the due date too.
- The header's Actions menu opens the dialogs: Grant payment terms (or Change, when terms exist) and Switch offer. The page holds `usePaymentTerms` and the switch dialog's open state so the header and the cards share them. The banner's fix-it buttons still scroll to sections by id (`BILLING_ACCOUNT_SECTION_IDS`).
- Health tiles copy the platform home's `HealthCard` chrome locally, since it isn't exported from `features/dashboard`. Extracting a shared tile would touch the dashboard feature.
- The activity card looks back 90 days (`now-90d`), since billing changes are sparse; the home feed uses 7 days.
- The invoices table shows each invoice's period start and end as stored. If `period.end` is exclusive, the end date reads a day late.
- The payment card lists every payment method, default first, in place of the old payment methods table. The configuration card merges invoice frequency and day into one row and drops the linked projects count, which the projects card shows.
- The design's usage spike callout ("vCPU hours jumped 4× on Nov 9") isn't built; it isn't in tasks.md.
- Switching offer is one dialog (pick, then Switch), replacing the old inline picker plus a separate confirm dialog.

## Session Notes
- Phase 1 complete: client invoice list and hook, usage dashboard `billingAccount`/`until` scope, invoice summary and account health selectors with tests.
- Phase 2 complete: loader fetches the account and org name only; header, attention banner and health tiles load on the client with per-tile skeletons. The old sections remain, now on client queries with skeletons, until Phase 3 replaces them. Not yet checked in a running app (no `.env` here).
- Committed Phases 1 and 2; promoted usage scoping, page walking, loader `initialData` and the cycle-date DST constraint to core files.
- Phase 3 complete: usage, invoices, projects, payment, offer, contact, configuration and activity cards; old sections, `OfferSwitcherCard`, `PaymentTermsCard` and the four unused server functions removed. Not checked in a running app.
- Committed Phase 3 with the header Actions opening the payment terms and switch offer dialogs; promoted per-project usage queries and billing activity scoping to core files.
