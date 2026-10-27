# Active Context: gh-751

## Open Learnings
- [repo-wide] Offer GA snapshots (`spec.servicePricings[].discount`) carry the resolved per-service discount.

## Open Decisions
- Detail view shows resolved discount percentages (override / inherited), not discounted prices (spec Q4 left to implementer).

## Session Notes
- Until Phase 2 wires discounts into `DraftConfigEditor`, saving a Draft there sends `discount: null` and rebuilds refs without overrides, so it clears any discounts set through the API.
- Billing SDK regenerated from staging, discount helpers + tests, discount support in createOffer/updateDraftOffer — Phase 1 complete.
