# D2D guided input increment

Base HEAD e1d89ea7f68c4da602e971d4b082b82f4c65c12e, branch codex/cost-tires-release-s14, initially clean D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927.

## Delivered

Replaced advanced JSON capture with three structured blocks: route/MX-US legs; trailer capital/fixed costs; trailer utilization. Nested documentary evidence, scenarios, financing, expenses and references can be added/removed through fields. Numbers start empty, not zero. Existing pure motor and authenticated POST are unchanged.

Reused Zod contract as field metadata via authenticated GET /engine/benchmark-owned-d2d/form, with the same ADMIN/OPERATOR and organization checks. Only canonical parameter keys and units are seeded; catalog default values are never serialized. Reject unsupported future schema kinds instead of silently dropping them. API schema validates all submitted values; client blank numeric strings are rejected rather than coerced. No financial model/formula changes.

The design-handoff skill informed docs/design/owned-d2d-guided-wireframe.md (states, tokens, keyboard, mobile behavior). Reuses existing MARKSMAN tokens, no new brand assets. Each group mounts its children only when opened; initial eager rendering caused a test timeout and was corrected. Related UI test runtime dropped from approximately 24 seconds to 0.3 seconds locally.

## Validation

- 12 API tests PASS: includes metadata access control, static QA metadata equals live descriptor, seeded rows contain only key/unit, blank numeric rejected and explicit documented zero accepted.
- 10 web tests PASS (6 guided/calculation + 4 offline review): structured request, blank numeric retention, switching blocks, clearing, late-response discard, field error paths and session-expiry clearing without refetch loop.
- API and web typechecks PASS. No full production build or deploy performed.
- Local browser with static descriptor and remote calculation blocked: block switching preserves chosen direction, capital expands, acquisition value blank is distinct from entered zero, clear restores blank. Keyboard used for activation.
- Embedded 390x844 document clientWidth=scrollWidth=371; embedded 1440x900 clientWidth=scrollWidth=1421. No document horizontal overflow. Screenshot docs/design/owned-d2d-guided-qa.png is direct local QA, not authenticated Preview.

## Honest limits / next

This is a first structured editor, not final operator usability acceptance. Technical canonical keys and some enum declarations remain visible. References are explicit ID lists, not source pickers. Dates/asset references repeated across dossiers are not automatically synchronized. Real complete-dossier interaction, pointer/touch acceptance and authenticated frontend/API Preview remain pending. The benchmark remains uncalibrated; no bases adopted or populated, no business writes, Auth/DB/infrastructure changes or deployment.

Next focused increment: source selectors and shared service-date/asset context with visible propagation, then a complete evidenced dossier test. Do not fill missing economics with synthetic assumptions. Recommended Sol/medium for UI; Astra/high only for changed economic or access rules. No runtime model-switch claim.

Rollback: inverse this scoped commit to restore the advanced JSON form; remove GET metadata registration and test-only descriptor/screenshot. No database rollback needed.
