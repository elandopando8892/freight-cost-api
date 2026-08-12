# Production route catalog

`ProductionRoute` is the operational catalog above the existing `CarrierMexLane` and
`CarrierUsaLane` resolver matrices. The matrices remain the source of leg facts for
the engine; a production route holds commercial context and governed lineage.

## Route states

- `DRAFT`: can be edited and can remain incomplete while the carrier prepares it.
- `PRODUCTION`: immutable operational evidence. It was admitted only after the
  route passed its quality gate.
- `ARCHIVED`: retained for audit, but no longer operational.

## Quality gate

The API returns an effective quality for every route:

- `INCOMPLETE`: missing endpoints, a required cross-border crossing, or other
  required route context.
- `NEEDS_REVIEW`: the confirmed cost base is missing/inactive/incompatible, or
  the confirmed version is missing, belongs to a different base, or is not
  published.
- `READY`: the route has complete geography and a compatible active cost base
  with its own published assumption version.

`POST /production/routes/:id/produce` accepts only `READY` drafts. It stores
the exact confirmed cost base and assumption-set version, so a later default-base
change does not rewrite a route's lineage. A published version referenced by a
route in `PRODUCTION` cannot be archived until that route is archived or replaced.

## Future Rateware boundary

This catalog does not read or write Rateware rate books. A future integration
can consume `PRODUCTION` routes and their frozen base/version identifiers as a
reviewable input, without giving Rateware permission to change Freight Cost
Model economics.
