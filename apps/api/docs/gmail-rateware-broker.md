# Gmail individual via Rateware

Sprint 10 promotes and verifies the Rateware Gmail receiver in staging. Sprint 11 records the authorized user's Gmail consent and executes the approved pilot delivery. Production sending remains disabled until the staged OAuth/send evidence is complete and the matching Rateware release is promoted.

## Staging verification — 2026-08-20

- Freight Cost Model Web/API release: `5065f87710577fa76df4cce6db049b9d4de22685`.
- Rateware source commit: `452cdb545bd51365e8fb759fa6b62b904f649302`.
- Supabase preview: `fcm-gmail-staging` (`kyjdyqayuznhowlpcoab`), the only non-default preview branch and created without production data.
- Migration `20260814000300`, `rateware-api` v441 and `gmail-oauth-callback` v65 are active.
- CORS, anonymous rejection, Kinde identity forwarding and the authenticated Settings BFF call passed remotely.
- OAuth fue completado por `sales@heymarksman.com`. El piloto `CQ-2026-F49BD6B7` fue aceptado por Gmail y el ledger conserva el recibo `96335a0f-b1cd-43a2-9b90-421ac10aad34` y provider message id `1a01e70f80887783`.

Evidence: `pilot-evidence/2026-08-20/452cdb5/sprint-10-rateware-gmail-staging.json` from the shared Freight Cost Model workspace root.

## Identity boundary

1. Kinde authenticates the Freight Cost Model user.
2. The Next.js BFF forwards that same bearer token to Rateware's Gmail broker.
3. Rateware accepts `start_gmail_oauth` only for the authenticated user's verified Kinde email.
4. Google OAuth must return that exact mailbox. Tokens remain encrypted in Rateware's `gmail_mailbox_connections`; Freight Cost Model never receives them.

This intentionally prevents an operator from authorizing another employee's Gmail account or selecting a shared default sender.

## Required deployment configuration

Freight Cost Model web:

```text
RATEWARE_GMAIL_API_URL=https://<supabase-project>.supabase.co/functions/v1/rateware-api
```

Rateware must use the same Kinde issuer/audience and include the Freight Cost Model application origin in both comma-separated allowlists:

```text
RATEWARE_CORS_ORIGINS=https://rateware.vercel.app,https://<freight-cost-model-origin>
GMAIL_OAUTH_RETURN_ORIGINS=https://rateware.vercel.app,https://<freight-cost-model-origin>
```

The broker also requires its existing `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GMAIL_TOKEN_ENCRYPTION_KEY`. Do not put those values in the Freight Cost Model application.

## Operational boundary

`GET /api/integrations/gmail` returns connection status. `POST` with `operation: start` creates a short-lived Rateware OAuth state and redirects the user to Google. `operation: disconnect` clears the local encrypted tokens for that same authenticated mailbox.

Quote Desk preserves a separate lifecycle: `DRAFT -> REVIEW -> APPROVED`. Only an approved proposal can execute `POST /customer-quote-email-drafts/:id/send`. The API forwards the same Kinde bearer token, an immutable `fcm.rateware-gmail-send.v1` package, its `sourceOrganizationId`, and a stable tenant-bound idempotency key to Rateware action `send_fcm_customer_quote_email`.

The delivery states are:

- `PREPARED`: immutable message snapshot; nothing was sent.
- `SENDING`: an exclusive claim prevents concurrent double sends.
- `SENT`: Rateware returned a durable receipt and Gmail provider identifiers.
- `FAILED`: Rateware rejected the request definitively; a deliberate retry may reuse the same idempotency key.
- `DELIVERY_UNKNOWN`: provider acceptance is ambiguous. Automatic and manual blind retries are blocked until reconciliation.

Rateware validates the Kinde identity, requires the authorized mailbox, recomputes the payload checksum and tenant-bound idempotency key, deduplicates by `idempotency_key`, sends through Gmail, and returns `accepted`, `receipt_id`, `provider_message_id`, `provider_thread_id`, and optional `duplicate`. El receiver, OAuth y la migración de recibos están verificados en staging; la promoción a producción sigue separada del piloto.

El contrato de reconciliación consulta el mismo tenant y `idempotency_key` sin llamar nuevamente a Gmail. Un recibo `sent` cierra el borrador local como enviado; un recibo ausente demuestra que el provider no fue intentado porque el receiver persiste el claim antes de la llamada; un estado ambiguo permanece bloqueado. El API también serializa borradores con el mismo quote y checksum para evitar carreras de doble envío.
