CREATE TYPE "ApprovalAction" AS ENUM ('RATEBOOK_PUBLISH', 'RATEWARE_DELIVERY');
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TABLE "ApprovalRequest" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "rateBookId" TEXT NOT NULL,
  "action" "ApprovalAction" NOT NULL,
  "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "requestNote" TEXT NOT NULL,
  "decisionNote" TEXT,
  "requestedById" TEXT NOT NULL,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApprovalRequest_orgId_status_createdAt_idx" ON "ApprovalRequest"("orgId", "status", "createdAt");
CREATE INDEX "ApprovalRequest_rateBookId_action_status_idx" ON "ApprovalRequest"("rateBookId", "action", "status");
CREATE INDEX "ApprovalRequest_requestedById_status_createdAt_idx" ON "ApprovalRequest"("requestedById", "status", "createdAt");
CREATE INDEX "ApprovalRequest_reviewedById_idx" ON "ApprovalRequest"("reviewedById");

ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_rateBookId_fkey" FOREIGN KEY ("rateBookId") REFERENCES "RateBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
