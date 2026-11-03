---
ticket: gh-751
branch: feature-gh-751-support-general-and-per-service
summary: Support General and Per-Service Discounts in Staff Portal Offer API
ticketing: github-issues
---

# Support General and Per-Service Discounts in Staff Portal Offer API

**Ticket:** [#751](https://github.com/datum-cloud/staff-portal/issues/751)
**Type:** feature
**Branch:** feature-gh-751-support-general-and-per-service

---

## Context
Staff need to set commercial discounts when authoring Draft `Offer` resources (`billing.miloapis.com/v1alpha1`): an optional Offer-level discount (`spec.discount.percentage`) and optional per-service overrides (`spec.servicePricingRefs[].discount.percentage`). A per-service discount takes precedence, otherwise the service inherits the Offer-level discount, otherwise 0%. The Offer API already supports this in staging and production. The billing-provider change (milo-os/openmeter-provider#61) must be deployed to production before this UI is released.

## Scope
- Offer create flow (`app/routes/admin/offer/create.tsx`, `createOffer` in `billing.api.ts`) accepts an optional general discount and per-service discount overrides.
- Draft Offer update flow (`updateDraftOffer` / `detail.tsx`) can add, change and remove both discount levels while `spec.launchStage` is `Draft`.
- Validation: `percentage` must be a whole integer from 0 to 100 inclusive; anything else is rejected with a validation error.
- Offer detail view shows the general discount and per-service overrides.
- Automated tests cover creation with a general discount only, a per-service override only, and both together.

## Out of Scope
- Changes to `ServicePricing` definitions or `service-catalog`.
- Editing discounts on published (`GA`) Offers, which are immutable.
- Deployment and verification of milo-os/openmeter-provider#61 (a release gate, not code in this repo).

## Technical Approach
<!-- To be filled after Q&A. -->

---

## Questions
<!-- Answer each question below before running /dmx/plan. -->

1. The generated SDK types (`app/resources/openapi/billing.miloapis.com/v1alpha1/types.gen.ts`) have no `discount` field on `Offer`. Should we regenerate them with `npm run openapi:generate` against the current Milo API? If so, which environment should the spec come from (staging or production)?
   Answer: staging, i've signed into staging datumctl so you can get the session from there

2. The issue talks about "creation/update endpoints", but the staff portal has no Offer API of its own. It calls the Milo API through generated SDK functions. Is the scope therefore the create form, the Draft edit flow, the detail view and the `billing.api.ts` functions, with no new server routes?
   Answer: yes

3. Where should per-service overrides be entered? Options: an inline percentage input on each service row in the create/edit service list (`offer-included-pricing-list.tsx`), or a separate discounts section. Should an empty input mean "inherit the general discount"?
   Answer: a seperate discounts section and yes empty should mean inherit general

4. On the detail view, should we show only the configured percentages, or also each service's resolved discount (override → general → 0%) and the discounted price? For `GA` Offers, should the display read the snapshotted values in `spec.servicePricings`?
   Answer: what ever you think is best

5. Which test level do the acceptance-criteria tests need? Options: unit tests on the zod schema and the request payload builders, or end-to-end tests through the create flow.
   Answer:unit tests is fine for this
