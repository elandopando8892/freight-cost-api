# Quote from a production route

`POST /production/routes/:id/quotes` is the governed bridge from the operational
route catalog to a saved Freight Cost Model quote.

The endpoint accepts only a route in `PRODUCTION`. It uses the route's frozen
confirmed cost base and published assumption version, resolves route legs from
the carrier matrix/reference resolver, calculates the quote, and saves its
full explanation and reproducible snapshot.

Each generated quote records `productionRouteId`. This provenance is shown in
the quote detail and carried into the future read-only Rateware handoff package.
The saved quote still starts as `DRAFT`: route production does not substitute
for a human commercial confirmation of a specific tariff.

No RateBook is generated and no Rateware call is made by this flow.
