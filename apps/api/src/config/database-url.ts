type DatabaseEnvironment = {
  DATABASE_URL?: string;
  STAGING_DATABASE_URL?: string;
  FCM_STAGING_MIGRATION_CONFIRMATION?: string;
  VERCEL_ENV?: string;
  VERCEL_GIT_COMMIT_REF?: string;
  VERCEL_GIT_COMMIT_SHA?: string;
};

function present(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

/**
 * Vercel Marketplace cannot replace a DATABASE_URL record that is already
 * shared by Production and Preview. Staging therefore uses a prefixed Neon
 * variable and Preview must fail closed when that isolated value is absent.
 */
export function resolveDatabaseUrl(environment: DatabaseEnvironment) {
  if (environment.VERCEL_ENV === "preview") {
    const stagingUrl = present(environment.STAGING_DATABASE_URL);
    if (!stagingUrl) {
      throw new Error(
        "STAGING_DATABASE_URL is required when VERCEL_ENV=preview.",
      );
    }
    return stagingUrl;
  }

  const primaryUrl = present(environment.DATABASE_URL);
  if (!primaryUrl) {
    throw new Error("DATABASE_URL is required outside Vercel Preview.");
  }
  return primaryUrl;
}

function databaseIdentity(value: URL) {
  return `${value.hostname.toLowerCase().replace("-pooler.", ".")}${value.pathname}`;
}

function parseNeonStagingUrl(stagingValue: string) {
  let staging: URL;
  try {
    staging = new URL(stagingValue);
  } catch {
    throw new Error("Staging database URL is invalid.");
  }
  if (!["postgres:", "postgresql:"].includes(staging.protocol)) {
    throw new Error("Staging database must use PostgreSQL.");
  }
  if (!staging.hostname.toLowerCase().endsWith(".neon.tech")) {
    throw new Error("Staging database must be a Neon endpoint.");
  }
  return staging;
}

export function assertIsolatedNeonStagingTarget(input: {
  expectedNeonProjectId?: string;
  productionDatabaseUrl?: string;
  stagingDatabaseUrl?: string;
  stagingNeonProjectId?: string;
}) {
  const stagingValue = present(input.stagingDatabaseUrl);
  const productionValue = present(input.productionDatabaseUrl);
  const expectedProjectId = present(input.expectedNeonProjectId);
  const stagingProjectId = present(input.stagingNeonProjectId);
  if (!stagingValue) {
    throw new Error("Staging URL is required.");
  }
  if (Boolean(expectedProjectId) !== Boolean(stagingProjectId)) {
    throw new Error("Both Neon project identities are required together.");
  }
  if (
    expectedProjectId &&
    stagingProjectId &&
    stagingProjectId !== expectedProjectId
  ) {
    throw new Error("Staging Neon project identity does not match.");
  }

  const staging = parseNeonStagingUrl(stagingValue);
  if (productionValue && productionValue !== "[SENSITIVE]") {
    let production: URL;
    try {
      production = new URL(productionValue);
    } catch {
      throw new Error("Production database URL is invalid.");
    }
    if (databaseIdentity(staging) === databaseIdentity(production)) {
      throw new Error("Staging database must not resolve to the Production target.");
    }
  } else if (!expectedProjectId) {
    throw new Error(
      "Production URL or verified Neon project identity is required.",
    );
  }
  return stagingValue;
}

export function resolveVercelStagingMigrationTarget(
  environment: DatabaseEnvironment,
) {
  if (
    environment.VERCEL_ENV !== "preview" ||
    environment.VERCEL_GIT_COMMIT_REF !== "staging"
  ) {
    return null;
  }
  const releaseSha = present(environment.VERCEL_GIT_COMMIT_SHA);
  const stagingValue = present(environment.STAGING_DATABASE_URL);
  const expectedConfirmation = releaseSha
    ? `APPLY_STAGING_MIGRATIONS:${releaseSha}`
    : null;
  if (
    !expectedConfirmation ||
    environment.FCM_STAGING_MIGRATION_CONFIRMATION !== expectedConfirmation
  ) {
    throw new Error(
      "Staging migration confirmation does not match the release.",
    );
  }
  if (!stagingValue) throw new Error("Staging URL is required.");
  parseNeonStagingUrl(stagingValue);
  return stagingValue;
}
