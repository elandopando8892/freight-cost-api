CREATE TYPE "PilotDecisionOutcome" AS ENUM ('GO', 'NO_GO');

CREATE TABLE "PilotDecision" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "outcome" "PilotDecisionOutcome" NOT NULL,
  "rationale" TEXT NOT NULL,
  "evidence" JSONB NOT NULL,
  "evidencePolicy" TEXT NOT NULL,
  "evidenceReady" BOOLEAN NOT NULL,
  "evidenceBlockers" INTEGER NOT NULL,
  "evidenceWarnings" INTEGER NOT NULL,
  "evidenceAt" TIMESTAMP(3) NOT NULL,
  "decidedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PilotDecision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PilotDecision_orgId_createdAt_idx" ON "PilotDecision"("orgId", "createdAt");
CREATE INDEX "PilotDecision_decidedById_createdAt_idx" ON "PilotDecision"("decidedById", "createdAt");

ALTER TABLE "PilotDecision" ADD CONSTRAINT "PilotDecision_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PilotDecision" ADD CONSTRAINT "PilotDecision_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
