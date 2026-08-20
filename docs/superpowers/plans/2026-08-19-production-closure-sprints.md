# Production Closure Sprints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Freight Cost Model from 83.4% implemented to 100% production-ready with auditable evidence across UI, Kinde, Gmail, Rateware, database and release gates.

**Architecture:** Keep Freight Cost Model as the system of record for cost bases, assumptions, quotes and delivery state. Rateware remains the external Gmail broker and receiving system; the BFF forwards the Kinde identity and immutable delivery package, while all irreversible actions remain explicitly confirmed by an ADMIN. The final release is accepted only when the code SHA, migrations, environment configuration and remote smoke evidence refer to the same artifact.

**Tech Stack:** Fastify, Prisma/PostgreSQL, Next.js App Router, Kinde, Supabase Edge Functions/Rateware, Gmail OAuth, Vitest, TypeScript, Vercel.

**Spec:** [`RELEASE_PROGRESS.md`](../../../RELEASE_PROGRESS.md), [`UI_UX_CONVERGENCE.md`](../../../apps/web/UI_UX_CONVERGENCE.md), [`gmail-rateware-broker.md`](../../../apps/api/docs/gmail-rateware-broker.md)

## Global Constraints

- Desktop UI remains a horizontal Rateware-inspired workspace at 1440×900 and 1280×800; mobile adapts at 390×844.
- `CostBase`, `AssumptionSet`, `ProductionRoute`, `Quote` and `RateBook` remain separate governed objects.
- A draft, preview or prepared email never counts as published, delivered or production-ready.
- The only production ADMIN for the pilot is `sales@heymarksman.com`.
- Gmail tokens stay in Rateware; Freight Cost Model stores no access or refresh token.
- Do not include `apps/api/.agents/`, `apps/api/skills-lock.json` or `deno.lock` in commits unless explicitly required.
- Every sprint ends with a reproducible test command, a recorded SHA and an evidence artifact.

## Progress map

| Sprint | Focus | Entry | Expected exit | Target overall |
|---:|---|---:|---:|---:|
| 9 | Release baseline and environment parity | 83.4% | Candidate SHA and env/migration manifest are consistent | 86% |
| 10 | Rateware Gmail receiver promotion | 86% | Receiver, migration and action contract deployed to staging | 89% |
| 11 | ADMIN-authenticated Quote Desk pilot | 89% | Connect Gmail, approve and send one controlled pilot quote | 92% |
| 12 | Visual QA and UI/UX closure | 92% | Three viewport evidence pack approved | 94% |
| 13 | RateBook/Rateware end-to-end handoff | 94% | One RateBook received with checksum and lineage evidence | 97% |
| 14 | Production release and hypercare | 97% | Production GO, smoke, rollback note and monitoring handoff | 100% |

The targets are gates, not promises. If a sprint exposes a blocker, its percentage remains at the previous verified value.

## Modelo y esfuerzo recomendado

| Sprint | Modelo recomendado | Esfuerzo de razonamiento | IA estimada | Humano requerido |
|---:|---|---|---:|---:|
| 9 | Codex Spark para scripts/tests; modelo fuerte para revisión final | Medio → alto | 4–6 h | 1–2 h |
| 10 | Modelo fuerte con razonamiento alto para Rateware/Supabase/Gmail | Alto | 8–12 h | 2–3 h |
| 11 | Modelo fuerte para auth, idempotencia y evidencia; Spark para UI menor | Alto | 6–10 h | 2–3 h |
| 12 | Codex Spark para ajustes UI/a11y; modelo fuerte para auditoría visual | Medio → alto | 8–12 h | 2 h |
| 13 | Modelo fuerte con razonamiento alto para lineage, checksum y handoff | Alto | 8–12 h | 2–3 h |
| 14 | Modelo fuerte en modo máximo para GO, rollback y producción | Muy alto | 4–8 h | 3–4 h |

La suma normal es de **38–60 horas de IA** y **12–17 horas humanas**, distribuidas en aproximadamente **2–3 semanas calendario** por las esperas de OAuth, despliegues y aprobaciones. Spark es suficiente para producir código y pruebas cuando el contrato ya está definido; no debe ser el único revisor del Sprint 10, 13 o 14.

---

### Sprint 9: Release baseline and environment parity

**Outcome:** Establish one reproducible candidate release before touching production systems.

**Files:**
- Modify: `apps/api/src/modules/pilot/release-preflight.ts` only if a missing release check is found.
- Modify: `apps/api/scripts/release-preflight.ts` only if output/evidence needs correction.
- Test: `apps/api/tests/release-preflight.test.ts`.
- Create: `pilot-evidence/<YYYY-MM-DD>/<sha>/manifest.json` outside the application runtime.

**Interfaces:**
- Consumes: `release-progress.json`, Prisma migration directory, Git HEAD and Web/API environment manifests.
- Produces: a candidate SHA, JSON preflight output, migration list and an explicit BLOCK/PASS decision.

