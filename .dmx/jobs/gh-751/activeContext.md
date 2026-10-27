# Active Context: gh-751

## Open Learnings

## Open Decisions
- Detail view shows resolved discount percentages (override / inherited), not discounted prices (spec Q4 left to implementer).

## Session Notes
- Billing SDK regenerated from staging, discount helpers + tests, discount support in createOffer/updateDraftOffer — Phase 1 complete.
- Discounts section (OfferDiscountsFields) wired into Offer create and the Draft editor; deselecting a service drops its override — Phase 2 complete. Not yet checked in a running app.
- General discount on the Offer overview and a Discount column (resolved %, override / inherited, GA reads snapshot values) on the included charges table — Phase 3 complete. Typecheck, lint, 213 tests pass; not yet checked in a running app.
