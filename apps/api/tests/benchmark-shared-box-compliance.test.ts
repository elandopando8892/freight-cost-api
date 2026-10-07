import {describe,it,expect} from 'vitest'
import {readLocalDocument} from '../scripts/assemble-economic-reference-cards.js'
import {calculateSharedBoxTexasComplianceReference,calculateSharedBoxMexicoInspectionReference} from '../scripts/lib/reference-shared-box-compliance.js'

const document=JSON.parse(readLocalDocument('docs/research/B2_SHARED_BOX_TX_COMPLIANCE_2026-10-01.json'))
const mx=JSON.parse(readLocalDocument('docs/research/B2_SHARED_BOX_MX_INSPECTION_2026-10-02.json'))
describe('Mexican periodic inspection without current-price or reciprocal-recognition invention',()=>{
  it('keeps historical gross arithmetic separate from current cost and vehicle certification',()=>{
    const r=calculateSharedBoxMexicoInspectionReference(mx)
    expect(r.historicalAnnualGrossMxn).toBe(700)
    expect(r.historicalMonthlyEquivalentGrossMxn).toBeCloseTo(700/12,12)
    expect(r).toMatchObject({currentMonthlyInspectionMxn:null,eligibleForBudget:false,quoteReady:false,
      actualVehicleComplianceCertified:false,reciprocalMexicoRecognitionEstablished:false,
      separateUsPeriodicInspectionAutomaticallyAdded:false,texasRenewalAutomaticallyAdded:false})
  })
  it.each([0,2])('rejects %s inspections per year for this frozen annual model',inspectionsPerYear=>{
    expect(()=>calculateSharedBoxMexicoInspectionReference({...mx,inspectionsPerYear})).toThrow()
  })
  it('rejects currency conversion, current-price promotion and reverse recognition',()=>{
    expect(()=>calculateSharedBoxMexicoInspectionReference({...mx,currency:'USD'})).toThrow()
    expect(()=>calculateSharedBoxMexicoInspectionReference({...mx,priceStatus:'CURRENT_2026'})).toThrow()
    expect(()=>calculateSharedBoxMexicoInspectionReference({...mx,recognitionDirection:'US_TO_MX'})).toThrow()
    expect(()=>calculateSharedBoxMexicoInspectionReference({...mx,physicalBoxCount:2})).toThrow()
    expect(()=>calculateSharedBoxMexicoInspectionReference({...mx,texasInspectionExtra:62})).toThrow()
  })
  it('rejects duplicate source attribution',()=>{
    expect(()=>calculateSharedBoxMexicoInspectionReference({...mx,sources:[mx.sources[0],mx.sources[0],mx.sources[2]]})).toThrow('MX_BOX_INSPECTION_SOURCE_SET_MISMATCH')
  })
})
describe('one-box Texas renewal reference, not full binational permits',()=>{
  it('composes registration and full commercial inspection without duplicate fees',()=>{
    const r=calculateSharedBoxTexasComplianceReference(document)
    expect(r.annualRegistrationReferenceUsd).toBe(39.75)
    expect(r.annualInspectionPlanningUsd).toBe(62)
    expect(r.annualRecurringTexasReferenceUsd).toBe(101.75)
    expect(r.monthlyRecurringTexasReferenceUsd).toBeCloseTo(101.75/12,12)
    expect(r.monthlyDisplayUsd).toBe(8.48)
    expect(r.monthlyDisplayUsd*12).not.toBe(r.annualRecurringTexasReferenceUsd)
    expect(r).toMatchObject({physicalBoxCount:1,selectedForPilot:false,eligibleForBudget:false,
      completeBinationalMonthlyPermitsUsd:null,quoteReady:false,adoptedValues:0,stationMaximumIsInvoice:false})
  })
  it.each([0,2])('rejects box count %s',physicalBoxCount=>{
    expect(()=>calculateSharedBoxTexasComplianceReference({...document,physicalBoxCount})).toThrow()
  })
  it.each([2025,2027])('does not reuse 2026 county fees in %s',referenceYear=>{
    expect(()=>calculateSharedBoxTexasComplianceReference({...document,referenceYear})).toThrow()
  })
  it.each([1,24,60])('does not silently prorate different term %s',registrationTermMonths=>{
    expect(()=>calculateSharedBoxTexasComplianceReference({...document,registrationTermMonths})).toThrow()
  })
  it.each([10,7.5,50])('rejects state fee substitution %s',annualInspectionStateUsd=>{
    expect(()=>calculateSharedBoxTexasComplianceReference({...document,fees:{...document.fees,annualInspectionStateUsd}})).toThrow()
  })
  it('rejects unsupported jurisdiction, electronic fee omission and duplicate charge',()=>{
    expect(()=>calculateSharedBoxTexasComplianceReference({...document,jurisdiction:'MX'})).toThrow()
    expect(()=>calculateSharedBoxTexasComplianceReference({...document,paymentBasis:'TXFLEET_CARD'})).toThrow()
    expect(()=>calculateSharedBoxTexasComplianceReference({...document,fees:{...document.fees,extraStateUsd:10}})).toThrow()
  })
  it('rejects source missing or duplicated',()=>{
    expect(()=>calculateSharedBoxTexasComplianceReference({...document,sources:document.sources.slice(1)})).toThrow()
    expect(()=>calculateSharedBoxTexasComplianceReference({...document,sources:[document.sources[0],...document.sources.slice(0,4)]})).toThrow('BOX_COMPLIANCE_SOURCE_SET_MISMATCH')
  })
})