- [ ] Step 1: Freeze the candidate SHA and record `git status --short`, `git rev-parse HEAD` and the excluded untracked paths.
- [ ] Step 2: Run the existing static gates with the bundled Node runtime: `npm run lint`, `npm run typecheck`, `npm run db:validate -w freight-cost-api`, `npm run migrations:verify`, `npm run security:headers` and `git diff --check`.
- [ ] Step 3: Run `npm run preflight:release -w freight-cost-api -- --json` and store its output without environment values or secrets.
- [ ] Step 4: Confirm the release SHA, required migrations, Kinde origins, API URL, CORS and AI model point to the same environment before proceeding.
- [ ] Step 5: Mark Sprint 9 complete only when the manifest has no BLOCK checks and the candidate SHA is immutable.

**Acceptance:** The manifest is reproducible, contains no secrets, and the release preflight is PASS or explicitly lists the remaining blocker.

---

### Sprint 10: Rateware Gmail receiver promotion

**Outcome:** Make the existing local Rateware receiver an independently tested staging dependency.

**Files:**
- Review/modify: `rateware-fcm-gmail-current/supabase/functions/rateware-api/index.ts`.
- Review/modify: `rateware-fcm-gmail-current/supabase/migrations/20260814000300_fcm_customer_quote_email_receipts.sql`.
- Test: `rateware-fcm-gmail-current/tests/fcm-customer-quote-email.test.mjs`.
- Test: `rateware-fcm-gmail-current/tests/fcm-customer-quote-email.contract.test.ts`.
- Modify: `apps/api/docs/gmail-rateware-broker.md` with the deployed staging revision and verification timestamp.

**Interfaces:**
- Consumes: `send_fcm_customer_quote_email`, contract `fcm.rateware-gmail-send.v1`, draft contract `fcm.rateware-gmail-draft.v1` and the tenant-bound idempotency key.
- Produces: staging action response with `accepted`, `receipt_id`, `provider_message_id`, `provider_thread_id` and duplicate-safe behavior.

- [ ] Step 1: Run both local Rateware contract tests and confirm they inspect the exact action, migration, RLS and token-handling rules.
- [ ] Step 2: Deploy the matching Rateware migration to the intended staging Supabase project and verify the receipt table/RLS without exposing tokens.
- [ ] Step 3: Deploy `rateware-api` to staging and record the function revision, migration revision and environment allowlists.
- [ ] Step 4: Call the action with a non-production test mailbox and verify first send, duplicate idempotency, checksum mismatch, wrong tenant and unauthorized mailbox responses.
- [ ] Step 5: Update `RATEWARE_GMAIL_API_URL` in FCM staging and verify the BFF reaches the same Rateware function origin.

**Acceptance:** The receiver is remotely callable in staging, the migration is applied, and all negative contract cases fail closed. Production sending remains disabled until Sprint 11 passes.

---

### Sprint 11: ADMIN-authenticated Quote Desk pilot

**Outcome:** Prove one human-approved quote can travel from FCM to Gmail through Rateware with durable evidence.

**Files:**
- Review: `apps/web/app/api/integrations/gmail/route.ts`.
- Review: `apps/api/src/modules/customer-quotes/customer-quotes.routes.ts`.
- Review: `apps/api/src/modules/customer-quotes/customer-quotes.service.ts`.
- Test: existing customer-quote and Gmail delivery tests under `apps/api/tests/`.
- Evidence: `pilot-evidence/<YYYY-MM-DD>/<sha>/quote-desk-pilot.json`.

**Interfaces:**
- Consumes: Kinde session for `sales@heymarksman.com`, approved customer quote, immutable prepared draft and Rateware receiver from Sprint 10.
- Produces: `SENT` or a durable, explainable failure state with actor, receipt, checksum and timestamps.

- [ ] Step 1: Sign in through Kinde/Google as `sales@heymarksman.com` and record only non-secret identity evidence.
- [ ] Step 2: Connect Gmail from Settings and verify the callback returns to the same organization and mailbox.
- [ ] Step 3: Create or select a quote, move it through `DRAFT -> REVIEW -> APPROVED`, and confirm the preview remains sandboxed.
- [ ] Step 4: Send exactly one pilot email after explicit confirmation; capture the FCM delivery id, Rateware receipt id, Gmail message id and checksum.
- [ ] Step 5: Reopen/retry the same draft and verify the idempotency guard prevents a blind duplicate.
- [ ] Step 6: Disconnect Gmail and verify the UI returns to an unconfigured state without exposing credentials.

**Acceptance:** One real pilot succeeds end-to-end; a duplicate attempt is blocked or reconciled; no automatic send is introduced.

---

### Sprint 12: Visual QA and UI/UX closure

**Outcome:** Close the remaining wireframe and Rateware visual debt with authenticated evidence.

