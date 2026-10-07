import { describe, expect, it } from 'vitest'
import { calculateDriverComponentReferences } from '../scripts/lib/reference-variable-components.js'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'

const load=(name:string)=>JSON.parse(readLocalDocument(`docs/research/${name}.json`))
const model=load('B2_DRIVER_DISTANCE_COMPONENTS_2026-10-01')
const historic=load('B1_PILOT_ASSET_LABOR_EVIDENCE_2026-09-29')
const bridge=load('B2_LABOR_COMPENSATION_BRIDGE_2026-09-29')
const stage={country:'MX',distanceKm:1124.5764209526735,basis:'SAKBE_CANDIDATE_DISTANCE_NOT_TRUCK_APPROVED'}
const calculate=(p:unknown=model,h:unknown=historic,b:unknown=bridge,s:unknown=stage)=>calculateDriverComponentReferences(p,h,b,s)

describe('driver advertised pay and historical compensation tied to distance without employer-total claim',()=>{
  it('calculates MX one-forward-phase pay without weekly/header/voucher additions',()=>{
    const r=calculate().mxForwardPayReference
    expect(r.conditionalAdvertisedPayMxn).toBeCloseTo(2361.6104840006145,9)
    expect(r.paidForwardKm).toBe(stage.distanceKm)
    expect(r).toMatchObject({quotedRateMxnPerPaidKm:2.1,paidKmObserved:false,grossNet:null,
      weeklySalaryAddedAgain:false,monthlyVouchersAdded:false,monitorPayrollBurdenTransferred:false,
      employerContributionMxn:null,completeEmployerCostMxn:null,emptyReturnPayMxn:null,waitingPayMxn:null})
  })
  it('retains all five groups as alternatives instead of adding/selecting bounds or midpoint',()=>{
    const r=calculate()
    expect(r.usReportedCompensationAlternatives.map(g=>g.usdPerMile)).toEqual([.817,.872,.790,.843,1.058])
    expect(r.selectedUsFleetGroup).toBeNull()
    for(const g of r.usReportedCompensationAlternatives) {
      expect(g.exactInternationalMileUsdPerKm).toBeCloseTo(g.usdPerMile/1.609344,12)
      expect(g.legacyUsdPerKm).toBeCloseTo(g.usdPerMile/1.60934,12)
      expect(g).toMatchObject({selected:false,completeEmployerCostUsdPerKm:null,
        usCandidateStageKm:null,usCandidateStagePayUsd:null,incentivesBonusAdded:false,extraEcecOrFederalTaxesAdded:false})
    }
  })
  it('preserves the bonus/incentive boundary and missing US distance and fiscality',()=>{
    const r=calculate()
    expect(r).toMatchObject({sourceBoundary:'BASE_PAY_AND_STANDARD_BENEFITS_EXCLUDES_INCENTIVES_AND_BONUSES',
      imtSubtotalCombinedWithMxPay:false,fxConversionPerformed:false,crossCountryTotalUsd:null,pilotDriverCvuUsd:null,
      eligibleForPilot:false,calibrated:false,quoteReady:false,adoptedValues:0})
    expect(r.mxSource).toMatchObject({archive:null,absolutePublicationDateVerified:false,trailerLengthFeet:null,grossNet:null})
  })
  it('does not derive a productive fleet denominator from weekly earnings',()=>{
    const r=calculate(undefined,undefined,undefined,{...stage,distanceKm:1000})
    expect(r.mxForwardPayReference.conditionalAdvertisedPayMxn).toBe(2100)
    expect(r.noEmployerOrFleetDenominatorInvented).toBe(true)
  })
  it('carries the primary survey inclusion without inventing a split or universal benefit',()=>{
    const r=calculate(),c=r.travelExpenseCoverage
    expect(c.us).toEqual({status:'INCLUDED_UNSPLIT_IN_REPORTED_COMPENSATION',sourceId:'ATRI2025',
      sourcePeriod:2024,surveyPhysicalPage:61,separatePerDiemAmountUsd:null,additionalDailyAllowanceAdded:false,
      everyCarrierProvidesPerDiemConfirmed:false,fullTripTravelExpenseCoverageConfirmed:false})
    expect(r.usSource.travelExpenseReview.benefitsDefinition).toBe('INCLUDES_REPORTED_PER_DIEM_WHEN_PROVIDED_UNSPLIT')
    expect(r.usReportedCompensationAlternatives.map(g=>g.usdPerMile)).toEqual([.817,.872,.790,.843,1.058])
    expect(c.mx).toMatchObject({separateTravelExpenseAmountMxn:null,voucherFrequencyVerified:false,
      voucherAmountTreatedAsDailyAllowance:false})
    expect(c.waiting).toMatchObject({mxAdditionalPayMxn:null,usAdditionalPayUsd:null,assetWaitingCostProvesDriverPay:false})
    expect(c.fiscalAllowanceUsedAsExpenseBenchmark).toBe(false)
  })
  it.each(['perDiemRateSeparatelyIdentified','everyCarrierProvidesPerDiemConfirmed','waitingPaySeparatelyIdentified'])('rejects unproven travel/benefit claim %s',field=>{
    const p=structuredClone(model);p.usSource.travelExpenseReview[field]=true
    expect(()=>calculate(p)).toThrow()
  })
  it('rejects stripping the survey definition or replacing it with a daily additive rate',()=>{
    const p=structuredClone(model);delete p.usSource.travelExpenseReview
    expect(()=>calculate(p)).toThrow()
    const d=structuredClone(model);d.usSource.travelExpenseReview.perDiemUsdPerDay=80
    expect(()=>calculate(d)).toThrow()
  })
  it.each([0,-1,NaN,Infinity,1e7])('rejects bad candidate distance %s',distanceKm=>{
    expect(()=>calculate(undefined,undefined,undefined,{...stage,distanceKm})).toThrow()
  })
  it('rejects US/country extra claims or adoption flags',()=>{
    expect(()=>calculate(undefined,undefined,undefined,{...stage,country:'US'})).toThrow()
    const p=structuredClone(model);p.quoteReady=true
    expect(()=>calculate(p)).toThrow()
  })
  it.each(['statutoryChargesCompletelyIdentified','target53FootProfileConfirmed','newer2026FullReportVerified'])('rejects unsupported source claim %s',field=>{
    const p=structuredClone(model);p.usSource[field]=true
    expect(()=>calculate(p)).toThrow()
  })
  it('rejects joining a different source/hash/year or synthetic Sample Carrier metric',()=>{
    const p=structuredClone(model);p.usSource.archive.sha256='0'.repeat(64)
    expect(()=>calculate(p)).toThrow('DRIVER_SOURCE_OR_PERIOD_JOIN_MISMATCH')
    const h=structuredClone(historic);h.laborContrast.operationsYear=2025
    expect(()=>calculate(undefined,h)).toThrow('DRIVER_SOURCE_OR_PERIOD_JOIN_MISMATCH')
    const fake=structuredClone(historic);fake.laborContrast.metric='SAMPLE_CARRIER'
    expect(()=>calculate(undefined,fake)).toThrow()
  })
  it('rejects duplicate fleet groups and a material legacy conversion error',()=>{
    const h=structuredClone(historic);h.laborContrast.groups[1].fleetSize=h.laborContrast.groups[0].fleetSize
    expect(()=>calculate(undefined,h)).toThrow('DRIVER_GROUP_OR_PIN_DUPLICATE')
    const bad=structuredClone(historic);bad.laborContrast.groups[0].usdPerKm+=.01
    expect(()=>calculate(undefined,bad)).toThrow('DRIVER_HISTORICAL_CONVERSION_MISMATCH')
  })
  it('rejects mismatched primary-rate recheck rather than silently rewriting the dated source',()=>{
    const p=structuredClone(model);p.mxSource.rateMxnPerPaidLoadedKm=3
    expect(()=>calculate(p)).toThrow('DRIVER_MX_RATE_RECHECK_MISMATCH')
    const b=structuredClone(bridge);b.mxDriver.offer.rateCurrency='USD'
    expect(()=>calculate(undefined,undefined,b)).toThrow()
  })
  it('does not permit setting empty return complete, paid ratio arbitrary or adding monitor burdens',()=>{
    for(const update of [{includesEmptyReturn:true},{paidToPhysicalKmRatio:.5},{administrativeEmployerBurdenTransferred:true}]) {
      const p=structuredClone(model);Object.assign(p.mxDistanceHypothesis,update)
      expect(()=>calculate(p)).toThrow()
    }
  })
})
