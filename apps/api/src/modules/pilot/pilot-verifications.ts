export const PILOT_VERIFICATION_REQUIREMENTS = {
  STAGING_AUTH_BFF_SMOKE: [
    "WEB_LOGIN",
    "WEB_CSP_REPORT_ONLY",
    "BFF_UNAUTHENTICATED",
    "API_HEALTH",
    "API_READY",
    "API_CORS",
  ],
  STAGING_AUTH_BFF_HUMAN: [
    "LOGIN_CALLBACK",
    "SETTINGS_IDENTITY",
    "BFF_AUTHENTICATED",
    "BFF_UNAUTHENTICATED",
    "LOGOUT",
  ],
} as const;

export type PilotVerificationKind = keyof typeof PILOT_VERIFICATION_REQUIREMENTS;
export type PilotVerificationOutcome = "PASS" | "FAIL";
export type PilotVerificationCheck = { key: string; status: "PASS" | "BLOCK" };

export type PilotVerificationInput = {
  kind: PilotVerificationKind;
  outcome: PilotVerificationOutcome;
  checks: PilotVerificationCheck[];
  executedAt?: string | Date;
};

export type PilotVerificationGateRecord = {
  id: string;
  kind: PilotVerificationKind;
  outcome: PilotVerificationOutcome;
  releaseId: string;
  executedAt: Date;
  verifiedById: string;
  createdAt: Date;
};

export type PilotVerificationGateStatus =
  | "PASS"
  | "MISSING"
  | "FAIL"
  | "STALE"
  | "FUTURE";

export type PilotVerificationGateEvaluation = {
  kind: PilotVerificationKind;
  status: PilotVerificationGateStatus;
  verificationId: string | null;
  outcome: PilotVerificationOutcome | null;
  executedAt: Date | null;
  verifiedById: string | null;
};

export const PILOT_VERIFICATION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const PILOT_VERIFICATION_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export function pilotVerificationBlocker(input: PilotVerificationInput) {
  const required = PILOT_VERIFICATION_REQUIREMENTS[input.kind];
  const keys = input.checks.map((check) => check.key);
  const hasExactRequiredChecks =
    keys.length === required.length &&
    new Set(keys).size === keys.length &&
    required.every((key) => keys.includes(key));
  if (!hasExactRequiredChecks) {
    return "La verificación debe incluir exactamente los controles requeridos para su tipo.";
  }

  const allPassed = input.checks.every((check) => check.status === "PASS");
  if (input.outcome === "PASS" && !allPassed) {
    return "Una verificación PASS requiere que todos sus controles estén en PASS.";
  }
  if (input.outcome === "FAIL" && allPassed) {
    return "Una verificación FAIL debe identificar al menos un control bloqueado.";
  }
  if (input.executedAt) {
    const executedAt = new Date(input.executedAt).getTime();
    if (executedAt > Date.now() + PILOT_VERIFICATION_FUTURE_TOLERANCE_MS) {
      return "La fecha de ejecución no puede estar más de cinco minutos en el futuro.";
    }
  }
  return null;
}

function isLaterVerification(
  candidate: PilotVerificationGateRecord,
  current: PilotVerificationGateRecord,
) {
  const executedDelta =
    candidate.executedAt.getTime() - current.executedAt.getTime();
  if (executedDelta !== 0) return executedDelta > 0;

  const createdDelta = candidate.createdAt.getTime() - current.createdAt.getTime();
  if (createdDelta !== 0) return createdDelta > 0;

  return candidate.id.localeCompare(current.id) > 0;
}

/** Latest-execution-wins gate: a later FAIL supersedes a prior PASS. */
export function evaluatePilotVerificationGate(
  records: PilotVerificationGateRecord[],
  currentReleaseId: string,
  now = new Date(),
) {
  const normalizedRelease = currentReleaseId.toLowerCase();
  const latestByKind = new Map<PilotVerificationKind, PilotVerificationGateRecord>();
  for (const record of records) {
    if (record.releaseId.toLowerCase() !== normalizedRelease) continue;
    const current = latestByKind.get(record.kind);
    if (!current || isLaterVerification(record, current)) {
      latestByKind.set(record.kind, record);
    }
  }

  const evaluateKind = (
    kind: PilotVerificationKind,
  ): PilotVerificationGateEvaluation => {
    const record = latestByKind.get(kind);
    if (!record) {
      return {
        kind,
        status: "MISSING",
        verificationId: null,
        outcome: null,
        executedAt: null,
        verifiedById: null,
      };
    }

    const age = now.getTime() - record.executedAt.getTime();
    const status: PilotVerificationGateStatus =
      record.outcome === "FAIL"
        ? "FAIL"
        : age < -PILOT_VERIFICATION_FUTURE_TOLERANCE_MS
          ? "FUTURE"
          : age > PILOT_VERIFICATION_MAX_AGE_MS
            ? "STALE"
            : "PASS";
    return {
      kind,
      status,
      verificationId: record.id,
      outcome: record.outcome,
      executedAt: record.executedAt,
      verifiedById: record.verifiedById,
    };
  };

  const smoke = evaluateKind("STAGING_AUTH_BFF_SMOKE");
  const human = evaluateKind("STAGING_AUTH_BFF_HUMAN");

  return {
    stagingSmokeVerified: smoke.status === "PASS",
    stagingHumanVerified: human.status === "PASS",
    stagingSmokeStatus: smoke.status,
    stagingHumanStatus: human.status,
    stagingVerifications: { smoke, human },
  };
}

export function pilotVerificationEvidence(input: PilotVerificationInput) {
  return {
    schemaVersion: "fcm.pilot-verification.v1",
    kind: input.kind,
    outcome: input.outcome,
    checks: input.checks.map((check) => ({ key: check.key, status: check.status })),
  };
}
