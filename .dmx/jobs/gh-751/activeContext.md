# Active Context: gh-751

## Open Learnings
- [repo-wide] Offer GA snapshots (`spec.servicePricings[].discount`) carry the resolved per-service discount.

## Open Decisions
- Detail view shows resolved discount percentages (override / inherited), not discounted prices (spec Q4 left to implementer).

## Session Notes
- Billing SDK regenerated from staging, discount helpers + tests, discount support in createOffer/updateDraftOffer — Phase 1 complete.
- Discounts section (OfferDiscountsFields) wired into Offer create and the Draft editor; deselecting a service drops its override — Phase 2 complete. Not yet checked in a running app.
