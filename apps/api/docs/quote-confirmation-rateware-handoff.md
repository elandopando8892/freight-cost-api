# Human quote confirmation and Rateware handoff

Freight Cost Model treats a calculated quote as a proposal. A human user must
confirm it with a note before it becomes `CONFIRMED`.

## Confirmation gate

`POST /quotes/:id/confirm` requires all of the following:

- the quote is still a draft;
- its calculation snapshot exists and replays exactly;
- the saved commercial decision is `READY`;
- its saved cost base is active and its assumption version is published;
- the authenticated user provides a meaningful confirmation note.

The confirmation records status, date, actor and note. It does not alter the
quote economics or approve a RateBook.

## Read-only Rateware package

`GET /integration/rateware/quotes/:id` is available only for confirmed quotes.
It emits `fcm.rateware-handoff.v1`, a JSON contract containing the confirmed
governance metadata, lane/equipment context, frozen lineage, snapshot checksum
and economics. The contract is explicitly `READ_ONLY`: Freight Cost Model does
not write to Rateware and Rateware cannot change Freight Cost Model inputs by
calling this endpoint.
