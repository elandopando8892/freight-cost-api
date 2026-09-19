export type StagingSmokeResponse = {
  status: number;
  headers: {
    cacheControl?: string;
    accessControlAllowOrigin?: string;
    contentSecurityPolicyReportOnly?: string;
  };
  body: {
    status?: string;
    database?: string;
    release?: string;
    error?: string;
  } | null;
};

export type StagingAuthBffSmokeInput = {
  transport?: "direct" | "bff";
  /** Reference to separately reviewed routing evidence, not authentication proof. */
  bffEvidence?: string;
  webOrigin: string;
  webLogin: StagingSmokeResponse;
  bffUnauthenticated: StagingSmokeResponse;
  apiHealth: StagingSmokeResponse;
  apiReady: StagingSmokeResponse;
  apiCors: StagingSmokeResponse;
};

export type StagingSmokeCheck = {
  key:
    | "WEB_LOGIN"
    | "WEB_CSP_REPORT_ONLY"
    | "BFF_UNAUTHENTICATED"
    | "API_HEALTH"
    | "API_READY"
    | "API_CORS";
  status: "PASS" | "BLOCK" | "NOT_APPLICABLE";
  detail: string;
};

function hasNoStore(value: string | undefined) {
  return value?.toLowerCase().split(",").map((item) => item.trim()).includes("no-store") ?? false;
}

function hasCspReportOnlyPolicy(value: string | undefined) {
  const policy = value?.toLowerCase() ?? "";
  return (
    policy.includes("default-src 'self'") &&
    policy.includes("frame-ancestors 'none'") &&
    policy.includes("frame-src 'self' https:")
  );
}

export function evaluateStagingAuthBffSmoke(input: StagingAuthBffSmokeInput) {
  const transport = input.transport ?? "direct";
  if (transport !== "direct" && transport !== "bff") throw new Error("Invalid smoke transport.");
  if (transport === "bff" && !input.bffEvidence?.trim()) throw new Error("BFF routing evidence is required.");
  const healthRelease = input.apiHealth.body?.release;
  const checks: StagingSmokeCheck[] = [
    {
      key: "WEB_LOGIN",
      status: input.webLogin.status >= 200 && input.webLogin.status < 400 ? "PASS" : "BLOCK",
      detail: `GET /login respondió ${input.webLogin.status}.`,
    },
    {
      key: "WEB_CSP_REPORT_ONLY",
      status: hasCspReportOnlyPolicy(input.webLogin.headers.contentSecurityPolicyReportOnly)
        ? "PASS"
        : "BLOCK",
      detail: "El Web debe incluir CSP Report-Only con aislamiento de frames durante QA.",
    },
    {
      key: "BFF_UNAUTHENTICATED",
      status:
        input.bffUnauthenticated.status === 401 &&
        input.bffUnauthenticated.body?.error === "Not authenticated" &&
        hasNoStore(input.bffUnauthenticated.headers.cacheControl)
          ? "PASS"
          : "BLOCK",
      detail: "El BFF sin sesión debe responder JSON 401 con cache-control: no-store.",
    },
    {
      key: "API_HEALTH",
      status:
        input.apiHealth.status === 200 &&
        input.apiHealth.body?.status === "ok" &&
        Boolean(healthRelease)
          ? "PASS"
          : "BLOCK",
      detail: "GET /health debe responder 200, status ok y release identificable.",
    },
    {
      key: "API_READY",
      status:
        input.apiReady.status === 200 &&
        input.apiReady.body?.status === "ready" &&
        input.apiReady.body?.database === "connected" &&
        input.apiReady.body?.release === healthRelease
          ? "PASS"
          : "BLOCK",
      detail: "GET /ready debe confirmar base conectada y el mismo release de /health.",
    },
    {
      key: "API_CORS",
      status:
        transport === "bff" ? "NOT_APPLICABLE" : input.apiCors.status === 200 &&
        input.apiCors.headers.accessControlAllowOrigin === input.webOrigin
          ? "PASS"
          : "BLOCK",
      detail: transport === "bff"
        ? "CORS directo no aplica al recorrido BFF revisado; esto no verifica sesión ni tráfico autenticado."
        : "La API debe devolver el origen Web de staging en Access-Control-Allow-Origin.",
    },
  ];

  return {
    scope: "read-only-unauthenticated-smoke",
    transport,
    bffEvidence: transport === "bff" ? input.bffEvidence : undefined,
    ready: checks.every((check) => check.status !== "BLOCK"),
    checks,
  };
}
