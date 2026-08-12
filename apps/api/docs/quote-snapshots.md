# Reproducible quote snapshots

New saved quotes embed a `fcm.calculation-snapshot.v1` inside their immutable
explanation record. The snapshot has no dependency on the current database or
on live reference data.

It contains:

- the effective engine input, including the complete resolved parameter map
  after overrides, equipment, policy, FX and resolved legs;
- the key output values used to evaluate reproducibility;
- a SHA-256 checksum covering all snapshot content.

`POST /quotes/:id/replay` reruns the pure cost engine using only this snapshot.
It returns whether the checksum and output values both match. It does not edit
the quote, update parameters, or approve a commercial decision.

Historical quotes created before this feature return `409` for replay and are
explicitly labelled as non-reproducible rather than being represented as
verified. This is intentional: evidence may be absent, and a later inference
must not be confused with the original calculation.

Snapshots remain quote evidence. They do not create, update or publish a
RateBook; any future Rateware integration must consume them under human review.
