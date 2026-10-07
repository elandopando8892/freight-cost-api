import {z} from 'zod'

const source=z.object({id:z.string().min(1),url:z.string().url(),locator:z.string().min(1),
  archive:z.object({file:z.string().startsWith('docs/research/sources/'),
    sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict().nullable()}).strict()
const schema=z.object({
  model:z.literal('FCM_SHARED_BOX_TX_RECURRING_REFERENCE_V1'),verifiedAt:z.string().datetime(),
  referenceYear:z.literal(2026),physicalBoxCount:z.literal(1),jurisdiction:z.literal('TX_WEBB'),
  scenario:z.literal('EXISTING_ELIGIBLE_TOKEN_COMMERCIAL_SEMITRAILER_ANNUAL_COUNTY_RENEWAL'),
  registrationTermMonths:z.literal(12),paymentBasis:z.literal('IN_PERSON_NON_ELECTRONIC_MODEL'),
  inspectionBasis:z.literal('ANNUAL_COMMERCIAL_DECAL_STATION_MAXIMUM'),currency:z.literal('USD'),
  fees:z.object({annualTokenBaseUsd:z.literal(15),annualCountyAggregateUsd:z.literal(20),
    annualRenewalProcessingUsd:z.literal(4.75),annualInspectionStationMaximumUsd:z.literal(40),
    annualInspectionStateUsd:z.literal(22)}).strict(),sources:z.array(source).length(5),
  nonAdditiveTreatments:z.array(z.string().min(1)).length(5),limitations:z.array(z.string().min(1)).min(1),
}).strict()

const mxSchema=z.object({
  model:z.literal('FCM_SHARED_BOX_MX_PERIODIC_REFERENCE_V1'),verifiedAt:z.string().datetime(),
  physicalBoxCount:z.literal(1),inspectionsPerYear:z.literal(1),monthsPerYear:z.literal(12),
  currency:z.literal('MXN'),publishedPriceGrossMxn:z.literal(700),
  priceStatus:z.literal('UNDATED_PROVIDER_PAGE_WITH_2020_CALENDAR_NOT_2026_QUOTE'),
  scope:z.literal('REMOLQUE_PROVIDER_LABEL_SEMITRAILER_EQUIVALENCE_UNCONFIRMED'),
  recognitionDirection:z.literal('MX_NOM68_TO_US_PERIODIC_ONLY'),sources:z.array(source).length(3),
  limitations:z.array(z.string().min(1)).min(1),
}).strict()

/** Historical arithmetic and regulatory direction, never a current price or vehicle certification. */
export function calculateSharedBoxMexicoInspectionReference(raw:unknown) {
  const input=mxSchema.parse(raw)
  const expected=['MX_NOM68_ANNUAL','FMCSA_NOM68_RECOGNITION','MX_PROVIDER_UNDATED_PRICE']
  if(expected.some(id=>input.sources.filter(s=>s.id===id).length!==1)) throw new Error('MX_BOX_INSPECTION_SOURCE_SET_MISMATCH')
  return {...input,economicExpenseId:'SHARED_TRAILER_PERMITS',resourceId:'SHARED_TRAILER',
    historicalAnnualGrossMxn:input.publishedPriceGrossMxn*input.inspectionsPerYear,
    historicalMonthlyEquivalentGrossMxn:input.publishedPriceGrossMxn/12,
    currentMonthlyInspectionMxn:null,completeBinationalMonthlyPermitsUsd:null,
    separateUsPeriodicInspectionAutomaticallyAdded:false,texasRenewalAutomaticallyAdded:false,
    reciprocalMexicoRecognitionEstablished:false,actualVehicleComplianceCertified:false,
    allocationFrequency:'ONCE_PER_SHARED_BOX_NOT_PER_COUNTRY',
    selectedForPilot:false,eligibleForBudget:false,calibrated:false,quoteReady:false,adoptedValues:0}
}

/** Frozen public-model fees for one renewal, not a generic current registration quote. */
export function calculateSharedBoxTexasComplianceReference(raw:unknown) {
  const input=schema.parse(raw)
  const expected=['TX_TOKEN_2026','TX_COUNTY_2026','TX_REGISTRATION_MANUAL_AUG2026',
    'TX_DPS_STATION_MAXIMUM','TX_DPS_COMMERCIAL_CLASSIFICATION']
  if(expected.some(id=>input.sources.filter(s=>s.id===id).length!==1)) throw new Error('BOX_COMPLIANCE_SOURCE_SET_MISMATCH')
  const annualRegistrationReferenceUsd=input.fees.annualTokenBaseUsd+input.fees.annualCountyAggregateUsd+
    input.fees.annualRenewalProcessingUsd
  const annualInspectionPlanningUsd=input.fees.annualInspectionStationMaximumUsd+input.fees.annualInspectionStateUsd
  const annualRecurringTexasReferenceUsd=annualRegistrationReferenceUsd+annualInspectionPlanningUsd
  const monthlyRecurringTexasReferenceUsd=annualRecurringTexasReferenceUsd/input.registrationTermMonths
  return {...input,economicExpenseId:'SHARED_TRAILER_PERMITS',resourceId:'SHARED_TRAILER',
    annualRegistrationReferenceUsd,annualInspectionPlanningUsd,annualRecurringTexasReferenceUsd,
    monthlyRecurringTexasReferenceUsd,monthlyDisplayUsd:Math.round(monthlyRecurringTexasReferenceUsd*100)/100,
    allocationFrequency:'ONCE_PER_SHARED_BOX_NOT_PER_COUNTRY',
    annualBasisReconstructedFromRoundedMonth:false,stationMaximumIsInvoice:false,
    selectedForPilot:false,completeBinationalMonthlyPermitsUsd:null,eligibleForBudget:false,
    calibrated:false,quoteReady:false,adoptedValues:0}
}
