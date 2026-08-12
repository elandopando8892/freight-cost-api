ALTER TABLE "RateBook" ADD COLUMN "sourceRateBookId" TEXT;
ALTER TABLE "RateBook" ADD COLUMN "regenerationNote" TEXT;
CREATE INDEX "RateBook_sourceRateBookId_idx" ON "RateBook"("sourceRateBookId");
ALTER TABLE "RateBook" ADD CONSTRAINT "RateBook_sourceRateBookId_fkey" FOREIGN KEY ("sourceRateBookId") REFERENCES "RateBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
