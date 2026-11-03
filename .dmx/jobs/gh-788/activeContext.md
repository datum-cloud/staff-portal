# Active Context: gh-788

## Open Learnings
- [repo-wide] With the detail bundle gone, `billingAccountBindingsForOrgRequest`, `paymentMethodsForOrgRequest`, `invoicesForOrgRequest` and `billingEntitlementsForOrgRequest` in `server/billing.request.ts` have no callers.

## Open Decisions
- Health issues are returned as typed data (`{ key, severity, ...params }`) rather than the spec's `{ title, detail, action }` strings, so the banner can translate them with Lingui. The banner maps each key to its copy and fix-it link.
- Usage spike threshold isn't in the spec: `USAGE_SPIKE_FACTOR = 5`× last cycle at the same point, ignored when last cycle's spend was under 1 (`USAGE_SPIKE_MIN_PREVIOUS`). Confirm or change.
- The next-invoice helper is `getNextInvoice` (issue date, due date, frequency, net days) rather than `getNextInvoiceDate`, because the health card shows the due date too.
- The header's Actions menu and the banner's fix-it buttons scroll to dashboard sections by id (`BILLING_ACCOUNT_SECTION_IDS`: `invoices`, `payment-terms`, `offer`). Phase 3's cards must keep those ids; the Actions items could open the grant and switch dialogs directly instead.
- Health tiles copy the platform home's `HealthCard` chrome locally, since it isn't exported from `features/dashboard`. Extracting a shared tile would touch the dashboard feature.

## Session Notes
- Phase 1 complete: client invoice list and hook, usage dashboard `billingAccount`/`until` scope, invoice summary and account health selectors with tests.
- Phase 2 complete: loader fetches the account and org name only; header, attention banner and health tiles load on the client with per-tile skeletons. The old sections remain, now on client queries with skeletons, until Phase 3 replaces them. Not yet checked in a running app (no `.env` here).
- Committed Phases 1 and 2; promoted usage scoping, page walking, loader `initialData` and the cycle-date DST constraint to core files.
