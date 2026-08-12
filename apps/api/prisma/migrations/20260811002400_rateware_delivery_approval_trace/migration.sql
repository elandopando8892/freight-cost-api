ALTER TABLE "RatewareDelivery" ADD COLUMN "approvalRequestId" TEXT;

CREATE INDEX "RatewareDelivery_approvalRequestId_idx" ON "RatewareDelivery"("approvalRequestId");

ALTER TABLE "RatewareDelivery" ADD CONSTRAINT "RatewareDelivery_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
