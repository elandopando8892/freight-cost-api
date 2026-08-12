export type PilotStagingCheck = {
  key: string;
  status: "PASS" | "BLOCK";
  detail: string;
};

export type PilotStagingActorContext = {
  userId: string;
  orgId: string;
  role: "ADMIN" | "OPERATOR" | "VIEWER";
  releaseId: string;
};

export type PilotStagingReadiness = {
  ready: boolean;
  releaseId: string;
  blockers: number;
  checks: Array<{ key: string; status: "PASS" | "WARN" | "BLOCK" }>;
  stagingVerifications: {
    smoke: {
      status: string;
      verificationId: string | null;
      verifiedById: string | null;
    };
    human: {
      status: string;
      verificationId: string | null;
      verifiedById: string | null;
    };
  };
};

export type PilotStagingPreflightInput = {
  expectedReleaseId: string;
  expectedOrgId: string;
  health: { status: number; releaseId: string | null; bodyRelease: string | null };
  ready: {
    status: number;
    releaseId: string | null;
    bodyRelease: string | null;
    bodyStatus: string | null;
    database: string | null;
  };
  actors: {
    smokeVerifier: PilotStagingActorContext;
    humanVerifier: PilotStagingActorContext;
    approverOne: PilotStagingActorContext;
    approverTwo: PilotStagingActorContext;
  };
  readiness: PilotStagingReadiness;
};

export function stagingPilotExecutionConfirmation(
  releaseId: string,
  orgId: string,
) {
  return `EXECUTE_STAGING_GO:${releaseId.toLowerCase()}:${orgId}`;
}

export function evaluatePilotStagingPreflight(
  input: PilotStagingPreflightInput,
) {
  const expectedRelease = input.expectedReleaseId.toLowerCase();
  const releaseMatches = (value: string | null | undefined) =>
    value?.toLowerCase() === expectedRelease;
  const contexts = Object.values(input.actors);
  const uniqueActors = new Set(contexts.map((context) => context.userId));
  const actorsValid =
    contexts.length === 4 &&
    uniqueActors.size === 4 &&
    contexts.every(
      (context) =>
        context.role === "ADMIN" &&
        context.orgId === input.expectedOrgId &&
        releaseMatches(context.releaseId),
    );
  const verifications = input.readiness.stagingVerifications;
  const selectedVerifiersValid =
    verifications.smoke.status === "PASS" &&
    Boolean(verifications.smoke.verificationId) &&
    verifications.smoke.verifiedById === input.actors.smokeVerifier.userId &&
    verifications.human.status === "PASS" &&
    Boolean(verifications.human.verificationId) &&
    verifications.human.verifiedById === input.actors.humanVerifier.userId;
  const checks: PilotStagingCheck[] = [
    {
      key: "API_HEALTH",
      status:
        input.health.status === 200 &&
        releaseMatches(input.health.releaseId) &&
        releaseMatches(input.health.bodyRelease)
          ? "PASS"
          : "BLOCK",
      detail: "Health debe responder 200 con el release esperado en body y header.",
    },
    {
      key: "API_READY",
      status:
        input.ready.status === 200 &&
        input.ready.bodyStatus === "ready" &&
        input.ready.database === "connected" &&
        releaseMatches(input.ready.releaseId) &&
        releaseMatches(input.ready.bodyRelease)
          ? "PASS"
          : "BLOCK",
      detail: "Ready debe confirmar PostgreSQL y el mismo release sin degradación.",
    },
    {
      key: "FOUR_DISTINCT_ADMINS",
      status: actorsValid ? "PASS" : "BLOCK",
      detail:
        "Los dos verificadores y dos aprobadores deben ser ADMIN distintos del tenant esperado.",
    },
    {
      key: "SELECTED_VERIFIERS",
      status: selectedVerifiersValid ? "PASS" : "BLOCK",
      detail:
        "Los PASS vigentes deben pertenecer exactamente a los verificadores declarados.",
    },
    {
      key: "CURRENT_RELEASE_GATE",
      status:
        input.readiness.ready &&
        input.readiness.blockers === 0 &&
        releaseMatches(input.readiness.releaseId) &&
        !input.readiness.checks.some((check) => check.status === "BLOCK")
          ? "PASS"
          : "BLOCK",
      detail: "Readiness debe estar libre de bloqueos para el release esperado.",
    },
  ];
  return {
    ready: checks.every((check) => check.status === "PASS"),
    checks,
  };
}

export type PilotGoSequenceInput = {
  first: { status: number; state: string | null; approvalCount: number | null };
  duplicate: { status: number; error: string | null };
  second: {
    status: number;
    state: string | null;
    approvalCount: number | null;
    decisionId: string | null;
  };
  decisionPersisted: boolean;
  linkedDistinctApprovalCount: number;
};

export function evaluatePilotGoSequence(input: PilotGoSequenceInput) {
  const checks: PilotStagingCheck[] = [
    {
      key: "FIRST_APPROVAL_PENDING",
      status:
        input.first.status === 202 &&
        input.first.state === "PENDING_SECOND_APPROVAL" &&
        input.first.approvalCount === 1
          ? "PASS"
          : "BLOCK",
      detail: "La primera identidad debe dejar una aprobación pendiente.",
    },
    {
      key: "DUPLICATE_IDENTITY_BLOCKED",
      status:
        input.duplicate.status === 409 &&
        Boolean(input.duplicate.error?.match(/distinct administrator/i))
          ? "PASS"
          : "BLOCK",
      detail: "La misma identidad no puede completar la segunda aprobación.",
    },
    {
      key: "SECOND_APPROVAL_CLOSES_GO",
      status:
        input.second.status === 201 &&
        input.second.state === "GO_RECORDED" &&
        input.second.approvalCount === 2 &&
        Boolean(input.second.decisionId)
          ? "PASS"
          : "BLOCK",
      detail: "La segunda identidad debe cerrar GO con dos aprobaciones.",
    },
    {
      key: "PERSISTED_DUAL_EVIDENCE",
      status:
        input.decisionPersisted && input.linkedDistinctApprovalCount === 2
          ? "PASS"
          : "BLOCK",
      detail: "El ledger debe conservar la decisión y dos aprobadores distintos.",
    },
  ];
  return {
    ready: checks.every((check) => check.status === "PASS"),
    checks,
  };
}
