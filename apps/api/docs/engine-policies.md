# Calculation policies

Every calculation returns an explicit `policy`. Saved quotes persist it in
`Quote.calculationPolicy`; future RateBooks must copy the same value so Rateware
can distinguish how a route was built.

## `OPERATIONAL_V3` (default)

Carrier-facing model with reviewed operating rules added after the workbook:

- local and short-haul minimum empty distance, billable day and trip cost;
- physical second leg for roundtrips, including time and tolls;
- residual backhaul deadhead;
- additive second-unit cost and maneuver time for tandem equipment;
- assumption-driven rounding and long-haul floor.

## `WORKBOOK_V3`

Compatibility model that reproduces the source `mexLaneProd` and `usaLaneProd`
outputs. It retains the workbook's original roundtrip, backhaul, tandem and
rounding semantics. Its purpose is reconciliation and controlled migration, not
to silently replace the operational model.

## API contract

`POST /engine/calculate`, `POST /engine/quote-by-route`, and `POST /quotes`
accept `{"policy":"OPERATIONAL_V3"}`. Omitting it selects `OPERATIONAL_V3`;
unknown values are rejected.

Existing saved quotes created before Sprint 2 are tagged
`LEGACY_UNSPECIFIED`; the migration does not guess which historical code version
produced them.
