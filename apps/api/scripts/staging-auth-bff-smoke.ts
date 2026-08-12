import { evaluateStagingAuthBffSmoke, type StagingSmokeResponse } from "../src/modules/pilot/staging-auth-bff-smoke.js";

const REQUEST_TIMEOUT_MS = 10_000;

function configuredHttpsUrl(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);

  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error(`${name} must use HTTPS.`);
  return url;
}

function endpoint(base: URL, pathname: string) {
  const prefix = base.pathname.replace(/\/$/, "");
  return new URL(`${prefix}${pathname}`, base.origin);
}

async function probe(url: URL, headers?: HeadersInit): Promise<StagingSmokeResponse> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const text = await response.text();
    let body: StagingSmokeResponse["body"] = null;
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      body = {
        status: typeof parsed.status === "string" ? parsed.status : undefined,
        database: typeof parsed.database === "string" ? parsed.database : undefined,
        release: typeof parsed.release === "string" ? parsed.release : undefined,
        error: typeof parsed.error === "string" ? parsed.error : undefined,
      };
    } catch {
      // The login page is expected to be HTML. Its body is never logged.
    }
    return {
      status: response.status,
      headers: {
        cacheControl: response.headers.get("cache-control") ?? undefined,
        accessControlAllowOrigin: response.headers.get("access-control-allow-origin") ?? undefined,
        contentSecurityPolicyReportOnly:
          response.headers.get("content-security-policy-report-only") ?? undefined,
      },
      body,
    };
  } catch {
    return { status: 0, headers: {}, body: null };
  }
}

async function main() {
  const web = configuredHttpsUrl("STAGING_WEB_URL");
  const api = configuredHttpsUrl("STAGING_API_URL");
  const webOrigin = web.origin;

  const [webLogin, bffUnauthenticated, apiHealth, apiReady, apiCors] = await Promise.all([
    probe(endpoint(web, "/login")),
    probe(endpoint(web, "/api/v1/org")),
    probe(endpoint(api, "/health")),
    probe(endpoint(api, "/ready")),
    probe(endpoint(api, "/health"), { origin: webOrigin }),
  ]);
  const result = evaluateStagingAuthBffSmoke({
    webOrigin,
    webLogin,
    bffUnauthenticated,
    apiHealth,
    apiReady,
    apiCors,
  });

  process.stdout.write(`${JSON.stringify({ schemaVersion: "fcm.staging-auth-bff-smoke.v1", ...result })}\n`);
  process.exitCode = result.ready ? 0 : 1;
}

main().catch(() => {
  process.stderr.write("Staging smoke could not start; verify HTTPS target configuration.\n");
  process.exitCode = 1;
});
