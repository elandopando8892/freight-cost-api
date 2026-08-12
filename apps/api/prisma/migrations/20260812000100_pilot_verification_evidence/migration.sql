CREATE TYPE "PilotVerificationKind" AS ENUM ('STAGING_AUTH_BFF_SMOKE', 'STAGING_AUTH_BFF_HUMAN');

CREATE TYPE "PilotVerificationOutcome" AS ENUM ('PASS', 'FAIL');

CREATE TABLE "PilotVerification" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "kind" "PilotVerificationKind" NOT NULL,
  "outcome" "PilotVerificationOutcome" NOT NULL,
  "releaseId" TEXT NOT NULL,
  "executedAt" TIMESTAMP(3) NOT NULL,
  "summary" TEXT NOT NULL,
  "checks" JSONB NOT NULL,
  "verifiedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PilotVerification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PilotVerification_orgId_createdAt_idx" ON "PilotVerification"("orgId", "createdAt");
CREATE INDEX "PilotVerification_orgId_releaseId_idx" ON "PilotVerification"("orgId", "releaseId");
CREATE INDEX "PilotVerification_verifiedById_createdAt_idx" ON "PilotVerification"("verifiedById", "createdAt");

ALTER TABLE "PilotVerification" ADD CONSTRAINT "PilotVerification_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PilotVerification" ADD CONSTRAINT "PilotVerification_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
