# Gmail individual via Rateware

Sprint 10 only connects and records a user's Gmail authorization. It does not render a customer template or send a quote; those are Sprint 11 responsibilities.

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

`GET /api/integrations/gmail` returns connection status. `POST` with `operation: start` creates a short-lived Rateware OAuth state and redirects the user to Google. `operation: disconnect` clears the local encrypted tokens for that same authenticated mailbox. Sending must later be an explicit, auditable Quote Desk action with an idempotency key and delivery trace.
