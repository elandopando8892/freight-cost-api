import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'
import { reconcileBinationalFixedBudget } from '../src/modules/engine/benchmark-binational-budget.js'

const dossier = JSON.parse(readLocalDocument('docs/research/B2_CAPITAL_INSURANCE_COMPONENTS_2026-10-01.json'))
type Pin = {file:string;sha256:string}
const archive = (id:string) => readLocalDocument(dossier.sources.find((s:{id:string}) => s.id === id).archive.file)

describe('capital and insurance references: numbers without invented complete costs', () => {
  it.each(dossier.pins as Pin[])('preserves earlier evidence $file', pin => {
    expect(createHash('sha256').update(readLocalDocument(pin.file)).digest('hex')).toBe(pin.sha256)
  })
  it.each(dossier.sources as {id:string;archive:Pin}[])('preserves original source $id', source => {
    expect(createHash('sha256').update(readLocalDocument(source.archive.file)).digest('hex')).toBe(source.archive.sha256)
  })
  it('has three physical references without selecting an owner or full capital cost', () => {
    expect(dossier.assetReferences.map((a:{resourceId:string}) => a.resourceId)).toEqual(['MX_TRACTOR','US_TRACTOR','SHARED_TRAILER'])
    dossier.assetReferences.forEach((a:{selectedForBudget:boolean;monthlyCapitalUsd:null;capitalizableAcquisition:null;horizonMonths:null;netResidual:null;monthlyInterest:null}) => {
      expect(a).toMatchObject({selectedForBudget:false,monthlyCapitalUsd:null,capitalizableAcquisition:null,horizonMonths:null,netResidual:null,monthlyInterest:null})
    })
    expect(archive('RODAL_MX_2021')).toContain('1,198,275.86MXN + IVA')
    expect(archive('UTILITY_MX_2021')).toContain('630,000')
    expect(dossier.assetReferences[2].asking).toEqual({value:630000,currency:'MXN',tax:'PLUS_IVA'})
  })
  it('uses a different explicit-USD sleeper observation, not silent repricing of Schneider 20753', () => {
    const asset=dossier.assetReferences[1], source=archive('RYDER_US_SLEEPER_526505')
    expect(source).toContain('"currency":"USD","price":"$40,495"')
    expect(source).toContain('3AKJHHDR6MSNB0628')
    expect(source).toContain('72')
    expect(asset.asking).toEqual({value:40495,currency:'USD',tax:'TAXES_AND_FEES_EXCLUDED'})
    expect(asset.laterPublishedMaintenanceOdometer.value - asset.odometer.value).toBe(9038)
    expect(asset.currentActualOdometer).toBeNull()
    expect(dossier.capitalMethod).toMatchObject({principalRepaymentIncluded:false,transferNewAssetLifeToUsed:false,fxConversionPerformed:false,cashOwnedOrFinancedSelected:null})
  })
  it.each(dossier.usConditionalValueLoss.scenarios as {id:string;useMultiplier:number;annualMiles:number;additionalMiles:number;retention:number;grossValueReferenceUsd:number;askingValueLossMonthlyUsd:number}[])
  ('recomputes conditional USD value loss for $id without claiming net depreciation', scenario => {
    const method=dossier.usConditionalValueLoss
    expect(scenario.annualMiles).toBeCloseTo(method.historicalAnnualMiles*scenario.useMultiplier,8)
    expect(scenario.additionalMiles).toBeCloseTo(scenario.annualMiles*method.windowMonths/12,8)
    const q=method.ageRetentionPerYear**(method.windowMonths/12)*method.retentionPerThousandAdditionalMiles**(scenario.additionalMiles/1000)
    expect(scenario.retention).toBeCloseTo(q,12)
    const p=dossier.assetReferences[1].asking.value
    expect(scenario.grossValueReferenceUsd).toBeCloseTo(p*q,8)
    expect(scenario.askingValueLossMonthlyUsd).toBeCloseTo(p*(1-q)/method.windowMonths,8)
    expect(method).toMatchObject({netResidualUsd:null,monthlyCompleteCapitalUsd:null,selectedScenarioId:null})
  })
  it('reuses relative retention only, without applying current odometer a second time', () => {
    const old=JSON.parse(readLocalDocument(dossier.pins[2].file))
    old.usTractor.residualScenarios.forEach((s:{grossRetentionFraction:number},i:number) => {
      expect(dossier.usConditionalValueLoss.scenarios[i].retention).toBe(s.grossRetentionFraction)
    })
    const curves=dossier.usConditionalValueLoss.scenarios
    expect(curves[0].askingValueLossMonthlyUsd).toBeLessThan(curves[1].askingValueLossMonthlyUsd)
    expect(curves[1].askingValueLossMonthlyUsd).toBeLessThan(curves[2].askingValueLossMonthlyUsd)
    expect(dossier.usConditionalValueLoss.completeCapitalFormula).toContain('capitalizableAcquisitionUsd - 40495 + disposalCostUsd')
  })
  it.each(dossier.mxInsurance.packages as {id:string;annualGrossMxn:number;monthlyGrossEquivalentMxn:number}[])
  ('normalizes package $id gross annual price once, with no discount or fee added twice', p => {
    expect(p.monthlyGrossEquivalentMxn).toBeCloseTo(p.annualGrossMxn/12,8)
    expect(archive('TIMI_MX_PUBLISHED_EXAMPLES')).toContain(p.annualGrossMxn.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}))
    expect(dossier.mxInsurance.pricesInclude).toEqual({vat:true,policyFee:true,publishedDiscountAlreadyApplied:true})
    expect(dossier.mxInsurance.packagesAreAlternatives).toBe(true)
    expect(dossier.mxInsurance).toMatchObject({recoverableVatMxn:null,monthlyEconomicInsuranceUsd:null,selectedPackage:null})
  })
  it('keeps two different insured-value tables and all-in prices separate', () => {
    const m=dossier.mxInsurance
    expect(m.coverageTableReference.insuredValueMxn).toBe(2018000)
    expect(m.distinctBrandTableReference.commercialValueMxn).toBe(1835000)
    expect(m.packages[2].annualGrossMxn).toBe(130784.01)
    expect(m.distinctBrandTableReference.annualAmpliaGrossMxn).toBe(121693.05)
    expect(m.distinctBrandTableReference.monthlyGrossEquivalentMxn).toBeCloseTo(121693.05/12,8)
    expect(m.numericDeductibles).toEqual({liability:'50 UMA',theftPercent:20,materialDamagePercent:7})
    expect(m.confirmedCargoPremium).toBeNull(); expect(m.confirmedTrailerPremium).toBeNull()
    expect(dossier.sources.find((s:{id:string}) => s.id==='TIMI_MX_PUBLISHED_EXAMPLES').kind).toBe('BROKER_PUBLISHED_EXAMPLES_NOT_INSURER_VERIFIED_QUOTE')
  })
  it('does not add liability twice or infer cargo/trailer from a US national average', () => {
    expect(dossier.usInsurance).toMatchObject({transportMonthlyPerPowerUnit:926,annualArithmeticEquivalentUsd:11112,
      knownIncluded:['LIABILITY','PHYSICAL_DAMAGE'],cargoEstablishedByAverage:false,trailerEstablishedByAverage:false,completeMonthlyInsuranceUsd:null})
    expect(dossier.usInsurance.transportMonthlyPerPowerUnit*12).toBe(dossier.usInsurance.annualArithmeticEquivalentUsd)
    expect(archive('PROGRESSIVE_US_2025')).toContain('2025 new')
    expect(archive('PROGRESSIVE_INTERCHANGE')).toContain('non-owned trailers')
    expect(dossier.sharedTrailerInsurance).toMatchObject({premium:null,ownerLegalEntity:null,custodianLegalEntity:null,
      territorialContinuity:null,writtenInterchangeAgreementVerified:false,chargeFullPremiumPerLeg:false})
  })
  it('leaves the real budget incomplete rather than replacing six rows with partial references', () => {
    expect(dossier.outcome).toMatchObject({capitalReferencesWithExplicitCurrency:3,mxPackageAnnualObservations:3,
      completeBudgetRowsFilled:0,budgetUsd:null,cfuUsd:null,cvuUsd:null,calibrated:false,quoteReady:false,adoptedValues:0,businessGatesClosed:0})
    const worksheet=JSON.parse(readLocalDocument(dossier.pins[1].file))
    expect(worksheet.budget.expenses.every((e:{amount:unknown}) => e.amount===null)).toBe(true)
    const result=reconcileBinationalFixedBudget(worksheet.budget)
    expect(result.issues).toHaveLength(15)
    expect(result.monthlyFixedUsdByResource).toBeNull()
  })
})
