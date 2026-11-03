# Active Context: gh-788

## Open Learnings

## Open Decisions
- Usage spike threshold isn't in the spec: `USAGE_SPIKE_FACTOR = 5`× last cycle at the same point, ignored when last cycle's spend was under 1 (`USAGE_SPIKE_MIN_PREVIOUS`). Confirm or change.
- The invoices table shows each invoice's period start and end as stored, in UTC. If `period.end` is exclusive, the end date reads a day late.
- The projects card fetches spend for the first 25 linked projects (`MAX_PROJECT_SPEND_REQUESTS`) and says so when there are more.
- The payment card lists every payment method, default first, in place of the old payment methods table. The configuration card merges invoice frequency and day into one row and drops the linked projects count, which the projects card shows.
- The design's usage spike callout ("vCPU hours jumped 4× on Nov 9") isn't built; it isn't in tasks.md.
- The tax ID row has no fix-it button: staff can't add a tax ID, Cloud Portal only opens the customer's page, and the billing account carries no Stripe customer ID to link to.

## Session Notes
- Phase 1 complete: client invoice list and hook, usage dashboard `billingAccount`/`until` scope, invoice summary and account health selectors with tests.
- Phase 2 complete: loader fetches the account and org name only; header, attention banner and health tiles load on the client with per-tile skeletons. The old sections remain, now on client queries with skeletons, until Phase 3 replaces them. Not yet checked in a running app (no `.env` here).
- Committed Phases 1 and 2; promoted usage scoping, page walking, loader `initialData` and the cycle-date DST constraint to core files.
- Phase 3 complete: usage, invoices, projects, payment, offer, contact, configuration and activity cards; old sections, `OfferSwitcherCard`, `PaymentTermsCard` and the four unused server functions removed. Not checked in a running app.
- Committed Phase 3 with the header Actions opening the payment terms and switch offer dialogs; promoted per-project usage queries and billing activity scoping to core files.
- Merged `main` (stale-invoice filter, React Router 8). Added card brand marks, a fuller offer card, the 30-day activity range, and hid $0 spend in the meter picker after reviewing the container build.
- Code review fixes: UTC cycle maths and dates, net days in effect, void invoices out of the unusual check, per-cycle credit limit, one spike rule, honest banner when checks fail, shared StatTile/AttentionBannerShell/MeterAreaChart/SpendValue/TableCard description, one billing money formatter, shared account status badge, capped project spend requests, and no Grant terms while an application is pending.
- Committed the review fixes; full memory sync for the PR (dashboard behaviour → productContext, shared components and billing money/terms → systemPatterns, UTC cycle maths, activity range, Node 26 and container dev → techContext). Draft PR opened.
