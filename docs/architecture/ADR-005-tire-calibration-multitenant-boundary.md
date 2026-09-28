# ADR-005: frontera multi-tenant para expedientes de calibración

**Status:** Accepted as a locally validated candidate; not applied to shared Neon
**Date:** 2026-09-27
**Deciders:** responsable técnico FCM, responsable económico XBF y responsable de seguridad

## Context

FCM uses Supabase Auth only to verify identity. Fastify maps the verified subject to
`User.supabaseId`; Neon/PostgreSQL accessed through Prisma remains the system of
record for `User.id`, `orgId`, role and operational data. The browser does not use
Supabase Data API for this domain.

Sprint 7 correctly selected Fastify/Prisma as the authoritative access path, but its
first RLS sketch assumed a Supabase Database helper. Sprint 8 verified the effective
topology and supersedes that detail: Neon does not provide Supabase database helpers.

## Decision

Keep Fastify/Prisma as the authoritative domain boundary. Every operation resolves
the internal user, filters by `orgId`, checks role and exact assignment, and performs
the transition in one transaction with locks, fingerprints and an append-only event.

The API sets three transaction-local PostgreSQL values from that resolved internal
user: `app.current_org_id`, `app.current_user_id` and `app.current_role`.

RLS consumes those values only as defense in depth. It does not consume
`user_metadata`, application claims or browser-controlled values. Settings use
`set_config(..., true)` so PostgreSQL discards them when the transaction ends.

## Candidate data model

| Table | Responsibility | Essential constraints |
| --- | --- | --- |
| `TireCohortSourceSnapshot` | Immutable source records, statistics policy and aggregation fingerprint | Tenant/version uniqueness, idempotent request and append-only trigger |
| `TireCohortSourceHead` | Current authoritative snapshot per tenant cohort | Tenant/cohort uniqueness and same-tenant snapshot FK |
| `TireCalibrationDossier` | Current projection and complete proposal snapshot | Same-tenant composite user keys, optimistic revision and three distinct duties |
| `TireCalibrationReviewEvent` | Command and decision ledger | Idempotent request, consecutive sequence, hash chain and append-only trigger |
| `TireCalibrationApprovalPackage` | Reviewed, non-executable evidence | One package per dossier, immutable and `quoteEligible=false` |

All relationships that identify a user or dossier include `orgId`. Cross-tenant duty
assignment therefore fails at the foreign-key layer even if an application filter is
incorrect.

## RLS and privileges

- `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY` are present on all
  five candidate tables.
- All table privileges are revoked from `PUBLIC`; deployment must explicitly grant
  only the actual backend role.
- No policy exists for dossier deletion, event mutation or package mutation.
- Dossier `UPDATE` has matching `USING` and `WITH CHECK` predicates.
- Event actions are limited by internal role, exact assigned identity and action
  family.
- Package insertion requires the assigned independent reviewer, internal `ADMIN`
  role and a `REVIEWED` dossier.
- Immutable tables also have an invoker trigger, with function execution revoked
  from `PUBLIC`.
- No `SECURITY DEFINER` function is used.

Supabase guidance about grants and RLS still informs the least-privilege posture, but
Data API roles such as `anon` and `authenticated` are not part of this Neon data path.

## Transaction order

1. Verify the Supabase access token.
2. Resolve the internal `User` by `supabaseId`.
3. Begin a serializable Prisma transaction.
4. Set transaction-local tenant, user and role context.
5. Lock the organization, resolve the tenant/cohort source head and recompute the
   stored snapshot fingerprint.
6. Lock the dossier and check tenant, role, revision, state, authoritative source
   freshness and assigned actor.
7. Update the projection inside the still-uncommitted transaction.
8. Append the event against that projection; rollback restores both on failure.
9. Create a non-executable package only after independent review.
10. Commit; PostgreSQL clears the local context.

## Validation evidence

The complete 45-migration chain, migration status and a second no-op deploy passed in
an isolated PostgreSQL 17 container. A separate `fcm_tire_app` role was created with
`NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT` and `NOBYPASSRLS`.

Allow/deny tests proved: fail-closed context, same-tenant reads, cross-tenant concealment,
author-only creation, composite tenant duties, viewer and unassigned-admin denial,
assigned owner/reviewer transitions, action-family enforcement, immutable evidence and
non-executable packages. The container had no host volume and was removed afterward.

Sprint 9 added the Fastify/Prisma adapter and authenticated route boundary. Its
serializable workflow was executed through the non-bypass application role in the
same disposable PostgreSQL environment, including exact idempotent replay, stale
source rejection, cross-tenant concealment, viewer read, four-step hash chain and
creation of the non-executable package. A JSONB round-trip test also forced proposal
fingerprints to use a persistence-stable numeric canonicalization.

Sprint 10 moved source freshness out of the request contract. Authenticated
`ADMIN`/`OPERATOR` capture immutable source versions and advance a per-tenant cohort
head. Every handoff resolves that head inside the transaction, reparses the records
and policy, recomputes the aggregation fingerprint, checks snapshot integrity and
then compares it with the dossier. A disposable PostgreSQL test proved that a newer
source blocks an economic decision with `SOURCE_FINGERPRINT_STALE`; restoring the
reviewed data as another immutable version permits the controlled continuation.

## Consequences and remaining gates

- The candidate migration exists locally; it has not changed shared Neon, Supabase
  Auth, preview or production.
- Before any shared migration, inspect the effective Prisma connection role. A role
  with `BYPASSRLS` would reduce RLS to a non-enforcing layer.
- The persistence adapter is locally complete. The next slice is an authenticated
  preview with three real identities after separate authorization to apply the new
  schema to a non-production shared database.
- Applying the migration to shared Neon and enabling production remain separate,
  explicit authorizations.

## Rollback

Local rollback is deletion of the candidate migration, five Prisma models, context
helper, verification runner and tests. No remote rollback exists because no shared
database was changed. A future shared rollback must be designed from a verified empty
table state or use an explicitly approved archival/export plan.
