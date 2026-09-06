import { parseTrustedOrigins } from "../../config/cors.js";

export type ReleasePreflightStatus = "PASS" | "WARN" | "BLOCK";

export type ReleasePreflightCheck = {
  key: string;
  status: ReleasePreflightStatus;
  label: string;
  detail: string;
};

export const REQUIRED_RELEASE_MIGRATIONS = [
  "20260811002100_scenario_review_packets",
  "20260811002200_scenario_review_draft_lineage",
  "20260811002300_pilot_decision_ledger",
  "20260811002400_rateware_delivery_approval_trace",
  "20260811002500_customer_quote_email_outbox",
  "20260812000100_pilot_verification_evidence",
  "20260812000200_pilot_go_dual_approval",
  "20260815000100_assumption_applicability_context",
  "20260830000100_add_supabase_identity",
  "20260830000200_finalize_supabase_identity",
] as const;

export const APPROVED_SUPABASE_PROJECT_REF = "alqjqzqagdmcywpjtnnr";

type ReleasePreflightInput = {
  environment: Record<string, string | undefined>;
  webEnvironment: Record<string, string | undefined>;
  migrationArtifacts: string[];
  gitDirtyFileCount: number | null;
  gitHead: string | null;
  requireRateware: boolean;
  nodeVersion: string;
};

function meetsMinimumNodeVersion(value: string) {
  const [major = 0] = value
    .replace(/^v/, "")
    .split(".")
    .map(Number);
  return (
    major >= 22
  );
}

function isProductionDatabaseUrl(value: string | undefined) {
  return Boolean(
    value &&
      /^(postgresql|postgres):\/\//.test(value) &&
      !value.includes("user:password@"),
  );
}

function isHttpsUrl(value: string | undefined) {
  try {
    return value ? new URL(value).protocol === "https:" : false;
  } catch {
    return false;
  }
}

function isIsoDate(value: string | undefined) {
  return Boolean(value && !Number.isNaN(Date.parse(value)));
}

function isReleaseSha(value: string | undefined) {
  return Boolean(value && /^[a-f0-9]{7,64}$/i.test(value));
}

function releaseMatchesGitHead(
  releaseSha: string | undefined,
  gitHead: string | null,
) {
  return Boolean(
    isReleaseSha(releaseSha) &&
      gitHead &&
      /^[a-f0-9]{40}$/i.test(gitHead) &&
      gitHead.toLowerCase().startsWith(releaseSha!.toLowerCase()),
  );
}

function hasConfiguredValue(value: string | undefined) {
  return Boolean(
    value &&
      value.trim() &&
      !/^(your-|replace-|change-me|local$)/i.test(value.trim()),
  );
}

function isConfiguredModel(value: string | undefined) {
  return Boolean(
    value &&
      /^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$/.test(value) &&
      hasConfiguredValue(value),
  );
}

function originOf(value: string | undefined) {
  try {
    return value && new URL(value).protocol === "https:"
      ? new URL(value).origin
      : null;
  } catch {
    return null;
  }
}

