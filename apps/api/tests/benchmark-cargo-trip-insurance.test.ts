import {describe,it,expect} from 'vitest'
import {calculateCargoTripInsuranceReference as calculate,applyCargoTripInsuranceToPartialCost as apply,applyCargoTripInsuranceToPartialCosts as batch} from '../scripts/lib/reference-cargo-trip-insurance.js'
import {consolidateBinationalReferenceBudget as consolidate} from '../scripts/consolidate-binational-reference-budget.js'
import {readLocalDocument,readLocalDocumentBytes} from '../scripts/assemble-economic-reference-cards.js'

const doc=(file:string)=>JSON.parse(readLocalDocument(`docs/research/${file}`))
const policy=doc('B2_CARGO_TRIP_INSURANCE_2026-10-02.json'),fx=doc('B2_FX_REFERENCE_2026-10-02.json'),root=consolidate()
const selected=(declaredValueMxn=500000)=>({mode:'INCLUDE_IN_MODELED_TRANSPORT_COST',declaredValueMxn,
  cargoDescription:'Synthetic new general dry goods; not actual pilot cargo',taxTreatment:'GROSS_VAT_NOT_CREDITABLE_PLANNING'})
const costs=[...root.supportingBoxInsuranceCfu.cash,...root.supportingBoxInsuranceCfu.financed].flatMap(c=>c.alternatives.map(a=>({
  id:`${c.baseCostId}:${a.premiumAlternativeId}`,knownCfuComponentUsd:a.knownCfuComponentUsd,knownCvuComponentUsd:c.knownCvuComponentUsd,
  totalKnownComponentsUsd:a.totalKnownComponentsUsd,completeD2DCostUsd:null,quoteReady:false,
})))

