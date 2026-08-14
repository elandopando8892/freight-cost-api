import { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/authorize.js";
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import type { JwtPayload } from "../auth/auth.schema.js";
import { confirmationEligibility } from "../quotes/quote-governance.js";
import { pilotEvidenceCsv } from "./pilot-evidence.js";
import {
  pilotDecisionEvidence,
  pilotGateFingerprint,
  pilotGoApprovalBlocker,
  pilotRequiredApprovals,
} from "./pilot-decisions.js";
import {
  evaluatePilotVerificationGate,
  pilotVerificationBlocker,
  pilotVerificationEvidence,
} from "./pilot-verifications.js";
import { buildPilotReadiness } from "./pilot-readiness.js";

const SCENARIO_REVIEW_MIGRATIONS = [
  "20260811002100_scenario_review_packets",
  "20260811002200_scenario_review_draft_lineage",
  "20260811002300_pilot_decision_ledger",
  "20260811002400_rateware_delivery_approval_trace",
  "20260811002500_customer_quote_email_outbox",
  "20260812000100_pilot_verification_evidence",
  "20260812000200_pilot_go_dual_approval",
] as const;
const CreatePilotDecision = z
  .object({
    outcome: z.enum(["GO", "NO_GO"]),
    rationale: z.string().trim().min(3).max(2000),
    confirmReleaseId: z
      .string()
      .trim()
      .regex(/^[a-f0-9]{7,64}$/i)
      .optional(),
  })
  .strict();
const CreatePilotVerification = z
  .object({
    kind: z.enum(["STAGING_AUTH_BFF_SMOKE", "STAGING_AUTH_BFF_HUMAN"]),
    outcome: z.enum(["PASS", "FAIL"]),
    releaseId: z.string().trim().regex(/^[a-f0-9]{7,64}$/i),
    executedAt: z.string().datetime({ offset: true }),
    summary: z.string().trim().min(3).max(2000),
    checks: z
      .array(
        z
          .object({
            key: z.string().trim().min(1).max(80),
            status: z.enum(["PASS", "BLOCK"]),
          })
          .strict(),
      )
      .min(1)
      .max(8),
  })
  .strict();
const pilotDecisionInclude = {
  decidedBy: { select: { id: true, email: true, role: true } },
} as const;
const pilotVerificationInclude = {
  verifiedBy: { select: { id: true, email: true, role: true } },
} as const;
const pilotGoApprovalInclude = {
  approvedBy: { select: { id: true, email: true, role: true } },
  decision: { select: { id: true, outcome: true, createdAt: true } },
} as const;

type PilotDatabase = typeof prisma | Prisma.TransactionClient;

async function scenarioReviewSchemaReady(
  db: PilotDatabase = prisma,
): Promise<boolean | null> {
  try {
    const applied = await db.$queryRaw<
      Array<{ migration_name: string }>
    >(Prisma.sql`
      SELECT "migration_name" FROM "_prisma_migrations"
      WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL
        AND "migration_name" IN ('20260811002100_scenario_review_packets', '20260811002200_scenario_review_draft_lineage', '20260811002300_pilot_decision_ledger', '20260811002400_rateware_delivery_approval_trace', '20260811002500_customer_quote_email_outbox', '20260812000100_pilot_verification_evidence', '20260812000200_pilot_go_dual_approval')
    `);
    return SCENARIO_REVIEW_MIGRATIONS.every((migration) =>
      applied.some((row) => row.migration_name === migration),
    );
  } catch {
    return null;
  }
}

async function lockPilotGate(tx: Prisma.TransactionClient, orgId: string) {
  await tx.$queryRaw(Prisma.sql`
    SELECT "id" FROM "Organization" WHERE "id" = ${orgId} FOR UPDATE
  `);
}

export async function readinessForOrg(orgId: string, db: PilotDatabase = prisma) {
  const currentReleaseId = env.RELEASE_SHA.toLowerCase();
  const [
    profile,
    activePricingBases,
    productionRoutes,
    confirmedQuotes,
    publishedRateBooks,
    pendingApprovals,
    deliveries,
    underReviewScenarioReviews,
    scenarioSchemaReady,
    stagingVerifications,
  ] = await Promise.all([
    db.carrierProfile.findUnique({
      where: { orgId },
      select: {
        legalName: true,
        primaryContactName: true,
        primaryContactEmail: true,
      },
    }),
    db.costBase.count({
      where: {
        orgId,
        status: "ACTIVE",
        versions: { some: { isActive: true, status: "PUBLISHED" } },
      },
    }),
    db.productionRoute.count({ where: { orgId, status: "PRODUCTION" } }),
    db.quote.findMany({
      where: { orgId, status: "CONFIRMED" },
      select: { explanation: true },
      take: 250,
      orderBy: { confirmedAt: "desc" },
    }),
    db.rateBook.count({ where: { orgId, status: "PUBLISHED" } }),
    db.approvalRequest.count({ where: { orgId, status: "PENDING" } }),
    db.ratewareDelivery.count({ where: { orgId, status: "DELIVERED" } }),
    db.scenarioReview.count({ where: { orgId, status: "UNDER_REVIEW" } }),
    scenarioReviewSchemaReady(db),
    Promise.all(
      (["STAGING_AUTH_BFF_SMOKE", "STAGING_AUTH_BFF_HUMAN"] as const).map(
        (kind) =>
          db.pilotVerification.findFirst({
            where: {
              orgId,
              releaseId: {
                equals: currentReleaseId,
                mode: "insensitive",
              },
              kind,
            },
            select: {
              id: true,
              kind: true,
              outcome: true,
              releaseId: true,
              executedAt: true,
              verifiedById: true,
              createdAt: true,
            },
            orderBy: [
              { executedAt: "desc" },
              { createdAt: "desc" },
              { id: "desc" },
            ],
          }),
      ),
    ),
  ]);
  const invalidConfirmedQuotes = confirmedQuotes.filter(
    (quote) => !confirmationEligibility(quote.explanation).eligible,
  ).length;
  const stagingGate = evaluatePilotVerificationGate(
    stagingVerifications.filter((verification) => verification !== null),
    currentReleaseId,
  );
  return {
    generatedAt: new Date(),
    orgId,
    releaseId: currentReleaseId,
    stagingVerifications: stagingGate.stagingVerifications,
    sampledConfirmedQuotes: confirmedQuotes.length,
    ...buildPilotReadiness({
      profileComplete: Boolean(
        profile?.legalName &&
          profile.primaryContactName &&
          profile.primaryContactEmail,
      ),
      activePricingBases,
      productionRoutes,
      confirmedQuotes: confirmedQuotes.length,
      invalidConfirmedQuotes,
      publishedRateBooks,
      pendingApprovals,
      ratewareConfigured: Boolean(env.RATEWARE_API_URL),
      deliveredRateBooks: deliveries,
      underReviewScenarioReviews,
      scenarioReviewSchemaReady: scenarioSchemaReady,
      openAIKeyRotationAttested: Boolean(
        env.OPENAI_API_KEY && env.OPENAI_KEY_ROTATED_AT,
      ),
      openAIModelConfigured: Boolean(env.OPENAI_MODEL),
      stagingSmokeStatus: stagingGate.stagingSmokeStatus,
      stagingHumanStatus: stagingGate.stagingHumanStatus,
    }),
  };
}

export async function pilotRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.get("/pilot/readiness", async (request) => {
    const { orgId } = request.user as JwtPayload;
    return readinessForOrg(orgId);
  });

  app.get("/pilot/evidence.csv", async (request, reply) => {
    const { orgId } = request.user as JwtPayload;
    const readiness = await readinessForOrg(orgId);
    const date = readiness.generatedAt.toISOString().slice(0, 10);
    return reply
      .header("Cache-Control", "no-store")
      .header(
        "Content-Disposition",
        `attachment; filename=\"freight-cost-pilot-evidence-${date}.csv\"`,
      )
      .type("text/csv; charset=utf-8")
      .send(pilotEvidenceCsv(readiness));
  });

  app.get("/pilot/decisions", async (request) => {
    const { orgId } = request.user as JwtPayload;
    return prisma.pilotDecision.findMany({
      where: { orgId },
      include: pilotDecisionInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  });

  app.get("/pilot/verifications", async (request) => {
    const { orgId } = request.user as JwtPayload;
    return prisma.pilotVerification.findMany({
      where: { orgId },
      include: pilotVerificationInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  });

  app.get("/pilot/go-approvals", async (request) => {
    const { orgId } = request.user as JwtPayload;
    return prisma.pilotGoApproval.findMany({
      where: { orgId },
      include: pilotGoApprovalInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  });

  app.post(
    "/pilot/verifications",
    { preHandler: requireRole("ADMIN") },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const input = CreatePilotVerification.parse(request.body);
      if (input.releaseId.toLowerCase() !== env.RELEASE_SHA.toLowerCase()) {
        return reply.status(422).send({
          error: "La evidencia debe corresponder al RELEASE_SHA del despliegue actual.",
        });
      }
      const blocker = pilotVerificationBlocker(input);
      if (blocker) return reply.status(422).send({ error: blocker });

      const verification = await prisma.$transaction(
        async (tx) => {
          await lockPilotGate(tx, user.orgId);
          return tx.pilotVerification.create({
            data: {
              orgId: user.orgId,
              kind: input.kind,
              outcome: input.outcome,
              releaseId: input.releaseId.toLowerCase(),
              executedAt: new Date(input.executedAt),
              summary: input.summary,
              checks: pilotVerificationEvidence(input) as Prisma.InputJsonValue,
              verifiedById: user.sub,
            },
            include: pilotVerificationInclude,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return reply.status(201).send({
        verification,
        policy: "VERIFICATION_EVIDENCE_ONLY_NO_RELEASE_AUTHORIZATION",
      });
    },
  );

  app.post(
    "/pilot/decisions",
    { preHandler: requireRole("ADMIN") },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const input = CreatePilotDecision.parse(request.body);
      const result = await prisma.$transaction(
        async (tx) => {
          await lockPilotGate(tx, user.orgId);
          const readiness = await readinessForOrg(user.orgId, tx);
          if (input.outcome === "NO_GO") {
            const decision = await tx.pilotDecision.create({
              data: {
                orgId: user.orgId,
                outcome: input.outcome,
                rationale: input.rationale,
                evidence: pilotDecisionEvidence(
                  readiness,
                ) as Prisma.InputJsonValue,
                evidencePolicy: readiness.policy,
                evidenceReady: readiness.ready,
                evidenceBlockers: readiness.blockers,
                evidenceWarnings: readiness.warnings,
                evidenceAt: readiness.generatedAt,
                decidedById: user.sub,
              },
              include: pilotDecisionInclude,
            });
            await tx.pilotGoApproval.updateMany({
              where: { orgId: user.orgId, decisionId: null },
              data: { decisionId: decision.id },
            });
            return {
              error: null,
              statusCode: 201,
              decision,
              approval: null,
              approvalCount: 0,
              requiredApprovals: 0,
              state: "NO_GO_RECORDED" as const,
            };
          }

          const adminCount = await tx.user.count({
            where: { orgId: user.orgId, role: "ADMIN" },
          });
          const requiredApprovals = pilotRequiredApprovals(adminCount);
          const blocker = pilotGoApprovalBlocker(user.sub, readiness, {
            allowSelectedVerifier: requiredApprovals === 1,
          });
          if (blocker) {
            return {
              error: blocker,
              statusCode: 422,
              decision: null,
              approval: null,
              approvalCount: 0,
              requiredApprovals,
              state: "BLOCKED" as const,
            };
          }
          if (
            input.confirmReleaseId?.toLowerCase() !==
            readiness.releaseId.toLowerCase()
          ) {
            return {
              error: "GO confirmation must match the current release SHA.",
              statusCode: 409,
              decision: null,
              approval: null,
              approvalCount: 0,
              requiredApprovals,
              state: "BLOCKED" as const,
            };
          }

          const gateFingerprint = pilotGateFingerprint(readiness);
          const closedGo = await tx.pilotGoApproval.findFirst({
            where: {
              orgId: user.orgId,
              gateFingerprint,
              decision: { is: { outcome: "GO" } },
            },
            select: { decisionId: true },
          });
          if (closedGo) {
            return {
              error: "This exact readiness gate already has a recorded GO decision.",
              statusCode: 409,
              decision: null,
              approval: null,
              approvalCount: requiredApprovals,
              requiredApprovals,
              state: "ALREADY_DECIDED" as const,
            };
          }

          const pendingRound = await tx.pilotGoApproval.findFirst({
            where: { orgId: user.orgId, gateFingerprint, decisionId: null },
            select: { roundId: true },
            orderBy: { createdAt: "asc" },
          });
          const roundId = pendingRound?.roundId ?? randomUUID();
          const duplicate = await tx.pilotGoApproval.findFirst({
            where: { orgId: user.orgId, roundId, approvedById: user.sub },
            select: { id: true },
          });
          if (duplicate) {
            return {
              error: "A second distinct administrator must approve this GO round.",
              statusCode: 409,
              decision: null,
              approval: null,
              approvalCount: 1,
              requiredApprovals,
              state: "PENDING_SECOND_APPROVAL" as const,
            };
          }

          const approval = await tx.pilotGoApproval.create({
            data: {
              orgId: user.orgId,
              releaseId: readiness.releaseId,
              roundId,
              gateFingerprint,
              rationale: input.rationale,
              evidence: pilotDecisionEvidence(readiness) as Prisma.InputJsonValue,
              evidenceAt: readiness.generatedAt,
              approvedById: user.sub,
            },
            include: pilotGoApprovalInclude,
          });
          const approvals = await tx.pilotGoApproval.findMany({
            where: { orgId: user.orgId, roundId, decisionId: null },
            include: pilotGoApprovalInclude,
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          });
          if (approvals.length < requiredApprovals) {
            return {
              error: null,
              statusCode: 202,
              decision: null,
              approval,
              approvalCount: approvals.length,
              requiredApprovals,
              state: "PENDING_SECOND_APPROVAL" as const,
            };
          }

          const selectedApprovals = approvals.slice(0, requiredApprovals);
          const evidence = {
            ...pilotDecisionEvidence(readiness),
            gateFingerprint,
            goApprovalPolicy:
              requiredApprovals === 1
                ? "SINGLE_ADMIN_EXACT_RELEASE_CONFIRMATION"
                : "TWO_DISTINCT_ADMINS_NOT_SELECTED_VERIFIERS",
            goApprovals: selectedApprovals.map((item) => ({
              id: item.id,
              roundId: item.roundId,
              approvedById: item.approvedById,
              rationale: item.rationale,
              createdAt: item.createdAt.toISOString(),
            })),
          };
          const decision = await tx.pilotDecision.create({
            data: {
              orgId: user.orgId,
              outcome: "GO",
              rationale: selectedApprovals
                .map((item) => item.rationale)
                .join(" | "),
              evidence: evidence as Prisma.InputJsonValue,
              evidencePolicy: readiness.policy,
              evidenceReady: readiness.ready,
              evidenceBlockers: readiness.blockers,
              evidenceWarnings: readiness.warnings,
              evidenceAt: readiness.generatedAt,
              decidedById: user.sub,
            },
            include: pilotDecisionInclude,
          });
          await tx.pilotGoApproval.updateMany({
            where: { id: { in: selectedApprovals.map((item) => item.id) } },
            data: { decisionId: decision.id },
          });
          return {
            error: null,
            statusCode: 201,
            decision,
            approval: {
              ...approval,
              decision: {
                id: decision.id,
                outcome: decision.outcome,
                createdAt: decision.createdAt,
              },
            },
            approvalCount: requiredApprovals,
            requiredApprovals,
            state: "GO_RECORDED" as const,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      if (result.error) {
        return reply.status(result.statusCode).send({ error: result.error });
      }
      return reply.status(result.statusCode).send({
        decision: result.decision,
        approval: result.approval,
        approvalCount: result.approvalCount,
        requiredApprovals: result.requiredApprovals,
        state: result.state,
        policy:
          input.outcome === "GO"
            ? result.requiredApprovals === 1
              ? "SINGLE_ADMIN_EXACT_RELEASE_GO_NO_EXECUTION"
              : "DUAL_ADMIN_GO_APPROVAL_NO_EXECUTION"
            : "DECISION_RECORD_ONLY_NO_EXECUTION",
      });
    },
  );
}
