import { createHash } from "node:crypto";
import type { PilotEvidence } from "./pilot-evidence.js";

export type PilotDecisionOutcome = "GO" | "NO_GO";

export function pilotDecisionBlocker(
  outcome: PilotDecisionOutcome,
  evidence: PilotEvidence,
) {
  if (outcome === "GO" && !evidence.ready) {
    return "A GO decision requires a readiness snapshot with no blockers.";
  }
  return null;
}

export function pilotGoApprovalBlocker(
  actorId: string,
  evidence: PilotEvidence,
) {
  const readinessBlocker = pilotDecisionBlocker("GO", evidence);
  if (readinessBlocker) return readinessBlocker;

  const selected = [
    evidence.stagingVerifications.smoke,
    evidence.stagingVerifications.human,
  ];
  if (
    selected.some(
      (verification) =>
        verification.status !== "PASS" || !verification.verificationId,
    )
  ) {
    return "A GO approval requires the two current PASS verification records.";
  }
  if (selected.some((verification) => verification.verifiedById === actorId)) {
    return "The verifier of selected staging evidence cannot approve the same GO.";
  }
  return null;
}

export function pilotGateFingerprint(evidence: PilotEvidence) {
  const payload = {
    schemaVersion: "fcm.pilot-go-gate.v1",
    orgId: evidence.orgId,
    releaseId: evidence.releaseId,
    policy: evidence.policy,
    ready: evidence.ready,
    blockers: evidence.blockers,
    warnings: evidence.warnings,
    verifications: [
      evidence.stagingVerifications.smoke,
      evidence.stagingVerifications.human,
    ].map((verification) => ({
      kind: verification.kind,
      status: verification.status,
      verificationId: verification.verificationId,
      outcome: verification.outcome,
      executedAt: verification.executedAt?.toISOString() ?? null,
      verifiedById: verification.verifiedById,
    })),
    checks: [...evidence.checks]
      .map((check) => ({
        key: check.key,
        status: check.status,
        detail: check.detail,
      }))
      .sort((a, b) => a.key.localeCompare(b.key)),
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

// Persist the evaluated evidence, not live references. This makes a decision
// auditable even if the organization changes immediately after it is recorded.
export function pilotDecisionEvidence(evidence: PilotEvidence) {
  return {
    generatedAt: evidence.generatedAt.toISOString(),
    orgId: evidence.orgId,
    releaseId: evidence.releaseId,
    policy: evidence.policy,
    ready: evidence.ready,
    blockers: evidence.blockers,
    warnings: evidence.warnings,
    stagingVerifications: Object.fromEntries(
      Object.entries(evidence.stagingVerifications).map(([key, verification]) => [
        key,
        {
          ...verification,
          executedAt: verification.executedAt?.toISOString() ?? null,
        },
      ]),
    ),
    checks: evidence.checks.map((check) => ({
      key: check.key,
      status: check.status,
      label: check.label,
      detail: check.detail,
      module: check.href,
    })),
  };
}
