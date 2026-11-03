---
ticket: gh-788
branch: feature-gh-788-build-a-billing-account-dashboard
summary: Build a billing account dashboard
ticketing: github-issues
---

# Build a billing account dashboard

**Ticket:** [#788](https://github.com/datum-cloud/staff-portal/issues/788)
**Type:** feature
**Branch:** feature-gh-788-build-a-billing-account-dashboard
**Derived from:** design mock (`docs/design/`), uncommitted on main

---

## What Was Built
A design mock in Pen of the billing account detail page reworked as a dashboard. No app code yet.

- `docs/design/billing-account-overview.pen`: the dashboard, a datum-ui component sheet, an open-state frame for the meter select, and design notes
- `docs/design/exports/*.png`: exports of the dashboard, the component sheet and the meter select

## Files Changed
- `docs/design/billing-account-overview.pen` (new)
- `docs/design/exports/billing-account-dashboard-v2.png` (new)
- `docs/design/exports/datum-ui-components.png` (new)
- `docs/design/exports/meter-select-open.png` (new)

## Context
`app/routes/customer/billing-account/detail/index.tsx` is a stack of description lists and tables. Staff can't tell at a glance whether an account is healthy. Past-due invoices, implausible invoice totals, or a huge balance on a card account only show up if you read every row.

The route loader (`billingAccountDetailBundleRequest`) also waits for the account, bindings, payment methods, every invoice in the org, entitlements and the organization before the page renders, so navigation blocks on the slowest call.

## Scope
- **Thin loader.** The detail layout loader fetches only what the breadcrumb and page header need: the billing account (plus the organization display name, if cheap). Everything else moves to client-side React Query hooks that each card owns, so the route change doesn't wait on them.
- **Loading and error states.** Each card renders a datum-ui `Skeleton` that matches its final shape while loading, and an inline error state that doesn't break the rest of the page, following `features/dashboard/components/home/health-section.tsx`.
- **New client data access** (following the request layering in `systemPatterns.md`):
  - Invoices for the account: API function in `billing.api.ts` and a hook in `billing.queries.ts`
  - `/api/usage/dashboard` gains an optional `billingAccount` param (scope usage to this account rather than the org's first Ready account) and an optional `until` param (a previous cycle cut at the same day, for the "vs last cycle" trend)
  - Per-project spend: one `/api/usage/dashboard?project=` call per linked project
- **Pure selectors** in `app/features/billing/lib/` (unit-tested):
  - Account health checks that return a list of `{ key, severity, title, detail, action }`
  - Invoice aging buckets, outstanding and past-due totals, lifetime paid
  - Next invoice date from `paymentTerms`, reusing `modules/billing/billing-cycle.ts`
- **Components** in `app/features/billing/components/billing-account-dashboard/`:
  - Page header: `PageHeader` with a `BadgeState` and a metadata line; actions are View organization, Open in Cloud Portal, and an Actions dropdown (grant terms, switch offer)
  - Attention banner: the `AttentionBanner` pattern, with a severity `BadgeState`, a detail line and a fix-it `Button` per row, and a line of passing checks
  - Health cards: a row of `Card size="sm"` tiles matching `HealthCard` (outstanding balance, past due, usage this cycle with trend, next invoice, lifetime paid)
  - Usage card (`SectionCard`): spend so far, a meter `Select` grouped by service and sorted by spend with idle meters left out, a daily usage `AreaChart` styled like the org usage `MeterCard`, and spend by service (top 3 plus a link to the usage dashboard). It opens on the highest-spend meter, and clicking a service selects its top meter.
  - Invoices `TableCard`: aging summary plus `DataTable` with `EMBEDDED_TABLE_*` classes; past-due rows pinned first, download and copy actions
  - Linked projects `TableCard`: project link, linked date, share of spend bar, spend, status
  - Side column: payment (default card, payment terms; reuses the existing `PaymentTermsCard` dialogs), offer (reuses the `OfferSwitcherCard` switching), billing contact and configuration (`DescriptionList`), activity (`ActivityFeed` compact, filtered by `apiGroups: ['billing.miloapis.com']` and `resourceNamespaces: ['organization-{org}']`, filter controls hidden)
- **Route.** `detail/index.tsx` composes the dashboard; the layout loader and `shared.ts` are slimmed to match.
- **Tokens and i18n.** datum-ui theme tokens and existing class constants only (`SECTION_CARD_CHROME`, `EMBEDDED_TABLE_*`, `STATUS_BADGE_CLASS`). All strings go through Lingui.
- **Design files.** Commit `docs/design/` with the branch.

## Out of Scope
- Activity policies for Invoice or system (`system:*`) actors in the billing repo, so invoice issued, past-due and payment events won't appear in the feed
- Invoice estimates (the usage API returns spend to date only)
- A separate invoices list route ("All invoices" expands in place)
- Changes to `@datum-cloud/datum-ui` or `@datum-cloud/activity-ui`
- Stale-invoice filtering (#787). The checks run on whatever list `getInvoicesForAccount` returns, and pick up #787's filter once it merges.
- Dark-mode-specific design work beyond what the tokens give us

## Technical Approach
- The detail layout loader keeps `getBillingAccountDisplayName` for the breadcrumb. Cards read `orgName` and `accountName` from route params and the account from React Query, seeded from the loader data with `initialData` to avoid a second fetch.
- Query keys extend `billingQueryKeys` and `usageQueryKeys`. Per-project usage uses `useQueries` with `staleTime` matching the org usage page.
- Health checks are pure functions over `{ account, invoices, paymentMethods, entitlement, arrangement, usage }`. The banner renders while partial data loads: checks whose inputs aren't loaded yet are skipped, and the summary shows a `Skeleton`.
- Skeletons mirror the final layout (headline `h-8 w-20`, table rows `h-8`), as in `health-section.tsx`'s `CardSkeleton`.
- Charting uses `recharts` with `var(--primary)` stroke and gradient, as in `features/organization/usage/components/meter-card.tsx`.

---

## Questions
<!-- Answer these before running /dmx/plan. -->

1. What thresholds should trigger the two heuristic checks? Proposed: "unusual invoice" when an invoice total is above 100× the account's median non-zero invoice total (needs ≥ 3 prior invoices); "large card balance" when the open balance on a card-billed account (no payment arrangement) exceeds 10,000 in the account currency.
   Answer: Use the proposed thresholds: 100× the median non-zero invoice total (needs ≥ 3 prior invoices), and an open balance above 10,000 on card-billed accounts.

2. Should "All invoices" expand the table in place (paginated `DataTable` with the existing search box), rather than link to a new route?
   Answer: Yes, expand in place. No new route.

3. Does the usage "vs last cycle" trend compare spend so far against the previous cycle cut at the same day of the cycle?
   Answer: Yes, via the new `until` param on `/api/usage/dashboard`.

4. Should activity show only people's changes, with no filter details shown to users?
   Answer: Yes. Hide the feed's filter controls and don't describe the filter in the UI.
