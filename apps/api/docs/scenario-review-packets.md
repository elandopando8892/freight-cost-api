# Scenario review packets

`ScenarioReview` captures a human-reviewable proposal generated from a quote's
reproducible calculation snapshot. It is not an assumption version, a quote
replacement, or a RateBook action.

## Flow

1. An `ADMIN` or `OPERATOR` selects a quote snapshot and proposes one or more
   existing snapshot parameters.
2. `POST /scenario-reviews` recalculates the scenario server-side, stores the
   requested values, computed baseline/proposed/delta evidence and the source
   snapshot checksum as `DRAFT`.
3. The requester explicitly submits the draft, moving it to `UNDER_REVIEW`.
4. A different `ADMIN` approves or rejects it with a decision note.

Approval is an auditable human decision only. There is intentionally no API in
this module that changes `AssumptionSet`, `Quote`, `RateBook`, or Rateware.

## Approved draft handoff

An administrator may explicitly call
`POST /scenario-reviews/:id/assumption-version` after approval. This creates
one inactive `AssumptionSet` in `DRAFT`, with a lineage link back to the review
packet. Its parameter metadata is cloned from the governed source version, but
its values are rebuilt from the immutable quote snapshot plus the approved
scenario changes. It does not publish, activate, regenerate a RateBook, or
send anything to Rateware.

Before a scenario-derived draft can be published, an administrator must
explicitly acknowledge the release impact. The server recomputes the parameter,
saved-quote, and production-route impact at publish time and stores its summary
with the version audit event. Activation remains a separate action. Only after
a human activates a published version can the existing RateBook regeneration
workflow use confirmed quotes on that active version.

## Guardrails

- The source quote must belong to the caller's organization and have a verified
  reproducible snapshot.
- Parameter keys must already exist in that snapshot.
- Evidence is recalculated on the server and stored as a plain JSON snapshot.
- The requester cannot decide their own review.
