CREATE TABLE "PilotGoApproval" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "releaseId" TEXT NOT NULL,
  "roundId" TEXT NOT NULL,
  "gateFingerprint" TEXT NOT NULL,
  "rationale" TEXT NOT NULL,
  "evidence" JSONB NOT NULL,
  "evidenceAt" TIMESTAMP(3) NOT NULL,
  "approvedById" TEXT NOT NULL,
  "decisionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PilotGoApproval_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PilotGoApproval_orgId_roundId_approvedById_key"
  ON "PilotGoApproval"("orgId", "roundId", "approvedById");
CREATE INDEX "PilotGoApproval_orgId_releaseId_createdAt_idx"
  ON "PilotGoApproval"("orgId", "releaseId", "createdAt");
CREATE INDEX "PilotGoApproval_orgId_gateFingerprint_createdAt_idx"
  ON "PilotGoApproval"("orgId", "gateFingerprint", "createdAt");
CREATE INDEX "PilotGoApproval_orgId_roundId_createdAt_idx"
  ON "PilotGoApproval"("orgId", "roundId", "createdAt");
CREATE INDEX "PilotGoApproval_decisionId_idx"
  ON "PilotGoApproval"("decisionId");

ALTER TABLE "PilotGoApproval" ADD CONSTRAINT "PilotGoApproval_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PilotGoApproval" ADD CONSTRAINT "PilotGoApproval_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PilotGoApproval" ADD CONSTRAINT "PilotGoApproval_decisionId_fkey"
  FOREIGN KEY ("decisionId") REFERENCES "PilotDecision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
