CREATE TYPE "ScenarioReviewStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TABLE "ScenarioReview" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "sourceChecksum" TEXT NOT NULL,
  "changes" JSONB NOT NULL,
  "evidence" JSONB NOT NULL,
  "note" TEXT,
  "status" "ScenarioReviewStatus" NOT NULL DEFAULT 'DRAFT',
  "createdById" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "decisionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScenarioReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScenarioReview_orgId_status_createdAt_idx" ON "ScenarioReview"("orgId", "status", "createdAt");
CREATE INDEX "ScenarioReview_quoteId_createdAt_idx" ON "ScenarioReview"("quoteId", "createdAt");
CREATE INDEX "ScenarioReview_createdById_status_createdAt_idx" ON "ScenarioReview"("createdById", "status", "createdAt");
CREATE INDEX "ScenarioReview_reviewedById_idx" ON "ScenarioReview"("reviewedById");

ALTER TABLE "ScenarioReview" ADD CONSTRAINT "ScenarioReview_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScenarioReview" ADD CONSTRAINT "ScenarioReview_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScenarioReview" ADD CONSTRAINT "ScenarioReview_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScenarioReview" ADD CONSTRAINT "ScenarioReview_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
