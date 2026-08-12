# Cost bases and versions

Sprint 3 introduces `CostBase` as the operational container for assumption
versions. It deliberately does not create a RateBook.

```text
Organization
  CostBase (CROSS_BORDER | DRAYAGE | LOCAL | INTRA_MEX | INTRA_US)
    AssumptionSet v1 (active)
    AssumptionSet v2 (draft)
    AssumptionSet v3 (draft)
  Lane -> CostBase
  Quote -> CostBase + exact AssumptionSet + calculationPolicy
```

This keeps three concepts separate:

- `CostBase`: which operating economics and scope apply;
- `AssumptionSet`: the exact editable parameter version;
- future `RateBook`: a generated, reviewable and publishable tariff artifact.

## Lifecycle

A new base starts in `DRAFT` unless it is created as the default for its scope.
It receives an active version 1 containing all 210 canonical parameters. New
versions clone the active version and remain inactive until explicitly activated.
Activation affects only versions of the same base; other scopes keep their own
active versions.

`ARCHIVED` bases remain readable for historical quotes but cannot be used for
new calculations or receive new versions.

## Route selection

Known operations are validated against base scope. For example, `D2D Export`
requires `CROSS_BORDER`, while `Drayage` requires `DRAYAGE`. The selected base is
stored on both the saved lane and quote; the exact assumption version and engine
policy are also retained on the quote.

## API

- `GET /cost-bases`
- `POST /cost-bases`
- `GET /cost-bases/:id`
- `PATCH /cost-bases/:id`
- `POST /cost-bases/:id/versions`
- `POST /cost-bases/:id/versions/:versionId/activate`

Calculation and quote endpoints accept `costBaseId`. They select that base's
active assumption version unless `assumptionSetId` names another version within
the same base. Omitting both preserves the legacy active-set behavior.
