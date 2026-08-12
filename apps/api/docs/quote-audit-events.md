# Quote audit events

Freight Cost Model writes immutable quote events as part of the same database
write that changes the quote lifecycle.

Current actions:

- `CREATED`: written when a quote is saved manually or generated from a route
  in production. Its payload records source and calculation snapshot checksum.
- `CONFIRMED`: written when an authenticated user confirms an eligible quote.
  Its note is the human decision record and its payload retains the checksum.

Events are scoped to the organization and retain actor, timestamp, note and
small contextual payload. The quote detail shows them chronologically. Existing
quotes have no synthetic events; the UI identifies those historical records
instead of fabricating an audit trail.

This is Freight Cost Model governance evidence, not a RateBook lifecycle and
not an external write to Rateware.
