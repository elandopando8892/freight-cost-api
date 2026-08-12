export type VercelEnvironmentMetadata = {
  key: string;
  type: string;
  target: string[];
};

export type StagingInfrastructureCheck = {
  key: string;
  status: "PASS" | "BLOCK";
  detail: string;
};

const API_REQUIRED = [
  "STAGING_DATABASE_URL",
  "NODE_ENV",
  "KINDE_ISSUER_URL",
  "KINDE_AUDIENCE",
  "CORS_ORIGINS",
  "OPENAI_API_KEY",
  "OPENAI_KEY_ROTATED_AT",
  "OPENAI_MODEL",
] as const;

const WEB_REQUIRED = [
  "API_URL",
  "KINDE_CLIENT_ID",
  "KINDE_CLIENT_SECRET",
  "KINDE_ISSUER_URL",
  "KINDE_SITE_URL",
  "KINDE_POST_LOGIN_REDIRECT_URL",
  "KINDE_POST_LOGOUT_REDIRECT_URL",
  "KINDE_AUDIENCE",
] as const;

function missingKeys(
  required: readonly string[],
  entries: VercelEnvironmentMetadata[],
) {
  const available = new Set(entries.map((entry) => entry.key));
  return required.filter((key) => !available.has(key));
}

function entryFor(entries: VercelEnvironmentMetadata[], key: string) {
  return entries.find((entry) => entry.key === key);
}

function isPreviewOnly(entry: VercelEnvironmentMetadata | undefined) {
  return Boolean(
    entry &&
      entry.target.includes("preview") &&
      !entry.target.includes("production"),
  );
}

/**
 * Metadata-only gate. Vercel values are intentionally never accepted by or
 * returned from this evaluator.
 */
export function evaluateStagingInfrastructure(input: {
  api: VercelEnvironmentMetadata[];
  web: VercelEnvironmentMetadata[];
}) {
  const missingApi = missingKeys(API_REQUIRED, input.api);
  const missingWeb = missingKeys(WEB_REQUIRED, input.web);
  const isolatedDatabase = isPreviewOnly(
    entryFor(input.api, "STAGING_DATABASE_URL"),
  );
  const isolatedApiUrl = isPreviewOnly(entryFor(input.web, "API_URL"));
  const isolatedWebKindeSecret = isPreviewOnly(
    entryFor(input.web, "KINDE_CLIENT_SECRET"),
  );
  const checks: StagingInfrastructureCheck[] = [
    {
      key: "API_PREVIEW_CONFIGURATION",
      status: missingApi.length === 0 ? "PASS" : "BLOCK",
      detail: missingApi.length
        ? `Faltan variables Preview del API: ${missingApi.join(", ")}.`
        : "El API declara todas las variables requeridas para Preview.",
    },
    {
      key: "WEB_PREVIEW_CONFIGURATION",
      status: missingWeb.length === 0 ? "PASS" : "BLOCK",
      detail: missingWeb.length
        ? `Faltan variables Preview del web: ${missingWeb.join(", ")}.`
        : "El web declara todas las variables requeridas para Preview.",
    },
    {
      key: "DATABASE_ISOLATION",
      status: isolatedDatabase ? "PASS" : "BLOCK",
      detail: isolatedDatabase
        ? "STAGING_DATABASE_URL está limitada a Preview y el runtime la prioriza."
        : "STAGING_DATABASE_URL debe existir sólo en Preview para impedir acceso accidental a Production.",
    },
    {
      key: "WEB_TO_API_ISOLATION",
      status: isolatedApiUrl ? "PASS" : "BLOCK",
      detail: isolatedApiUrl
        ? "API_URL está limitada a Preview."
        : "API_URL debe apuntar al alias estable del API de staging y existir sólo en Preview.",
    },
    {
      key: "KINDE_CLIENT_ISOLATION",
      status: isolatedWebKindeSecret ? "PASS" : "BLOCK",
      detail: isolatedWebKindeSecret
        ? "El secreto cliente de Kinde está limitado a Preview."
        : "KINDE_CLIENT_SECRET debe ser una credencial de staging limitada a Preview.",
    },
  ];
  return {
    ready: checks.every((check) => check.status === "PASS"),
    blockers: checks.filter((check) => check.status === "BLOCK").length,
    checks,
  };
}