describe('cargo-value insurance once per shipment, separate from carrier/box policies',()=>{
  it('reuses one immutable price reference across independent batch costs',()=>{
    const before=JSON.stringify({costs,policy,fx}),r=batch(costs,policy,fx,selected())
    expect(r.reference).toEqual(calculate(policy,fx,selected()))
    expect(r.costs).toEqual(costs.map(c=>apply(c,policy,fx,selected())))
    expect(r.costs.every(c=>c.cargoTripComponent===r.reference.pilotComponent)).toBe(true)
    expect(JSON.stringify({costs,policy,fx})).toBe(before)
  })
  it('rejects an empty, duplicate or already applied batch',()=>{
    expect(()=>batch([],policy,fx)).toThrow('EMPTY')
    expect(()=>batch([costs[0],costs[0]],policy,fx)).toThrow('ID_DUPLICATE')
    expect(()=>batch(batch(costs,policy,fx,selected()).costs,policy,fx,selected())).toThrow('ALREADY_APPLIED')
  })
  it('reproduces the connected source without choosing or inventing pilot cargo',()=>{
    const r=calculate(policy,fx)
    expect(r).toEqual(root.supportingCargoTripInsurance)
    expect(r.pilotComponent).toMatchObject({amountUsd:null,status:'SCOPE_AND_CARGO_PENDING',selectedPublishedPoint:null,coverageAcceptanceObserved:false})
    expect(Object.values(root.outputs).every(v=>v===null)).toBe(true)
  })
  it.each([[50000,250,50,300,48,348],[100000,450,50,500,80,580],[250000,1125,50,1175,188,1363],
    [450000,2025,150,2175,348,2523],[500000,2250,150,2400,384,2784],[750000,3375,200,3575,572,4147],
    [1000000,4500,250,4750,760,5510],[2000000,9000,500,9500,1520,11020]])(
    'reproduces value%j premium%j fee%j net%j VAT%j gross%j',(value,premium,fee,net,vat,gross)=>{
      const p=calculate(policy,fx).examples.find(p=>p.declaredValueMxn===value)!
      expect(p).toMatchObject({netPremiumMxn:premium,policyFeeMxn:fee,netTotalMxn:net,vatMxn:vat,grossMxn:gross,sourceExampleNotPilot:true})
      expect(p.netUsd).toBeCloseTo(net/18.3688,12);expect(p.grossUsd).toBeCloseTo(gross/18.3688,12)
    })
  it('separates explicit net and gross planning tax choices without claiming VAT credit',()=>{
    const gross=calculate(policy,fx,selected()),net=calculate(policy,fx,{...selected(),taxTreatment:'NET_VAT_CREDITABLE_PLANNING'})
    expect(gross.pilotComponent.amountUsd).toBeCloseTo(2784/18.3688,12)
    expect(net.pilotComponent.amountUsd).toBeCloseTo(2400/18.3688,12)
    expect(gross.pilotComponent.coverageAcceptanceObserved).toBe(false)
  })
  it('does not infer intermediate fee brackets or silently use zero for a fee',()=>{
    const r=calculate(policy,fx,selected(600000))
    expect(r.pilotComponent).toMatchObject({amountUsd:null,status:'POLICY_FEE_FOR_VALUE_NOT_DOCUMENTED',selectedPublishedPoint:null})
    expect(apply(costs[0],policy,fx,selected(600000))).toMatchObject({totalKnownComponentsUsd:null,knownCvuComponentUsd:null})
  })
  it('keeps unselected result unresolved while preserving prior known cost evidence',()=>{
    const r=apply(costs[0],policy,fx)
    expect(r.totalKnownComponentsUsd).toBeNull();expect(r.knownCvuComponentUsd).toBeNull()
    expect(r.priorTotalKnownComponentsUsd).toBe(costs[0].totalKnownComponentsUsd)
    expect(r.knownCfuComponentUsd).toBe(costs[0].knownCfuComponentUsd)
  })
  it('excludes only supplemental shipper insurance when that cost scope is explicitly selected',()=>{
    const r=apply(costs[0],policy,fx,{mode:'SEPARATE_SHIPPER_COST',declaredValueMxn:null,cargoDescription:null,taxTreatment:null})
    expect(r.totalKnownComponentsUsd).toBe(costs[0].totalKnownComponentsUsd)
    expect(r.cargoTripComponent).toMatchObject({amountUsd:0,status:'EXCLUDED_BY_EXPLICIT_COST_SCOPE'})
    expect(r.existingCarrierCargoPolicyRemoved).toBe(false);expect(r.completeD2DCostUsd).toBeNull()
  })
  it('adds one identical shipment component to every cash/finance/red/dedicated comparison, not per tractor, km or empty return',()=>{
    expect(costs).toHaveLength(272)
    const before=JSON.stringify({costs,policy,fx})
    for(const cost of costs){const r=apply(cost,policy,fx,selected())
      expect(r.knownCfuComponentUsd).toBe(cost.knownCfuComponentUsd)
      expect(r.knownCvuComponentUsd).toBeCloseTo(cost.knownCvuComponentUsd+2784/18.3688,9)
      expect(r.totalKnownComponentsUsd).toBeCloseTo(cost.totalKnownComponentsUsd+2784/18.3688,9)
      expect(r).toMatchObject({quoteReady:false,completeD2DCostUsd:null,existingCarrierCargoPolicyRemoved:false})
    }
    expect(JSON.stringify({costs,policy,fx})).toBe(before)
  })
  it('rejects a duplicate component, either through receipt or ledger line',()=>{
    expect(()=>apply(apply(costs[0],policy,fx,selected()),policy,fx,selected())).toThrow('ALREADY_APPLIED')
    expect(()=>apply({...costs[0],variableComponents:[{id:'SUPPLEMENTAL_CARGO_VALUE_INSURANCE'}]},policy,fx,selected())).toThrow('ALREADY_APPLIED')
  })
  it('does not price commercial cross-border liability with personal auto or coverage limits',()=>{
    expect(calculate(policy,fx).borderAutoLiability).toMatchObject({premiumUsd:null,minimumTripCoverageHours:24,
      actualCarrierEligibilityObserved:false,personalAutoRateUsed:false,liabilityLimitUsedAsPremium:false})
    expect(root.reviewedUsInsurancePublicModel.cargoAnnualProxyUsd).toBe(1553)
  })
  it('rejects inconsistent source arithmetic and duplicate points',()=>{
    const bad=structuredClone(policy);bad.publishedPoints[0].netPremiumMxn=225
    expect(()=>calculate(bad,fx)).toThrow('ARITHMETIC')
    const repeated=structuredClone(policy);repeated.publishedPoints[1]=repeated.publishedPoints[0]
    expect(()=>calculate(repeated,fx)).toThrow('DUPLICATE')
  })
  it.each([0,-1,Infinity,NaN])('rejects invalid FX%j',(mxnPerUsd)=>expect(()=>calculate(policy,{...fx,mxnPerUsd})).toThrow())
  it('rejects invented tariff, absent cargo and implicit tax treatment',()=>{
    expect(()=>calculate({...policy,premiumRate:0.0037},fx)).toThrow()
    expect(()=>calculate(policy,fx,{...selected(),declaredValueMxn:null})).toThrow()
    expect(()=>calculate(policy,fx,{...selected(),cargoDescription:''})).toThrow()
    expect(()=>calculate(policy,fx,{...selected(),taxTreatment:null})).toThrow()
  })
  it('rejects an inconsistent prior subtotal',()=>expect(()=>apply({...costs[0],totalKnownComponentsUsd:1},policy,fx,selected())).toThrow('SUM_MISMATCH'))
  it.each(['TIMI_CARGO_PRICE_20261002.html','TIMI_CROSS_BORDER_20261002.html','FMCSA_MX_REGISTRATION_INSURANCE_20261002.html'])(
    'rejects tampered source %s',(name)=>expect(()=>consolidate(readLocalDocument,file=>file.endsWith(name)?new Uint8Array([1,2,3]):readLocalDocumentBytes(file))).toThrow('SOURCE_ARCHIVE_HASH_MISMATCH'))
})