**Files:**
- Review: `apps/web/UI_UX_CONVERGENCE.md`.
- Review: `apps/web/app/(app)/app-navigation.tsx` and the workspace pages for Dashboard, Cost Bases, Assumptions, Production, Quote Desk and RateBook.
- Create: `pilot-evidence/<YYYY-MM-DD>/<sha>/visual/` with viewport screenshots and review notes.

**Interfaces:**
- Consumes: authenticated staging organization with multiple bases, versions, routes and quote states.
- Produces: screenshot matrix and signed visual acceptance record.

- [ ] Step 1: Capture Dashboard, Cost Bases, Assumptions, Production, Quote Desk and RateBook at 1440×900.
- [ ] Step 2: Repeat at 1280×800 and confirm the workspace remains horizontal with internal table scrolling.
- [ ] Step 3: Repeat at 390×844 and verify navigation, labels, action confirmation and no page-level horizontal overflow.
- [ ] Step 4: Check loading, empty, error, no-permission, DRAFT, PUBLISHED, ACTIVE and ARCHIVED states.
- [ ] Step 5: Check keyboard focus, accessible names, Spanish copy, base/version lineage and Rateware-style density.
- [ ] Step 6: Record only concrete UI defects; fix and rerun the affected viewport before marking PASS.

**Acceptance:** All six workspaces have three viewport captures, no P1/P2 visual or accessibility defect remains, and the human review is recorded.

---

### Sprint 13: RateBook/Rateware end-to-end handoff

**Outcome:** Demonstrate that one governed RateBook reaches Rateware with frozen lineage and verifiable checksum.

**Files:**
- Review: RateBook routes/services under `apps/api/src/modules/ratebooks/`.
- Review: Rateware handoff code under `apps/api/src/modules/integrations/rateware/`.
- Test: existing RateBook/Rateware candidate tests under `apps/api/tests/`.
- Evidence: `pilot-evidence/<YYYY-MM-DD>/<sha>/ratebook-handoff.json`.

**Interfaces:**
- Consumes: ACTIVE CostBase, PUBLISHED AssumptionSet, frozen route snapshots and explicit ADMIN delivery approval.
- Produces: Rateware receipt/response linked to FCM organization, base, version, route and checksum.

- [ ] Step 1: Create a RateBook draft from an ACTIVE base and verify its routes are snapshots, not live lane references.
- [ ] Step 2: Regenerate once and confirm a new DRAFT is created without publishing or delivering automatically.
- [ ] Step 3: Publish with ADMIN approval and inspect the candidate gates: structural readiness, enrichment and confirmation eligibility.
- [ ] Step 4: Deliver to Rateware staging and capture request checksum, response, actor and remote revision.
- [ ] Step 5: Attempt delivery with a changed lane/base/version and verify drift is rejected.

**Acceptance:** Rateware receives one valid package, the lineage is immutable, and a drifted or incomplete package cannot be delivered.

---

### Sprint 14: Production release and hypercare

**Outcome:** Publish one exact SHA to production and close with a reversible, monitored release record.

**Files:**
- Review: `apps/api/scripts/release-preflight.ts` and `apps/api/src/modules/pilot/release-preflight.ts`.
- Review: Vercel project settings for API/Web and Rateware Supabase deployment settings.
- Create: `pilot-evidence/<YYYY-MM-DD>/<sha>/production-go.json`.
- Update: `RELEASE_PROGRESS.md` and `release-progress.json` only after remote evidence is complete.

**Interfaces:**
- Consumes: Sprint 9–13 evidence, approved production environment variables and explicit release authorization.
- Produces: production URLs, health/ready smoke output, migration status, rollback commit and monitoring handoff.

- [ ] Step 1: Confirm the candidate SHA is the exact SHA approved in the evidence package and the worktree is clean.
- [ ] Step 2: Apply only the migrations required by that SHA, then verify migration status from the production database provider.
- [ ] Step 3: Deploy API and Web with matching `RELEASE_SHA`, Kinde origins, CORS and Rateware URL.
- [ ] Step 4: Run anonymous health/ready/CORS checks and authenticated ADMIN smoke checks against production.
- [ ] Step 5: Run one non-destructive production read flow; do not send a customer email or publish a RateBook without a separate human confirmation.
- [ ] Step 6: Record rollback SHA, deployment URLs, timestamps, smoke results and monitoring owner.
- [ ] Step 7: Set all production gates to `PASS` and only then change overall progress to 100%.

**Acceptance:** API/Web/DB/Rateware all identify the same release; smoke is PASS; rollback is documented; the release record contains no secrets.

## Self-review

- Spec coverage: UI/UX closure is Sprint 12; Gmail/Rateware is Sprints 10–11; RateBook lineage is Sprint 13; production evidence is Sprints 9 and 14.
- No task assumes that local tests prove a remote deployment; every external dependency has a separate acceptance gate.
- The percentage targets are stored separately from evidence status so code progress cannot silently mark production readiness.
