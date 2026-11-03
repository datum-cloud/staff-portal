# Active Context: gh-788

## Open Learnings
- [repo-wide] `payment-terms-card.tsx` no longer exports a card: it holds `usePaymentTerms`, `PaymentTermsDialogs`, the terms detail and history pieces, and `PaymentTermsFormDialog` (also used by `application-review.tsx`). A rename would make that clearer.
- [repo-wide] The card brand marks in `features/billing/components/card-brand-icons/` are copies of cloud-portal's; keep the two in step if either changes.
- [repo-wide] `billing-cycle.ts` now does all month stepping and range labels in UTC (`shiftCycle`, `Intl` with `timeZone: 'UTC'`), with tests under New York and Auckland time. This supersedes the techContext note about `addMonths` and daylight saving; update it at the next commit.
- [repo-wide] Shared dashboard pieces: `StatTile` (+ `StatTileHeadline`/`Detail`/`Message`/`Skeleton`) in `app/components/stat-tile`, `AttentionBannerShell` in `app/components/attention-banner`, `MeterAreaChart` in `features/organization/usage/components`. `TableCard` takes a `description`, and `TABLE_CARD_FRAME_CLASS` is exported from milo.
- [repo-wide] Billing amounts (invoices, balances, limits) format with `formatMoney` from billing utils (always cents); usage spend keeps `formatCurrency`/`SpendValue` from the usage feature (sub-cent precision). Net days come from `getEffectiveNetDays`: the arrangement's, else the standard terms'.
- [repo-wide] After `main`'s React Router 8 upgrade, `npm ci` on Node 26 is needed; the shell's default Node 20 can't run vitest against the new `node_modules`.

## Open Decisions
- Health issues are returned as typed data (`{ key, severity, ...params }`) rather than the spec's `{ title, detail, action }` strings, so the banner can translate them with Lingui. The banner maps each key to its copy and fix-it link.
- Usage spike threshold isn't in the spec: `USAGE_SPIKE_FACTOR = 5`× last cycle at the same point, ignored when last cycle's spend was under 1 (`USAGE_SPIKE_MIN_PREVIOUS`). Confirm or change.
- The next-invoice helper is `getNextInvoice` (issue date, due date, frequency, net days) rather than `getNextInvoiceDate`, because the health card shows the due date too.
- The header's Actions menu opens the dialogs: Grant payment terms (or Change, when terms exist; or Review terms application while one is pending) and Switch offer. The payment card hides its "No payment terms / Grant terms" box while an application is pending. The page holds `usePaymentTerms` and the switch dialog's open state so the header and the cards share them. The banner's fix-it buttons still scroll to sections by id (`BILLING_ACCOUNT_SECTION_IDS`).
- The activity card looks back 30 days (`now-30d`): the activity API rejects ranges over 720h, which is what broke the first build's `now-90d`.
- The invoices table shows each invoice's period start and end as stored, in UTC. If `period.end` is exclusive, the end date reads a day late.
- The credit limit is per billing cycle, so its check compares this cycle's spend with it, not the open balance. The large-card-balance check only runs for USD, EUR and GBP (10,000 each); other currencies skip it.
- The projects card fetches spend for the first 25 linked projects (`MAX_PROJECT_SPEND_REQUESTS`) and says so when there are more.
- The payment card lists every payment method, default first, in place of the old payment methods table. The configuration card merges invoice frequency and day into one row and drops the linked projects count, which the projects card shows.
- The design's usage spike callout ("vCPU hours jumped 4× on Nov 9") isn't built; it isn't in tasks.md.
- Switching offer is one dialog (pick, then Switch), replacing the old inline picker plus a separate confirm dialog.
- The tax ID row has no fix-it button: staff can't add a tax ID, Cloud Portal only opens the customer's page, and the billing account carries no Stripe customer ID to link to.

## Session Notes
- Phase 1 complete: client invoice list and hook, usage dashboard `billingAccount`/`until` scope, invoice summary and account health selectors with tests.
- Phase 2 complete: loader fetches the account and org name only; header, attention banner and health tiles load on the client with per-tile skeletons. The old sections remain, now on client queries with skeletons, until Phase 3 replaces them. Not yet checked in a running app (no `.env` here).
- Committed Phases 1 and 2; promoted usage scoping, page walking, loader `initialData` and the cycle-date DST constraint to core files.
- Phase 3 complete: usage, invoices, projects, payment, offer, contact, configuration and activity cards; old sections, `OfferSwitcherCard`, `PaymentTermsCard` and the four unused server functions removed. Not checked in a running app.
- Committed Phase 3 with the header Actions opening the payment terms and switch offer dialogs; promoted per-project usage queries and billing activity scoping to core files.
- Merged `main` (stale-invoice filter, React Router 8). Added card brand marks, a fuller offer card, the 30-day activity range, and hid $0 spend in the meter picker after reviewing the container build.
- Code review fixes: UTC cycle maths and dates, net days in effect, void invoices out of the unusual check, per-cycle credit limit, one spike rule, honest banner when checks fail, shared StatTile/AttentionBannerShell/MeterAreaChart/SpendValue/TableCard description, one billing money formatter, shared account status badge, capped project spend requests, and no Grant terms while an application is pending.
