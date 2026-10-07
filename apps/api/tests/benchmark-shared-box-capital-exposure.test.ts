import { describe, expect, it } from 'vitest'
import { projectSharedTrailerReference } from '../scripts/lib/reference-budget-exposure.js'

const input = {
  resourceId:'SHARED_TRAILER',physicalBoxCount:1,physicalScope:'OWN_MX_US_RELAY_SAME_TRAILER',currency:'MXN',
  capacityBasis:'EXPLICIT_HISTORICAL_TRACTOR_TO_ONE_BOX_CAPACITY_SENSITIVITY_NOT_OBSERVED',capacitySourceId:'IMT_PT260_CASE',
  monthlyKm:10000,monthlyAssetDays:25,scope:'FORWARD_MOVEMENT_ONLY_NOT_RESOURCE_CYCLE',
  mxDistanceKm:1124.5764209526735,mxMovementElapsedHours:25.83138320820626,
  usDistanceKm:null,usMovementElapsedHours:null,borderDetachedHours:null,
}
const tax = {currency:'MXN',newerQuotedNet:630000,olderQuotedAmount:540000,olderQuoteBasis:'NET_PLUS_VAT',
  vatRate:.16,nonrecoverablePurchaseVatFraction:0,analogyMonths:24,saleVatTreatment:'NET_OF_OUTPUT_VAT_FOR_TAXABLE_ENTERPRISE_SALE'}
describe('one shared53 box capital-price sensitivity linked to movement exposure',()=>{
  it('projects MX distance/time without claiming complete capital or CFU',()=>{
    const r=projectSharedTrailerReference(input,tax)
    expect(r.monthlyAskingTaxContrastMxn).toBe(3750)
    expect(r.mxPrefix.byDistanceMxn).toBeCloseTo(421.7161578572526,9)
    expect(r.mxPrefix.byTimeMxn).toBeCloseTo(161.4461450512891,9)
    expect(r.mxPrefix.conditionalReferenceMxn).toBe(r.mxPrefix.byDistanceMxn)
    expect(r).toMatchObject({serialMovement:null,completeForwardMovementReferenceMxn:null,
      completeBoxCfuMxn:null,completeMonthlyCapitalMxn:null,productiveBoxCapacityObserved:false,
      mxPrefixIsMinimumCfu:false,phaseAllocationsAdditive:false,unknownCapitalAdjustmentsSetToZero:false,
      eligibleForBudget:false,quoteReady:false,adoptedValues:0})
  })
  it('retains four independent tax scenarios, not a confidence range',()=>{
    const results=['NET_PLUS_VAT','GROSS_INCLUDES_VAT'].flatMap(olderQuoteBasis=>[0,1].map(nonrecoverablePurchaseVatFraction=>
      projectSharedTrailerReference(input,{...tax,olderQuoteBasis,nonrecoverablePurchaseVatFraction})))
    for(const [i,expected] of [3750,7950,6853.448275862064,11053.448275862064].entries()) {
      expect(results[i].monthlyAskingTaxContrastMxn).toBeCloseTo(expected,8)
    }
    expect(results.every(r=>!r.selected&&!r.monthlyReferenceIsCompleteCapital)).toBe(true)
  })
  it('composes serial phases before one MAX, never adds two full box allocations',()=>{
    // Synthetic only: chosen to exercise different dominant phase dimensions.
    const r=projectSharedTrailerReference({...input,mxDistanceKm:900,mxMovementElapsedHours:24,
      usDistanceKm:100,usMovementElapsedHours:240,borderDetachedHours:0},tax)
    expect(r.serialMovement!.distanceKm).toBe(1000)
    expect(r.serialMovement!.elapsedMovementDays).toBe(11)
    expect(r.completeForwardMovementReferenceMxn).toBe(1650)
    const wrongSum=r.mxPrefix.conditionalReferenceMxn+Math.max(3750*100/10000,3750*10/25)
    expect(wrongSum).toBe(1837.5)
    expect(r.completeForwardMovementReferenceMxn).not.toBe(wrongSum)
    expect(r.completeBoxCfuMxn).toBeNull()
  })
  it.each(['usDistanceKm','usMovementElapsedHours','borderDetachedHours'])('does not replace missing %s with zero',key=>{
    const r=projectSharedTrailerReference({...input,usDistanceKm:100,usMovementElapsedHours:5,borderDetachedHours:2,[key]:null},tax)
    expect(r.completeForwardMovementReferenceMxn).toBeNull()
    expect(r.usOrBorderMissingSetToZero).toBe(false)
  })
  it('adds detached border time to one box, not tractor return or two boxes',()=>{
    const r=projectSharedTrailerReference({...input,usDistanceKm:100,usMovementElapsedHours:12,borderDetachedHours:48},tax)
    expect(r.serialMovement!.elapsedMovementDays).toBeCloseTo((25.83138320820626+12+48)/24,12)
    expect(r).toMatchObject({duplicateBoxChargeAdded:false,tractorReturnsInherited:false,includesEmptyReturn:false})
  })
  it.each([
    {physicalBoxCount:2},{resourceId:'MX_TRACTOR'},{capacityBasis:'OBSERVED'},
    {monthlyKm:0},{monthlyAssetDays:0},{monthlyAssetDays:32},{mxDistanceKm:-1},
    {mxMovementElapsedHours:Number.NaN},{usDistanceKm:-1},{borderDetachedHours:-1},
    {scope:'COMPLETE_CYCLE'},{currency:'USD'},
  ])('rejects unsupported scope or invalid exposure %j',patch=>{
    expect(()=>projectSharedTrailerReference({...input,...patch},tax)).toThrow()
  })
  it('rejects negative published price gap rather than inventing a capital floor',()=>{
    expect(()=>projectSharedTrailerReference(input,{...tax,olderQuotedAmount:700000})).toThrow('BOX_NEGATIVE_PRICE_GAP_REFERENCE')
  })
})
