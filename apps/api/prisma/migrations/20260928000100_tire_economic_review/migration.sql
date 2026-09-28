-- Explicit economic-only review; existing dossiers retain dual review.
ALTER TABLE "TireCalibrationDossier" ADD COLUMN "reviewMode" TEXT NOT NULL DEFAULT 'DUAL_REVIEW';
ALTER TABLE "TireCalibrationDossier" DROP CONSTRAINT "TireCalibrationDossier_status_check";
ALTER TABLE "TireCalibrationDossier" ADD CONSTRAINT "TireCalibrationDossier_status_check"
  CHECK ("status" IN ('DRAFT', 'PENDING_ECONOMIC', 'PENDING_INDEPENDENT', 'RETURNED', 'REJECTED', 'REVIEWED', 'ECONOMIC_REVIEWED'));
ALTER TABLE "TireCalibrationDossier" ADD CONSTRAINT "TireCalibrationDossier_review_mode_check"
  CHECK ("reviewMode" IN ('DUAL_REVIEW', 'ECONOMIC_ONLY')
    AND ("reviewMode" <> 'ECONOMIC_ONLY' OR ("independentReviewerId" IS NULL AND "status" NOT IN ('PENDING_INDEPENDENT', 'REVIEWED', 'REJECTED')))
    AND ("status" <> 'ECONOMIC_REVIEWED' OR ("reviewMode" = 'ECONOMIC_ONLY' AND "economicOwnerId" IS NOT NULL)));
ALTER TABLE "TireCalibrationReviewEvent" DROP CONSTRAINT "TireCalibrationReviewEvent_fromStatus_check";
ALTER TABLE "TireCalibrationReviewEvent" ADD CONSTRAINT "TireCalibrationReviewEvent_fromStatus_check"
  CHECK ("fromStatus" IS NULL OR "fromStatus" IN ('DRAFT', 'PENDING_ECONOMIC', 'PENDING_INDEPENDENT', 'RETURNED', 'REJECTED', 'REVIEWED', 'ECONOMIC_REVIEWED'));
ALTER TABLE "TireCalibrationReviewEvent" DROP CONSTRAINT "TireCalibrationReviewEvent_toStatus_check";
ALTER TABLE "TireCalibrationReviewEvent" ADD CONSTRAINT "TireCalibrationReviewEvent_toStatus_check"
  CHECK ("toStatus" IS NULL OR "toStatus" IN ('DRAFT', 'PENDING_ECONOMIC', 'PENDING_INDEPENDENT', 'RETURNED', 'REJECTED', 'REVIEWED', 'ECONOMIC_REVIEWED'));
-- RLS, immutable evidence and the package policy requiring REVIEWED stay intact.
