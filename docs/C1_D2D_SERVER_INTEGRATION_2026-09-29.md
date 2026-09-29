# D2D original-input calculation integration

Base: efc40ef819cf82fd95b62641a6e9b850b71057c7; branch codex/cost-tires-release-s14. Worktree D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, initially clean.

## Outcome

Product page /scenarios/benchmark now submits original route/fixed/trailer inputs through the existing same-origin BFF to POST /engine/benchmark-owned-d2d. The endpoint recomputes CFU/CVU using calculateOwnedD2DScenarios; it does not trust submitted totals. The original offline reader remains in its QA harness. This is advanced JSON input, NOT the finished operator-friendly form.

Adopt/adapt/reject: adopt existing Supabase authentication, role guard and BFF; adapt the existing pure calculator and review cards; reject client-calculated totals, new auth stacks, persisted scenario records, automatic economic adoption and example values in the product form.

## Boundaries

- Existing verified identity supplies subject/organization; ADMIN/OPERATOR only. Body schema rejects tenant IDs and completed totals. Stateless handler queries/writes no business records, caches no results and returns no-store.
- Existing authentication remains unchanged and may perform its pre-existing user resolution/provisioning. No live authenticated call was performed in this increment.
- Request body limited to 256,000 bytes. Only review projection is returned, avoiding repeated input lineage. No document fetch from evidence URLs.
- Every result remains uncalibrated, DOCUMENTED_UNVERIFIED, with purchaseCostUsd and sellPriceUsd null. Arithmetic execution does not establish documentary sufficiency.
- Client invalidates results on edit/clear/session expiry and discards late responses. No local storage, save, adopt or publish action.

## Evidence

- API: 8 tests passed with mock authentication and database access configured to throw. Covers allowed roles, missing session/org, viewer denial, tenant/total injection, incomplete evidence, body limit, separate stateless requests for organizations A/B.
- Web: 6 new interaction tests plus 4 existing review tests passed. Covers empty input, BFF request shape, computed rendering, malformed input, late response after clear, forbidden and incomplete results. Transport is mocked: not an end-to-end authenticated acceptance test.
- API and web typechecks passed. No full build or deployment performed.
- Local browser harness: empty form, invalid JSON alert, clear, keyboard activation verified. Embedded document widths 1440 and 390 equaled scrollWidth (no horizontal overflow). Pointer automation did not activate controls reliably, including the plain viewport buttons; keyboard activation used and pointer/touch acceptance remains unverified.
- Screenshot design/owned-d2d-calculator-qa.png is desktop local QA with network blocked, not a logged-in deployment. Wireframe/handoff design/owned-d2d-calculator-wireframe.md follows design-handoff skill for responsive states, tokens and accessibility.

## Rollback and next gate

Inverse this scoped commit to restore the offline product reader and remove endpoint registration. No database rollback or migrations required. Existing remote Preview and production remain unchanged.

Next: replace advanced JSON entry with guided route/assets/economic inputs backed by documented evidence, then validate paired frontend/API in isolated Preview with a real operator session. Confirm endpoint, role denial, incomplete evidence, reload and no adoption. No claim that all bases or benchmark sections are calibrated.

Model recommendation: Astra/high for API/session integration and race-condition review; Sol/medium for guided UI after input contract is fixed. These are recommendations, not a claim of runtime model switching.
