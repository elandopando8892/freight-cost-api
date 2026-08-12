-- Historical quotes predate explicit engine policy selection, so they remain
-- honestly tagged as LEGACY_UNSPECIFIED. New application writes always provide
-- OPERATIONAL_V3 or WORKBOOK_V3.
CREATE TYPE "CalculationPolicy" AS ENUM ('LEGACY_UNSPECIFIED', 'OPERATIONAL_V3', 'WORKBOOK_V3');

ALTER TABLE "Quote"
  ADD COLUMN "calculationPolicy" "CalculationPolicy" NOT NULL DEFAULT 'LEGACY_UNSPECIFIED';