export function buildReleasePreflight(input: ReleasePreflightInput) {
  const missingMigrations = REQUIRED_RELEASE_MIGRATIONS.filter(
    (migration) => !input.migrationArtifacts.includes(migration),
  );
  const webSiteOrigin = originOf(input.webEnvironment.NEXT_PUBLIC_SITE_URL);
  const webSupabaseReady =
    isHttpsUrl(input.webEnvironment.NEXT_PUBLIC_SUPABASE_URL) &&
    hasConfiguredValue(input.webEnvironment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const apiAndWebSupabaseMatch =
    originOf(input.environment.SUPABASE_URL) !== null &&
    originOf(input.environment.SUPABASE_URL) ===
      originOf(input.webEnvironment.NEXT_PUBLIC_SUPABASE_URL);
  const approvedSupabaseProject =
    input.environment.SUPABASE_EXPECTED_PROJECT_REF ===
      APPROVED_SUPABASE_PROJECT_REF &&
    originOf(input.environment.SUPABASE_URL) ===
      `https://${APPROVED_SUPABASE_PROJECT_REF}.supabase.co`;
  const webOriginInCors =
    webSiteOrigin !== null &&
    parseTrustedOrigins(input.environment.CORS_ORIGINS).includes(webSiteOrigin);
  const checks: ReleasePreflightCheck[] = [
    {
      key: "NODE_RUNTIME",
      status: meetsMinimumNodeVersion(input.nodeVersion) ? "PASS" : "BLOCK",
      label: "Runtime Node.js",
      detail: meetsMinimumNodeVersion(input.nodeVersion)
        ? `Node ${input.nodeVersion} cumple el mínimo 22.0.0.`
        : `Node ${input.nodeVersion} es menor al mínimo 22.0.0 requerido para Supabase Auth.`,
    },
    {
      key: "WORKTREE",
      status:
        input.gitDirtyFileCount === 0
          ? "PASS"
          : input.gitDirtyFileCount === null
            ? "BLOCK"
            : "BLOCK",
      label: "Artefacto de release",
      detail:
        input.gitDirtyFileCount === 0
          ? "El árbol de trabajo está limpio."
          : input.gitDirtyFileCount === null
            ? "No se pudo comprobar el estado de Git."
            : `Hay ${input.gitDirtyFileCount} archivo(s) sin consolidar; no construyas un release desde este estado.`,
    },
    {
      key: "RELEASE_SHA",
      status: releaseMatchesGitHead(input.environment.RELEASE_SHA, input.gitHead)
        ? "PASS"
        : "BLOCK",
      label: "Identidad del artefacto",
      detail: releaseMatchesGitHead(input.environment.RELEASE_SHA, input.gitHead)
        ? `RELEASE_SHA coincide con el commit local ${input.gitHead?.slice(0, 12)}.`
        : !isReleaseSha(input.environment.RELEASE_SHA)
          ? "Falta RELEASE_SHA con el commit que se desplegará (7 a 64 caracteres hexadecimales)."
          : !input.gitHead
            ? "No se pudo comprobar el commit HEAD local."
            : "RELEASE_SHA no coincide con el commit HEAD local que se pretende liberar.",
    },
    {
      key: "DATABASE_URL",
      status: isProductionDatabaseUrl(input.environment.DATABASE_URL)
        ? "PASS"
        : "BLOCK",
      label: "Base de datos",
      detail: isProductionDatabaseUrl(input.environment.DATABASE_URL)
        ? "DATABASE_URL tiene una URL PostgreSQL no-placeholder."
        : "Falta DATABASE_URL válida o aún contiene el placeholder local.",
    },
    {
      key: "SUPABASE_AUTH",
      status:
        isHttpsUrl(input.environment.SUPABASE_URL) &&
        hasConfiguredValue(input.environment.SUPABASE_PUBLISHABLE_KEY) &&
        approvedSupabaseProject &&
        input.environment.SUPABASE_JWT_AUDIENCE === "authenticated"
          ? "PASS"
          : "BLOCK",
      label: "Autenticación Supabase",
      detail:
        isHttpsUrl(input.environment.SUPABASE_URL) &&
        hasConfiguredValue(input.environment.SUPABASE_PUBLISHABLE_KEY) &&
        approvedSupabaseProject &&
        input.environment.SUPABASE_JWT_AUDIENCE === "authenticated"
          ? "Rateware Supabase, llave publicable y audience authenticated están configurados."
          : "La configuración debe fijar Auth al proyecto aprobado rateware-prod, con llave publicable y audience authenticated.",
    },
    {
      key: "CORS",
      status:
        parseTrustedOrigins(input.environment.CORS_ORIGINS).length > 0
          ? "PASS"
          : "BLOCK",
      label: "Orígenes del navegador",
      detail:
        parseTrustedOrigins(input.environment.CORS_ORIGINS).length > 0
          ? "CORS tiene al menos un origen HTTPS autorizado."
          : "Falta CORS_ORIGINS con el dominio HTTPS de la aplicación web.",
    },
    {
      key: "WEB_UPSTREAM",
      status: isHttpsUrl(input.webEnvironment.API_URL) ? "PASS" : "BLOCK",
      label: "BFF del Web",
      detail: isHttpsUrl(input.webEnvironment.API_URL)
        ? "API_URL del Web usa HTTPS."
        : "Falta API_URL HTTPS para el BFF del Web.",
    },
    {
      key: "WEB_SUPABASE_AUTH",
      status: webSupabaseReady && apiAndWebSupabaseMatch ? "PASS" : "BLOCK",
      label: "Supabase Auth del Web",
      detail: webSupabaseReady && apiAndWebSupabaseMatch
        ? "Web y API apuntan al mismo proyecto Supabase Auth con llave publicable."
        : "Falta la configuración Supabase del Web o Web/API apuntan a proyectos distintos.",
    },
    {
      key: "CORS_WEB_ORIGIN",
      status: webOriginInCors ? "PASS" : "BLOCK",
      label: "Origen Web en CORS",
      detail: webOriginInCors
          ? "El origen del Web coincide con el allowlist CORS de la API."
          : "NEXT_PUBLIC_SITE_URL debe ser HTTPS y estar en CORS_ORIGINS de la API.",
    },
    {
      key: "AI_KEY",
      status:
        Boolean(input.environment.OPENAI_API_KEY) &&
        isIsoDate(input.environment.OPENAI_KEY_ROTATED_AT) &&
        isConfiguredModel(input.environment.OPENAI_MODEL)
          ? "PASS"
          : "BLOCK",
      label: "Configuración AI",
      detail:
        Boolean(input.environment.OPENAI_API_KEY) &&
        isIsoDate(input.environment.OPENAI_KEY_ROTATED_AT) &&
        isConfiguredModel(input.environment.OPENAI_MODEL)
          ? "La clave, su rotación y el modelo explícito están configurados."
          : "Falta OPENAI_API_KEY, OPENAI_KEY_ROTATED_AT ISO u OPENAI_MODEL explícito.",
    },
    {
      key: "MIGRATION_ARTIFACTS",
      status: missingMigrations.length === 0 ? "PASS" : "BLOCK",
      label: "Artefactos de migración",
      detail:
        missingMigrations.length === 0
          ? "Están presentes las migraciones requeridas para el piloto."
          : `Faltan: ${missingMigrations.join(", ")}.`,
    },
    {
      key: "RATEWARE_SCOPE",
      status:
        input.requireRateware && !isHttpsUrl(input.environment.RATEWARE_API_URL)
          ? "BLOCK"
          : isHttpsUrl(input.environment.RATEWARE_API_URL)
            ? "PASS"
            : "WARN",
      label: "Alcance Rateware",
      detail: isHttpsUrl(input.environment.RATEWARE_API_URL)
        ? "Rateware tiene un endpoint HTTPS configurado; falta confirmar recepción en QA."
        : input.requireRateware
          ? "El release exige Rateware, pero RATEWARE_API_URL no está configurada."
          : "Rateware queda fuera de este piloto; la entrega externa no fue validada.",
    },
  ];
  return {
    checks,
    ready: checks.every((check) => check.status !== "BLOCK"),
    blockers: checks.filter((check) => check.status === "BLOCK").length,
    warnings: checks.filter((check) => check.status === "WARN").length,
  };
}
