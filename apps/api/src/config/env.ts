import { cleanEnv, str, num, makeValidator } from "envalid";
import { resolveDatabaseUrl } from "./database-url.js";

const nodeEnv = makeValidator((x) => {
  if (!["development", "production", "test"].includes(x))
    throw new Error("Invalid NODE_ENV");
  return x as "development" | "production" | "test";
});
const logLevel = makeValidator((x) => {
  if (!["trace", "debug", "info", "warn", "error", "fatal"].includes(x)) {
    throw new Error("Invalid LOG_LEVEL");
  }
  return x as "trace" | "debug" | "info" | "warn" | "error" | "fatal";
});
const positiveInteger = makeValidator((x) => {
  const value = Number(x);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error("Expected a positive integer");
  }
  return value;
});
const releaseIdentifier = makeValidator((x) => {
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(x)) {
    throw new Error("Invalid RELEASE_SHA");
  }
  return x;
});

export const env = cleanEnv(
  { ...process.env, DATABASE_URL: resolveDatabaseUrl(process.env) },
  {
  DATABASE_URL: str(),
  PORT: num({ default: 3000 }),
  NODE_ENV: nodeEnv({ default: "development" }),
  // Non-secret build identity shown in support headers and health checks. On
  // Vercel it can be populated from VERCEL_GIT_COMMIT_SHA at deployment time.
  RELEASE_SHA: releaseIdentifier({
    default: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
  }),
  LOG_LEVEL: logLevel({ default: "info" }),
  // Per-instance protection. A deployment WAF remains responsible for a
  // distributed limit across serverless instances.
  RATE_LIMIT_MAX: positiveInteger({ default: 240 }),
  RATE_LIMIT_WINDOW: str({ default: "1 minute" }),
  // Comma-separated HTTPS web origins. Production disables browser CORS when
  // this allowlist is empty rather than reflecting arbitrary Origin headers.
  CORS_ORIGINS: str({ default: "" }),
  // EIA API v2 key for historical diesel (optional; set in Vercel env, never commit)
  EIA_API_KEY: str({ default: "" }),
  // Shared secret Vercel Cron sends as `Authorization: Bearer <CRON_SECRET>`.
  // Empty → cron endpoints fail closed (401). Set in Vercel env, never commit.
  CRON_SECRET: str({ default: "" }),
  // Kinde identity — the API verifies access tokens against this issuer's JWKS
  // and (optionally) checks the audience. Empty issuer → auth fails closed.
  KINDE_ISSUER_URL: str({ default: "" }),
  KINDE_AUDIENCE: str({ default: "" }),
  // Rateware receives a human-authorized RateBook package using the same Kinde
  // bearer token. Empty means delivery is disabled and fails closed.
  RATEWARE_API_URL: str({ default: "" }),
  // Server-only credential for the supervised assistant. It is intentionally
  // never exposed through the web application or a public runtime variable.
  OPENAI_API_KEY: str({ default: "" }),
  // Non-secret attestation required by the pilot gate after rotating an AI key.
  OPENAI_KEY_ROTATED_AT: str({ default: "" }),
  // Keep the model explicit and replaceable per environment. The assistant has
  // no tools and is limited to advisory output regardless of the model selected.
  // Production readiness blocks until this is explicitly configured.
  OPENAI_MODEL: str({ default: "" }),
  },
);
