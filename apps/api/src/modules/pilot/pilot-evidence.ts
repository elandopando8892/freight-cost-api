import type { PilotCheck } from "./pilot-readiness.js";
import type { PilotVerificationGateEvaluation } from "./pilot-verifications.js";

export type PilotEvidence = {
  generatedAt: Date;
  orgId: string;
  releaseId: string;
  policy: string;
  ready: boolean;
  blockers: number;
  warnings: number;
  stagingVerifications: {
    smoke: PilotVerificationGateEvaluation;
    human: PilotVerificationGateEvaluation;
  };
  checks: PilotCheck[];
};

function csvCell(value: string | number | boolean) {
  const safeValue = String(value).replace(/^[=+\-@]/, "'$&");
  return `"${safeValue.replace(/"/g, '""')}"`;
}

/** A portable, read-only record of the pilot gate at the instant it was requested. */
export function pilotEvidenceCsv(evidence: PilotEvidence) {
  const rows = [
    [
      "Generated At",
      "Organization ID",
      "Release ID",
      "Smoke Verification ID",
      "Smoke Status",
      "Human Verification ID",
      "Human Status",
      "Policy",
      "Ready",
      "Blockers",
      "Warnings",
      "Check",
      "Status",
      "Label",
      "Detail",
      "Module",
    ],
    ...evidence.checks.map((check) => [
      evidence.generatedAt.toISOString(),
      evidence.orgId,
      evidence.releaseId,
      evidence.stagingVerifications.smoke.verificationId ?? "",
      evidence.stagingVerifications.smoke.status,
      evidence.stagingVerifications.human.verificationId ?? "",
      evidence.stagingVerifications.human.status,
      evidence.policy,
      evidence.ready,
      evidence.blockers,
      evidence.warnings,
      check.key,
      check.status,
      check.label,
      check.detail,
      check.href,
    ]),
  ];

  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
