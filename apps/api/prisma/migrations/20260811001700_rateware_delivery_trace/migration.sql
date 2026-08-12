CREATE TYPE "RatewareDeliveryStatus" AS ENUM ('DELIVERED', 'FAILED');

CREATE TABLE "RatewareDelivery" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "rateBookId" TEXT NOT NULL,
  "actorId" TEXT,
  "contractVersion" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "payloadChecksum" TEXT NOT NULL,
  "status" "RatewareDeliveryStatus" NOT NULL,
  "responseCode" INTEGER,
  "receiptId" TEXT,
  "error" TEXT,
  "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RatewareDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RatewareDelivery_orgId_idempotencyKey_key" ON "RatewareDelivery"("orgId", "idempotencyKey");
CREATE INDEX "RatewareDelivery_rateBookId_attemptedAt_idx" ON "RatewareDelivery"("rateBookId", "attemptedAt");
CREATE INDEX "RatewareDelivery_orgId_status_attemptedAt_idx" ON "RatewareDelivery"("orgId", "status", "attemptedAt");
CREATE INDEX "RatewareDelivery_actorId_idx" ON "RatewareDelivery"("actorId");

ALTER TABLE "RatewareDelivery" ADD CONSTRAINT "RatewareDelivery_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RatewareDelivery" ADD CONSTRAINT "RatewareDelivery_rateBookId_fkey" FOREIGN KEY ("rateBookId") REFERENCES "RateBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RatewareDelivery" ADD CONSTRAINT "RatewareDelivery_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
