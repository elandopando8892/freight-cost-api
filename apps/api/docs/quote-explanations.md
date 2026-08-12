# Explainable quotes

Every newly saved quote stores a server-generated `explanation` payload in the
same transaction as its numeric results. It is an immutable evidence record;
the quote detail reads it rather than recalculating a historical decision.

## Contents

- exact calculation context: operation, service, equipment, requested FX,
  override count and supplied leg inputs;
- governed lineage: calculation policy, cost base and assumption version;
- calculation components: baseline, per-leg production cost, risk adjustment,
  tariff, reference key and market amount where applicable;
- commercial decision: `READY`, `REVIEW` or `NO_GO`, with structured alerts.

`REVIEW` is raised for commercial review flags and for a saved calculation using
a non-published assumption version. `NO_GO` is raised when recommended sell is
below the risk-adjusted cost floor. The system records these facts; it does not
auto-approve or auto-correct a carrier decision.

## Boundary

An explainable quote remains a one-off calculation and evidence record. It is
not a RateBook or Rateware tariff. A future Rateware integration can consume
the saved lineage and decision evidence after human review, without writing
back into Freight Cost Model economics.
