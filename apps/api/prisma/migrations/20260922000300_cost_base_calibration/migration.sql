-- Evidence belongs to one assumption version. Historical versions remain unchanged.
ALTER TABLE "AssumptionSet" ADD COLUMN "calibrationEvidence" JSONB;

ALTER TYPE "AssumptionVersionAuditAction" ADD VALUE 'CALIBRATION_REVIEWED';
