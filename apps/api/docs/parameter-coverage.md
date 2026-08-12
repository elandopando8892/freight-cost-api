# Parameter coverage catalog

Sprint 4 adds a read-only decision surface over the 210 canonical Freight Cost
Model parameters. It is not a second parameter store: coverage is derived from
the active `AssumptionSet` version of each non-archived `CostBase`.

## Coverage states

The four states are mutually exclusive, so every category and base always sums
to its canonical parameter total:

- `INHERITED`: the effective value matches the canonical FCM V3 recommendation;
- `SPECIFIC`: an in-range value differs from the canonical recommendation;
- `MISSING`: the active version has no effective value for the definition;
- `OUT_OF_RANGE`: the effective value violates its configured low/high bounds.

`INHERITED` describes effective-value semantics, not historical provenance. A
value manually changed back to the recommended value is therefore inherited in
the coverage view. Publication history and immutable approvals belong to Sprint
5.

## API

`GET /api/v1/catalog/coverage` is organization-scoped and returns:

- the ordered 16-category catalog;
- every non-archived cost base and its active version;
- mutually exclusive totals per base and category;
- the 210 effective parameter rows with stable integration keys and metadata.

The endpoint is read-only and available to `ADMIN`, `OPERATOR`, and `VIEWER`.
