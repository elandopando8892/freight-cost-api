import {
  evaluatePilotGoSequence,
  evaluatePilotStagingPreflight,
  stagingPilotExecutionConfirmation,
  type PilotStagingActorContext,
  type PilotStagingReadiness,
} from "../src/modules/pilot/staging-pilot-go-e2e.js";

const REQUEST_TIMEOUT_MS = 10_000;

type JsonObject = Record<string, any>;
type HttpResult = {
  status: number;
  requestId: string | null;
  releaseId: string | null;
  body: unknown;
};

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function stagingApiUrl() {
  const url = new URL(required("STAGING_API_URL"));
  if (url.protocol !== "https:") throw new Error("STAGING_API_URL must use HTTPS.");
  return url;
}

function endpoint(base: URL, pathname: string) {
  const prefix = base.pathname.replace(/\/$/, "");
  return new URL(`${prefix}${pathname}`, base.origin);
}

async function call(
  base: URL,
  pathname: string,
  token?: string,
  init: { method?: "GET" | "POST"; json?: unknown } = {},
): Promise<HttpResult> {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (init.json !== undefined) headers.set("content-type", "application/json");
  try {
    const response = await fetch(endpoint(base, pathname), {
      method: init.method ?? "GET",
      headers,
      body: init.json === undefined ? undefined : JSON.stringify(init.json),
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const text = await response.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    return {
      status: response.status,
      requestId: response.headers.get("x-request-id"),
      releaseId: response.headers.get("x-release-id"),
      body,
    };
  } catch {
    return { status: 0, requestId: null, releaseId: null, body: null };
  }
}

function objectBody(result: HttpResult, label: string): JsonObject {
  if (!result.body || typeof result.body !== "object" || Array.isArray(result.body)) {
    throw new Error(`${label} returned an invalid JSON object.`);
  }
  return result.body as JsonObject;
}

function arrayBody(result: HttpResult, label: string): JsonObject[] {
  if (!Array.isArray(result.body)) {
    throw new Error(`${label} returned an invalid JSON array.`);
  }
  return result.body.filter(
    (item): item is JsonObject => Boolean(item && typeof item === "object"),
  );
}

function actorContext(result: HttpResult, label: string): PilotStagingActorContext {
  if (result.status !== 200) throw new Error(`${label} context was not accepted.`);
  const body = objectBody(result, label);
  if (
    typeof body.userId !== "string" ||
    typeof body.orgId !== "string" ||
    !["ADMIN", "OPERATOR", "VIEWER"].includes(body.role) ||
    typeof body.releaseId !== "string"
  ) {
    throw new Error(`${label} context is incomplete.`);
  }
  return body as PilotStagingActorContext;
}

function readinessBody(result: HttpResult): PilotStagingReadiness {
  if (result.status !== 200) throw new Error("Pilot readiness was not accepted.");
  return objectBody(result, "pilot readiness") as PilotStagingReadiness;
}

function safeRequestIds(entries: Record<string, HttpResult>) {
  return Object.fromEntries(
    Object.entries(entries).map(([key, result]) => [key, result.requestId]),
  );
}

function emit(value: unknown) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

async function main() {
  if (process.argv.includes("--help")) {
    emit({
      command: "npm run e2e:staging:pilot -- [--execute]",
      defaultMode: "READ_ONLY_PREFLIGHT",
      requiredEnvironment: [
        "STAGING_API_URL",
        "STAGING_EXPECTED_RELEASE_SHA",
        "STAGING_EXPECTED_ORG_ID",
        "STAGING_SMOKE_VERIFIER_TOKEN",
        "STAGING_HUMAN_VERIFIER_TOKEN",
        "STAGING_APPROVER_ONE_TOKEN",
        "STAGING_APPROVER_TWO_TOKEN",
      ],
      executeOnlyEnvironment: ["STAGING_PILOT_EXECUTION_CONFIRM"],
      note: "Use ephemeral tokens in the process environment; never save them in project files.",
    });
    return;
  }
  const api = stagingApiUrl();
  const expectedReleaseId = required("STAGING_EXPECTED_RELEASE_SHA").toLowerCase();
  const expectedOrgId = required("STAGING_EXPECTED_ORG_ID");
  if (!/^[a-f0-9]{7,64}$/i.test(expectedReleaseId)) {
    throw new Error("STAGING_EXPECTED_RELEASE_SHA must be a release SHA.");
  }
  const tokens = {
    smokeVerifier: required("STAGING_SMOKE_VERIFIER_TOKEN"),
    humanVerifier: required("STAGING_HUMAN_VERIFIER_TOKEN"),
    approverOne: required("STAGING_APPROVER_ONE_TOKEN"),
    approverTwo: required("STAGING_APPROVER_TWO_TOKEN"),
  };

  const [health, ready, smokeContext, humanContext, approverOneContext, approverTwoContext] =
    await Promise.all([
      call(api, "/health"),
      call(api, "/ready"),
      call(api, "/pilot/staging-context", tokens.smokeVerifier),
      call(api, "/pilot/staging-context", tokens.humanVerifier),
      call(api, "/pilot/staging-context", tokens.approverOne),
      call(api, "/pilot/staging-context", tokens.approverTwo),
    ]);
  const readiness = await call(
    api,
    "/pilot/staging-readiness",
    tokens.approverOne,
  );
  const healthBody = objectBody(health, "health");
  const readyBody = objectBody(ready, "ready");
  const preflight = evaluatePilotStagingPreflight({
    expectedReleaseId,
    expectedOrgId,
    health: {
      status: health.status,
      releaseId: health.releaseId,
      bodyRelease: typeof healthBody.release === "string" ? healthBody.release : null,
    },
    ready: {
      status: ready.status,
      releaseId: ready.releaseId,
      bodyRelease: typeof readyBody.release === "string" ? readyBody.release : null,
      bodyStatus: typeof readyBody.status === "string" ? readyBody.status : null,
      database: typeof readyBody.database === "string" ? readyBody.database : null,
    },
    actors: {
      smokeVerifier: actorContext(smokeContext, "smoke verifier"),
      humanVerifier: actorContext(humanContext, "human verifier"),
      approverOne: actorContext(approverOneContext, "approver one"),
      approverTwo: actorContext(approverTwoContext, "approver two"),
    },
    readiness: readinessBody(readiness),
  });
  const preflightEvidence = {
    schemaVersion: "fcm.staging-pilot-go-e2e.v1",
    mode: "READ_ONLY_PREFLIGHT",
    generatedAt: new Date().toISOString(),
    expectedReleaseId,
    remoteSystemsChecked: true,
    writesAttempted: false,
    ...preflight,
    requestIds: safeRequestIds({
      health,
      ready,
      smokeContext,
      humanContext,
      approverOneContext,
      approverTwoContext,
      readiness,
    }),
  };

  if (!process.argv.includes("--execute")) {
    emit(preflightEvidence);
    process.exitCode = preflight.ready ? 0 : 1;
    return;
  }
  if (!preflight.ready) {
    emit(preflightEvidence);
    process.exitCode = 1;
    return;
  }
  const expectedConfirmation = stagingPilotExecutionConfirmation(
    expectedReleaseId,
    expectedOrgId,
  );
  if (process.env.STAGING_PILOT_EXECUTION_CONFIRM !== expectedConfirmation) {
    throw new Error(
      "Execution confirmation does not match the staging release and organization.",
    );
  }

  const first = await call(api, "/pilot/decisions", tokens.approverOne, {
    method: "POST",
    json: {
      outcome: "GO",
      rationale: "Sprint 71 controlled staging E2E: first independent approval.",
    },
  });
  const firstBody = objectBody(first, "first approval");
  if (
    first.status !== 202 ||
    firstBody.state !== "PENDING_SECOND_APPROVAL" ||
    firstBody.approvalCount !== 1
  ) {
    emit({
      ...preflightEvidence,
      mode: "EXECUTE_STOPPED_AFTER_FIRST_WRITE",
      writesAttempted: true,
      executionReady: false,
      stopReason: "FIRST_APPROVAL_NOT_PENDING",
      requestIds: { ...preflightEvidence.requestIds, first: first.requestId },
    });
    process.exitCode = 1;
    return;
  }

  const duplicate = await call(api, "/pilot/decisions", tokens.approverOne, {
    method: "POST",
    json: {
      outcome: "GO",
      rationale: "Sprint 71 controlled staging E2E: duplicate identity rejection.",
    },
  });
  const duplicateBody = objectBody(duplicate, "duplicate approval");
  if (
    duplicate.status !== 409 ||
    typeof duplicateBody.error !== "string" ||
    !/distinct administrator/i.test(duplicateBody.error)
  ) {
    emit({
      ...preflightEvidence,
      mode: "EXECUTE_STOPPED_WITH_PENDING_APPROVAL",
      writesAttempted: true,
      executionReady: false,
      stopReason: "DUPLICATE_IDENTITY_NOT_BLOCKED",
      requestIds: {
        ...preflightEvidence.requestIds,
        first: first.requestId,
        duplicate: duplicate.requestId,
      },
    });
    process.exitCode = 1;
    return;
  }

  const second = await call(api, "/pilot/decisions", tokens.approverTwo, {
    method: "POST",
    json: {
      outcome: "GO",
      rationale: "Sprint 71 controlled staging E2E: second independent approval.",
    },
  });
  const secondBody = objectBody(second, "second approval");
  const decisionId =
    secondBody.decision && typeof secondBody.decision.id === "string"
      ? secondBody.decision.id
      : null;
  const [decisionsResult, approvalsResult] = await Promise.all([
    call(api, "/pilot/decisions", tokens.approverTwo),
    call(api, "/pilot/go-approvals", tokens.approverTwo),
  ]);
  const decisions = arrayBody(decisionsResult, "decisions");
  const approvals = arrayBody(approvalsResult, "GO approvals");
  const linkedApprovals = approvals.filter(
    (approval) => approval.decision?.id === decisionId,
  );
  const distinctApprovers = new Set(
    linkedApprovals.map((approval) => approval.approvedBy?.id).filter(Boolean),
  );
  const sequence = evaluatePilotGoSequence({
    first: {
      status: first.status,
      state: typeof firstBody.state === "string" ? firstBody.state : null,
      approvalCount:
        typeof firstBody.approvalCount === "number" ? firstBody.approvalCount : null,
    },
    duplicate: {
      status: duplicate.status,
      error: typeof duplicateBody.error === "string" ? duplicateBody.error : null,
    },
    second: {
      status: second.status,
      state: typeof secondBody.state === "string" ? secondBody.state : null,
      approvalCount:
        typeof secondBody.approvalCount === "number" ? secondBody.approvalCount : null,
      decisionId,
    },
    decisionPersisted: Boolean(
      decisionId && decisions.some((decision) => decision.id === decisionId),
    ),
    linkedDistinctApprovalCount: distinctApprovers.size,
  });
  emit({
    schemaVersion: "fcm.staging-pilot-go-e2e.v1",
    mode: "EXECUTED_STAGING_GO",
    generatedAt: new Date().toISOString(),
    expectedReleaseId,
    remoteSystemsChecked: true,
    writesAttempted: true,
    decisionId,
    ...sequence,
    requestIds: safeRequestIds({
      health,
      ready,
      smokeContext,
      humanContext,
      approverOneContext,
      approverTwoContext,
      readiness,
      first,
      duplicate,
      second,
      decisionsResult,
      approvalsResult,
    }),
  });
  process.exitCode = sequence.ready ? 0 : 1;
}

main().catch(() => {
  process.stderr.write(
    "Staging pilot E2E could not start; verify target, ephemeral tokens and explicit confirmation.\n",
  );
  process.exitCode = 1;
});
