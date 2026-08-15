# Gmail individual via Rateware

Sprint 10 connects and records a user's Gmail authorization. Sprint 11 renders immutable customer-quote drafts and adds the explicit Freight Cost Model delivery contract. Production sending remains disabled until Rateware deploys the matching receiver action and both environments are configured.

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

The local delivery states are:

- `PREPARED`: immutable message snapshot; nothing was sent.
- `SENDING`: an exclusive claim prevents concurrent double sends.
- `SENT`: Rateware returned a durable receipt and Gmail provider identifiers.
- `FAILED`: Rateware rejected the request definitively; a deliberate retry may reuse the same idempotency key.
- `DELIVERY_UNKNOWN`: provider acceptance is ambiguous. Automatic and manual blind retries are blocked until reconciliation.

Rateware validates the Kinde identity, requires the authorized mailbox, recomputes the payload checksum and tenant-bound idempotency key, deduplicates by `idempotency_key`, sends through Gmail, and returns `accepted`, `receipt_id`, `provider_message_id`, `provider_thread_id`, and optional `duplicate`. The receiver and receipt migration are implemented locally in the isolated Rateware integration worktree; real delivery remains unavailable until those changes are reviewed, merged, migrated, and deployed.
