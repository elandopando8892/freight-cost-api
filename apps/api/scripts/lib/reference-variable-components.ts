import { z } from 'zod'
import { FuelResearchSchema, reviewFuelReference, KM_PER_INTERNATIONAL_MILE } from '../review-fuel-reference.js'
import { MaintenanceResearchSchema, reviewMaintenanceTires } from '../review-maintenance-tires-reference.js'

const positive = z.number().finite().positive().max(1e9)
const text = z.string().min(1)
const modelSchema = z.object({
  artifact: z.literal('FCM_B2_VARIABLE_COMPONENTS_REFERENCE'), reviewedAt: text,
  status: z.literal('COHERENT_MODEL_COMPONENTS_NOT_COMPLETE_PILOT_CVU'),
  source: z.object({id:text,url:z.string().url(),archive:z.object({file:text,sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),
    locator:text,costPeriod:z.literal('2025'),kind:z.literal('OFFICIAL_TECHNICAL_BASE_MODEL_NOT_CARRIER_OBSERVATION')}).strict(),
  reusedPins:z.array(z.object({id:text,file:text,sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict()).length(3),
  model:z.object({country:z.literal('MX'),configuration:z.literal('T3-S2'),tractor:text,
    trailerLengthFeet:z.literal(40),trailer:text,tires:text,assetScope:z.literal('TRACTOR_AND_TRAILER_COMPOSITE_UNSPLIT'),
    baseRoad:z.object({curvature:z.literal(0),grade:z.literal(0),iriMetersPerKm:z.literal(2),serviceIndex:z.literal(4.3)}).strict(),
    taxBasis:z.literal('NATIONAL_ECONOMIC_MODEL_EXCLUDES_TAXES_AND_DUTIES'),
    loadedEmptySplitEstablished:z.literal(false),targetProfileMatched:z.literal(false)}).strict(),
  fuel:z.object({litersPer1000VehicleKm:positive,unitPriceMxnPerLiter:positive,publishedCostMxnPer1000VehicleKm:positive,
    precisionRule:z.literal('PRESERVE_PRINTED_COST_NOT_ROUNDED_INPUT_PRODUCT')}).strict(),
  maintenanceGroupId:text,maintenanceRecordIds:z.array(text).length(4),excludedFamilies:z.array(text).min(1),
  applicability:z.object({targetTrailerLengthFeet:z.literal(53),constantBaseRateOverCandidateDistanceIsExplicitSensitivity:z.literal(true),
    noWholeModelTotalAddedToFixedBudget:z.literal(true),noSeparateTrailerRateAddedAgain:z.literal(true),
    noArbitraryAssetSplit:z.literal(true),retail2026PricesNotSummedIntoNet2025Model:z.literal(true),
    noStatisticalRangeOrCarrierCostClaim:z.literal(true)}).strict(),
  remaining:z.array(text).min(1),adoptedValues:z.literal(0),quoteReady:z.literal(false),
}).strict()
const stageSchema = z.object({country:z.literal('MX'),distanceKm:z.number().finite().positive().max(1e6),
  basis:z.literal('SAKBE_CANDIDATE_DISTANCE_NOT_TRUCK_APPROVED')}).strict()

/** Joint monetary components from one public base model, projected over one
 * candidate stage only. Not an active pricing path or adoption shortcut.
 * Never sum unrelated ORNL/TTI/IMT cohorts, invent a FX or split a composite box. */
export function calculateVariableComponentReferences(rawModel:unknown, rawFuel:unknown, rawMaintenance:unknown, rawStage:unknown) {
  const model = modelSchema.parse(rawModel)
  const stage = stageSchema.parse(rawStage)
  const fuel = FuelResearchSchema.parse(rawFuel)
  const maintenance = MaintenanceResearchSchema.parse(rawMaintenance)
  const fuelReport = reviewFuelReference(fuel)
  const maintenanceReport = reviewMaintenanceTires(maintenance)
  if (new Set(model.maintenanceRecordIds).size !== 4 || new Set(model.reusedPins.map(p=>p.id)).size !== 3) {
    throw new Error('VARIABLE_COMPONENT_DUPLICATE_REFERENCE')
  }
  const source = maintenance.sources.find(s=>s.id === model.source.id)
  const group = maintenance.groups.find(g=>g.id === model.maintenanceGroupId)
  if (!source || source.country !== 'MX' || source.referencePeriod !== model.source.costPeriod ||
      source.file !== model.source.archive.file || source.sha256 !== model.source.archive.sha256 || source.url !== model.source.url ||
      !group || group.country !== 'MX' || group.sourceId !== source.id ||
      group.recordIds.length !== model.maintenanceRecordIds.length ||
      group.recordIds.some(id=>!model.maintenanceRecordIds.includes(id))) throw new Error('VARIABLE_COMPONENT_SOURCE_JOIN_MISMATCH')
  const mx = maintenanceReport.contrasts.find(g=>g.id === group.id)!
  if (mx.referencePeriod !== model.source.costPeriod || mx.separateLubricants === null || mx.currency !== 'MXN') {
    throw new Error('VARIABLE_COMPONENT_PERIOD_OR_UNIT_MISMATCH')
  }
  const excluded = ['DRIVER_COMPENSATION','DEPRECIATION','CAPITAL_INTEREST','INDIRECT_ADMIN_COMPANY','TOLLS','BORDER',
    'EMPTY_RETURN','IDLING_AUXILIARIES','UNRESOLVED_DEF_AND_OTHER_RESERVES']
  if (new Set(model.excludedFamilies).size !== excluded.length || model.excludedFamilies.length !== excluded.length ||
      excluded.some(id=>!model.excludedFamilies.includes(id))) throw new Error('VARIABLE_COMPONENT_EXCLUSION_MISMATCH')
  const fuelPerKm = model.fuel.publishedCostMxnPer1000VehicleKm / 1000
  // The source prints rounded quantities/unit prices: preserve its monetary
  // output rather than silently replacing it with a reconstructed product.
  const roundedInputFuelProduct = model.fuel.litersPer1000VehicleKm * model.fuel.unitPriceMxnPerLiter
  if (Math.abs(roundedInputFuelProduct-model.fuel.publishedCostMxnPer1000VehicleKm) > 1) {
    throw new Error('VARIABLE_COMPONENT_FUEL_PRINTED_PRECISION_MISMATCH')
  }
  const components = [
    {id:'FUEL',sourceRecordIds:['IMT_TABLE4_2_FUEL'],nativePerVehicleKm:fuelPerKm},
    {id:'MAINTENANCE_EXCLUDING_TIRES_AND_LUBE',sourceRecordIds:mx.normalized.filter(r=>r.kind.startsWith('MAINT')).map(r=>r.id),nativePerVehicleKm:mx.maintenancePublishedComponentsWithoutTires},
    {id:'LUBRICANTS',sourceRecordIds:mx.normalized.filter(r=>r.kind === 'LUBRICANTS').map(r=>r.id),nativePerVehicleKm:mx.separateLubricants},
    {id:'TIRES',sourceRecordIds:mx.normalized.filter(r=>r.kind === 'TIRES').map(r=>r.id),nativePerVehicleKm:mx.tires},
  ].map(c=>({...c,conditionalCandidateStageAmountMxn:c.nativePerVehicleKm*stage.distanceKm}))
  const subtotal = components.reduce((sum,c)=>sum+c.nativePerVehicleKm,0)
  return {
    status:model.status, sourceRef:'variableComponents', country:'MX', currency:'MXN', referencePeriod:model.source.costPeriod,
    source:model.source, model:model.model, applicability:model.applicability,
    selectedMxBaseModel:{
      selectedComponents:components, selectedSubtotalMxnPerVehicleKm:subtotal,
      candidateStage:stage, conditionalSelectedCandidateStageAmountMxn:subtotal*stage.distanceKm,
      impliedBaseModelKmPerLiter:1000/model.fuel.litersPer1000VehicleKm,
      conditionalBaseModelLiters:model.fuel.litersPer1000VehicleKm*stage.distanceKm/1000,
      publishedFuelMxnPer1000VehicleKm:model.fuel.publishedCostMxnPer1000VehicleKm,
      reconstructedRoundedFuelMxnPer1000VehicleKm:roundedInputFuelProduct,
      printedDifferenceMxnPer1000VehicleKm:roundedInputFuelProduct-model.fuel.publishedCostMxnPer1000VehicleKm,
      sourceCostPreserved:true, truckRouteAdjusted:false, target53FootProfileMatched:false,
      selectedSubtotalNotCompleteCvu:true, excludedFamilies:model.excludedFamilies,
      driverCostAdded:false, wholePublishedOperationTotalAdded:false, capitalOrAdminAdded:false,
      extraTrailerChargeAdded:false, resourceSplit:null, loadedEmptySplit:null, emptyReturnKm:null,
    },
    // Retain dimensions/limits of the earlier independently verified contrasts.
    // These are not combined into a cross-source/cross-country total.
    fuelContrasts:fuelReport.contrasts, maintenanceTireContrasts:maintenanceReport.contrasts,
    fuelCountryCards:fuelReport.countryCards, maintenanceCountryCards:maintenanceReport.countryCards,
    currentRetailPricesAppliedToNet2025Model:false, usFuelAndTtiSummed:false,
    crossCountryTotalUsd:null, pilotCvuUsdPerKm:null, pilotCvuUsd:null, pilotFuelTripUsd:null,
    remaining:model.remaining, eligibleForPilot:false, calibrated:false,quoteReady:false,adoptedValues:0,
  }
}

const driverSchema=z.object({
  artifact:z.literal('FCM_B2_DRIVER_DISTANCE_COMPONENTS'),reviewedAt:text,
  status:z.literal('PUBLIC_PAY_COMPONENTS_NOT_COMPLETE_EMPLOYER_COST'),
  reusedPins:z.array(z.object({id:text,file:text,sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict()).length(2),
  mxSource:z.object({id:text,url:z.string().url(),archive:z.null(),capture:z.literal('DIRECT_PRIMARY_WEB_READER_TEXT'),
    locator:text,relativePublicationLabel:text,absolutePublicationDateVerified:z.literal(false),availabilityEmployerConfirmed:z.literal(false),
    htmlDownloadStatus:z.literal('HTTP403_NO_ARCHIVE'),profile:z.literal('FIFTH_WHEEL_SINGLE_DRY_VAN_LONG_DISTANCE'),
    baseLocation:z.literal('Queretaro'),routes:z.array(text).min(1),trailerLengthFeet:z.null(),
    rateMxnPerPaidLoadedKm:positive,rateMxnPerPaidEmptyKm:positive,
    rateCurrencyBasis:z.literal('INFERRED_FROM_EXPLICIT_SAME_PAGE_MXN_SALARY'),grossNet:z.null(),completeEmployerCost:z.literal(false)}).strict(),
  mxDistanceHypothesis:z.object({basis:z.literal('FORWARD_CANDIDATE_PHYSICAL_KM_ASSUMED_PAID_ONCE_NOT_OBSERVED_PAYROLL'),
    paidToPhysicalKmRatio:z.literal(1),includesEmptyReturn:z.literal(false),weeklySalaryAddedAgain:z.literal(false),
    monthlyVouchersAdded:z.literal(false),administrativeEmployerBurdenTransferred:z.literal(false),impliedDriverFleetProductivityAllowed:z.literal(false)}).strict(),
  usSource:z.object({id:z.literal('ATRI2025'),url:z.string().url(),archive:z.object({file:text,sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),
    locator:text,operationsYear:z.literal(2024),publicationYear:z.literal(2025),metric:z.literal('REPORTED_COMPANY_DRIVER_WAGES_PLUS_BENEFITS'),
    compensationBoundary:z.literal('BASE_PAY_AND_STANDARD_BENEFITS_EXCLUDES_INCENTIVES_AND_BONUSES'),
    travelExpenseReview:z.object({reviewedAt:z.string().datetime(),locator:text,
      benefitsDefinition:z.literal('INCLUDES_REPORTED_PER_DIEM_WHEN_PROVIDED_UNSPLIT'),
      perDiemRateSeparatelyIdentified:z.literal(false),everyCarrierProvidesPerDiemConfirmed:z.literal(false),
      waitingPaySeparatelyIdentified:z.literal(false)}).strict(),
    statutoryChargesCompletelyIdentified:z.literal(false),target53FootProfileConfirmed:z.literal(false),newer2026FullReportVerified:z.literal(false)}).strict(),
  policy:z.object({groupsAreAlternativesNotAdditive:z.literal(true),noFleetGroupAutomaticallySelected:z.literal(true),
    sampleCarrierFiguresUsedAsBenchmark:z.literal(false),mxPayAndImtVariableSubtotalCombined:z.literal(false),
    usExtraEcecOrFederalTaxesAdded:z.literal(false),noFxOrUsDistanceInvented:z.literal(true),noCompleteEmployerCostOrCvuClaim:z.literal(true)}).strict(),
  remaining:z.array(text).min(1),adoptedValues:z.literal(0),quoteReady:z.literal(false),
}).strict()
const historicalLaborSchema=z.object({
  sources:z.array(z.object({id:text,url:z.string().url(),sha256:text}).passthrough()),
  laborContrast:z.object({sourceId:text,operationsYear:z.number(),sector:z.literal('TRUCKLOAD'),
    metric:z.literal('REPORTED_COMPANY_DRIVER_WAGES_PLUS_BENEFITS'),completeEmployerCostConfirmed:z.literal(false),
    groups:z.array(z.object({fleetSize:z.enum(['LT_26','26_TO_100','101_TO_250','251_TO_1000','GT_1000']),
      usdPerMile:positive,usdPerKm:positive}).strict()).length(5),
    transform:z.object({kmPerMile:positive}).passthrough()}).passthrough(),
}).passthrough()
const laborBridgeRateSchema=z.object({mxDriver:z.object({offer:z.object({ratePerPaidLoadedKm:positive,
  ratePerPaidEmptyKm:positive,rateCurrency:z.literal('MXN')}).passthrough()}).passthrough()}).passthrough()

// Inclusion is not a separately observed amount or proof of each employer's
// policy. Never turn the fiscal allowance into another additive trip-cost row.
export const DriverTravelExpenseCoverageSchema=z.object({
  us:z.object({status:z.literal('INCLUDED_UNSPLIT_IN_REPORTED_COMPENSATION'),sourceId:z.literal('ATRI2025'),
    sourcePeriod:z.literal(2024),surveyPhysicalPage:z.literal(61),separatePerDiemAmountUsd:z.null(),
    additionalDailyAllowanceAdded:z.literal(false),everyCarrierProvidesPerDiemConfirmed:z.literal(false),
    fullTripTravelExpenseCoverageConfirmed:z.literal(false)}).strict(),
  mx:z.object({status:z.literal('NOT_PRICED_BY_SELECTED_OFFER'),separateTravelExpenseAmountMxn:z.null(),
    voucherFrequencyVerified:z.literal(false),voucherAmountTreatedAsDailyAllowance:z.literal(false)}).strict(),
  waiting:z.object({status:z.literal('EXPOSURE_IS_NOT_A_SEPARATE_PAY_RATE'),mxAdditionalPayMxn:z.null(),
    usAdditionalPayUsd:z.null(),assetWaitingCostProvesDriverPay:z.literal(false)}).strict(),
  fiscalAllowanceUsedAsExpenseBenchmark:z.literal(false),missingAmountsDefaultedToZero:z.literal(false),
}).strict()

/** Observed offer / historical pay components, not payroll or adoption.
 * Paid=physical km is an explicit one-phase hypothesis, not a fleet denominator.
 * Preserve five US alternatives; no selected group, bonus or missing duty zero. */
export function calculateDriverComponentReferences(raw:unknown,rawHistorical:unknown,rawBridge:unknown,rawStage:unknown) {
  const p=driverSchema.parse(raw)
  const h=historicalLaborSchema.parse(rawHistorical)
  const bridge=laborBridgeRateSchema.parse(rawBridge)
  const stage=stageSchema.parse(rawStage)
  const source=h.sources.find(s=>s.id===p.usSource.id)
  if (!source || source.sha256!==p.usSource.archive.sha256 || source.url!==p.usSource.url ||
      h.laborContrast.sourceId!==source.id || h.laborContrast.operationsYear!==p.usSource.operationsYear) {
    throw new Error('DRIVER_SOURCE_OR_PERIOD_JOIN_MISMATCH')
  }
  if (new Set(h.laborContrast.groups.map(g=>g.fleetSize)).size!==5 || new Set(p.reusedPins.map(r=>r.id)).size!==2) {
    throw new Error('DRIVER_GROUP_OR_PIN_DUPLICATE')
  }
  if (p.mxSource.rateMxnPerPaidLoadedKm!==bridge.mxDriver.offer.ratePerPaidLoadedKm ||
      p.mxSource.rateMxnPerPaidEmptyKm!==bridge.mxDriver.offer.ratePerPaidEmptyKm) throw new Error('DRIVER_MX_RATE_RECHECK_MISMATCH')
  for(const g of h.laborContrast.groups) {
    if (Math.abs(g.usdPerKm-g.usdPerMile/h.laborContrast.transform.kmPerMile)>1e-9) throw new Error('DRIVER_HISTORICAL_CONVERSION_MISMATCH')
  }
  const paidForwardKm=stage.distanceKm*p.mxDistanceHypothesis.paidToPhysicalKmRatio
  return {
    sourceRef:'driverComponents',status:p.status,mxSource:p.mxSource,usSource:p.usSource,
    mxForwardPayReference:{currency:'MXN',candidateDistanceKm:stage.distanceKm,paidForwardKm,
      quotedRateMxnPerPaidKm:p.mxSource.rateMxnPerPaidLoadedKm,
      conditionalAdvertisedPayMxn:paidForwardKm*p.mxSource.rateMxnPerPaidLoadedKm,
      basis:p.mxDistanceHypothesis.basis,paidKmObserved:false,grossNet:null,employerContributionMxn:null,
      completeEmployerCostMxn:null,emptyReturnPayMxn:null,waitingPayMxn:null,
      weeklySalaryAddedAgain:false,monthlyVouchersAdded:false,monitorPayrollBurdenTransferred:false},
    usReportedCompensationAlternatives:h.laborContrast.groups.map(g=>({...g,
      legacyUsdPerKm:g.usdPerKm,exactInternationalMileUsdPerKm:g.usdPerMile/KM_PER_INTERNATIONAL_MILE,
      exactKmPerMile:KM_PER_INTERNATIONAL_MILE,legacyFactor:h.laborContrast.transform.kmPerMile,
      operationsYear:p.usSource.operationsYear,usCandidateStageKm:null,usCandidateStagePayUsd:null,
      selected:false,completeEmployerCostUsdPerKm:null,incentivesBonusAdded:false,extraEcecOrFederalTaxesAdded:false})),
    selectedUsFleetGroup:null,sourceBoundary:p.usSource.compensationBoundary,policy:p.policy,
    travelExpenseCoverage:DriverTravelExpenseCoverageSchema.parse({
      us:{status:'INCLUDED_UNSPLIT_IN_REPORTED_COMPENSATION',sourceId:'ATRI2025',sourcePeriod:2024,
        surveyPhysicalPage:61,separatePerDiemAmountUsd:null,additionalDailyAllowanceAdded:false,
        everyCarrierProvidesPerDiemConfirmed:false,fullTripTravelExpenseCoverageConfirmed:false},
      mx:{status:'NOT_PRICED_BY_SELECTED_OFFER',separateTravelExpenseAmountMxn:null,
        voucherFrequencyVerified:false,voucherAmountTreatedAsDailyAllowance:false},
      waiting:{status:'EXPOSURE_IS_NOT_A_SEPARATE_PAY_RATE',mxAdditionalPayMxn:null,usAdditionalPayUsd:null,
        assetWaitingCostProvesDriverPay:false},
      fiscalAllowanceUsedAsExpenseBenchmark:false,missingAmountsDefaultedToZero:false}),
    imtSubtotalCombinedWithMxPay:false,fxConversionPerformed:false,crossCountryTotalUsd:null,pilotDriverCvuUsd:null,
    noEmployerOrFleetDenominatorInvented:true,remaining:p.remaining,eligibleForPilot:false,calibrated:false,quoteReady:false,adoptedValues:0,
  }
}
