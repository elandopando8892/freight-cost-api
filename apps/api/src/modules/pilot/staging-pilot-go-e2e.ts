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
    administrator: PilotStagingActorContext;
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
  const administrator = input.actors.administrator;
  const actorValid =
    administrator.role === "ADMIN" &&
    administrator.orgId === input.expectedOrgId &&
    releaseMatches(administrator.releaseId);
  const verifications = input.readiness.stagingVerifications;
  const selectedVerifiersValid =
    verifications.smoke.status === "PASS" &&
    Boolean(verifications.smoke.verificationId) &&
    verifications.smoke.verifiedById === administrator.userId &&
    verifications.human.status === "PASS" &&
    Boolean(verifications.human.verificationId) &&
    verifications.human.verifiedById === administrator.userId;
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
      key: "SINGLE_ADMIN_CONTEXT",
      status: actorValid ? "PASS" : "BLOCK",
      detail:
        "El administrador debe pertenecer al tenant y release esperados.",
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
  approval: {
    status: number;
    state: string | null;
    approvalCount: number | null;
    decisionId: string | null;
  };
  decisionPersisted: boolean;
  linkedApprovalCount: number;
};

export function evaluatePilotGoSequence(input: PilotGoSequenceInput) {
  const checks: PilotStagingCheck[] = [
    {
      key: "SINGLE_APPROVAL_CLOSES_GO",
      status:
        input.approval.status === 201 &&
        input.approval.state === "GO_RECORDED" &&
        input.approval.approvalCount === 1 &&
        Boolean(input.approval.decisionId)
          ? "PASS"
          : "BLOCK",
      detail: "El ADMIN único debe cerrar GO en una sola aprobación.",
    },
    {
      key: "PERSISTED_SINGLE_ADMIN_EVIDENCE",
      status:
        input.decisionPersisted && input.linkedApprovalCount === 1
          ? "PASS"
          : "BLOCK",
      detail: "El ledger debe conservar la decisión y su aprobación enlazada.",
    },
  ];
  return {
    ready: checks.every((check) => check.status === "PASS"),
    checks,
  };
}
