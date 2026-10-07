import {describe,it,expect} from 'vitest'
import {calculateMxDriverRestAlternatives,calculateMxVariableEmployerMonth,calculateMxVariableDriverBenefits} from '../scripts/lib/reference-mx-variable-driver.js'
import {consolidateBinationalReferenceBudget} from '../scripts/consolidate-binational-reference-budget.js'
import {readLocalDocument} from '../scripts/assemble-economic-reference-cards.js'

const summary=consolidateBinationalReferenceBudget(),policy=JSON.parse(readLocalDocument('docs/research/B2_MX_VARIABLE_DRIVER_PUBLIC_MODEL_2026-10-02.json'))
const input={month:'2026-05',scope:'DECLARED_PROSPECTIVE_VARIABLE_OR_MIXED_NO_ABSENCE',
  previousBimester:[{month:'2026-03',eligibleVariableReceiptsMxn:31000,daysSalaryEarned:31},{month:'2026-04',eligibleVariableReceiptsMxn:30000,daysSalaryEarned:30}],
  allEligibleVariableReceiptsDeclared:true,fixedIntegratedDailyMxn:50,currentGrossWagesIncludingRestMxn:31000,
  annualBenefitAccrualMxn:18000,benefitAccrualIncludedInCurrentWages:false,umaDailyMxn:117.31,riskRegistration:'NEW_CARGO_CLASS_V'}

describe('variable MX driver employer projection, synthetic inputs not calibrated payroll',()=>{
  it('uses61earned days and adds integrated fixed elements once, not salary /30 or a fixed factor',()=>{
    const r=calculateMxVariableEmployerMonth(input)
    expect(r.previousEarnedDays).toBe(61);expect(r.variableDailyMxn).toBe(1000)
    expect(r.integratedDailySbcMxn).toBe(1050);expect(r.coveredDays).toBe(31)
    expect(r.componentsMxn.CEAV).toBeCloseTo(1050*31*.07513,9)
    expect(r.workRiskContributionMxn).toBeCloseTo(1050*31*.0758875,9)
    expect(r.additionalBenefitAccrualMxn).toBe(1500)
    expect(r.knownMonthlyComponentsMxn).toBeCloseTo(31000+1500+r.knownContributionsMxn+r.workRiskContributionMxn!,8)
    expect(r).toMatchObject({fixedSalaryFactorApplied:false,sbcAddedAsCashExpense:false,workerWithholdingAdded:false,
      benefitAccrualAutomaticallyAddedToSbc:false,statePayrollTaxMxn:null,completeMonthlyEmployerCostMxn:null,quoteReady:false})
  })
  it('caps contribution base, not cash wages, at25UMA',()=>{
    const r=calculateMxVariableEmployerMonth({...input,fixedIntegratedDailyMxn:5000})
    expect(r.cappedDailySbcMxn).toBe(117.31*25);expect(r.currentGrossWagesIncludingRestMxn).toBe(31000)
  })
  it('does not add annual benefit expense twice or change SBC from an accrual',()=>{
    const a=calculateMxVariableEmployerMonth(input),b=calculateMxVariableEmployerMonth({...input,benefitAccrualIncludedInCurrentWages:true})
    expect(b.additionalBenefitAccrualMxn).toBe(0);expect(a.integratedDailySbcMxn).toBe(b.integratedDailySbcMxn)
    expect(a.knownMonthlyComponentsMxn-b.knownMonthlyComponentsMxn).toBe(1500)
  })
  it('retains unknown existing risk and state tax, not a complete subtotal',()=>{
    const r=calculateMxVariableEmployerMonth({...input,riskRegistration:'EXISTING_RATE_UNKNOWN'})
    expect(r.workRiskContributionMxn).toBeNull();expect(r.unknownRiskExcludedFromKnownSubtotal).toBe(true)
    expect(r.completeMonthlyEmployerCostMxn).toBeNull()
  })
  it('handles62earned days independently of31current covered days',()=>{
    const r=calculateMxVariableEmployerMonth({...input,month:'2026-09',previousBimester:[
      {month:'2026-07',eligibleVariableReceiptsMxn:31000,daysSalaryEarned:31},{month:'2026-08',eligibleVariableReceiptsMxn:31000,daysSalaryEarned:31}]})
    expect(r.previousEarnedDays).toBe(62);expect(r.coveredDays).toBe(30);expect(r.variableDailyMxn).toBe(1000)
  })
  it('keeps previous completed bimester for both current months, not a rolling2month average',()=>{
    const may=calculateMxVariableEmployerMonth(input),june=calculateMxVariableEmployerMonth({...input,month:'2026-06'})
    expect(may.integratedDailySbcMxn).toBe(june.integratedDailySbcMxn)
    expect(june.coveredDays).toBe(30)
    expect(()=>calculateMxVariableEmployerMonth({...input,month:'2026-06',previousBimester:[
      input.previousBimester[1],{month:'2026-05',eligibleVariableReceiptsMxn:31000,daysSalaryEarned:31}]})).toThrow('MX_VARIABLE_BIMESTER_MISMATCH')
  })
  it.each([
    {month:'2026-04'},
    {previousBimester:[input.previousBimester[0],input.previousBimester[0]]},
    {previousBimester:[input.previousBimester[0],{...input.previousBimester[1],daysSalaryEarned:31}]},
    {allEligibleVariableReceiptsDeclared:false},{fixedIntegratedDailyMxn:-1},{riskRegistration:'OFFICE_CLASS_I'},
    {umaDailyMxn:113.14},{annualBenefitAccrualMxn:Number.NaN},
    {previousBimester:input.previousBimester.map(r=>({...r,eligibleVariableReceiptsMxn:100}))}
  ])('rejects unmatched/undeclared/unsupported input %#',patch=>expect(()=>calculateMxVariableEmployerMonth({...input,...patch})).toThrow())
})

describe('variable vacation salary and accrual without asset-day/payroll-day conflation',()=>{
  const b={scope:'FIRST_ANNIVERSARY_NO_WAGE_INCREASE_PROJECTION',last30WorkedDaysPerceptionsMxn:30000,aguinaldoDailyPlanningMxn:800,paidVacationWagesAlreadyInAnnualDistanceWages:false}
  it('prices12paid leave days,25%premium and a separately declared15dayaguinaldo',()=>{
    expect(calculateMxVariableDriverBenefits(b)).toMatchObject({vacationDailyMxn:1000,annualVacationWagesMxn:12000,
      annualVacationPremiumMxn:3000,annualAguinaldoMxn:12000,annualBenefitAccrualMxn:27000,vacationReplacedByCash:false,daysWorkedInferredFromAssetClock:false})
  })
  it('removes only vacation wages when already in annual distance remuneration',()=>{
    expect(calculateMxVariableDriverBenefits({...b,paidVacationWagesAlreadyInAnnualDistanceWages:true})).toMatchObject({
      additionalAnnualVacationWagesMxn:0,annualVacationPremiumMxn:3000,annualAguinaldoMxn:12000,annualBenefitAccrualMxn:15000})
  })
  it('rejects silently using elapsed asset days or a changed salary history',()=>{
    expect(()=>calculateMxVariableDriverBenefits({...b,last30WorkedDaysPerceptionsMxn:0})).toThrow()
    expect(()=>calculateMxVariableDriverBenefits({...b,scope:'WAGE_INCREASE_UNADJUSTED'})).toThrow()
    expect(()=>calculateMxVariableDriverBenefits({...b,assetElapsedDays:30})).toThrow()
  })
})

describe('driver rest alternatives connected to pilot, no adopted cost or repeated pay',()=>{
  it('replaces the original MX row once for both network/dedicated alternatives',()=>{
    const r=summary.supportingMxVariableDriver
    expect(r.scenarios).toHaveLength(4)
    for(const s of r.scenarios){
      const old=summary.supportingPilotVariableEconomics.scenarios.find(o=>o.cycleScenarioId===s.cycleScenarioId)!
      const original=old.rows.find(row=>row.id==='MX_DRIVER_PAY')!
      const includes=s.restInterpretation==='RATE_INCLUDES_WEEKLY_REST'
      expect(s.grossWorkAndRestMxn).toBeCloseTo(original.amountNative*(includes?1:1.1666),8)
      expect(s.workPayMxn+s.weeklyRestPayMxn).toBeCloseTo(s.grossWorkAndRestMxn,9)
      expect(s.conditionalKnownVariableSubtotalUsd).toBeCloseTo(old.knownVariableComponentSubtotalUsd-original.amountUsd+s.replacementRow.amountUsd,9)
      expect(s).toMatchObject({originalPayRowRemovedOnce:true,completeEmployerPayMxn:null,completeD2DCostUsd:null,
        paidWaitLodgingMealsMxn:null,sbcDailyMxn:null,extraBobtailKmDefaultedToZero:false,selected:false})
    }
    expect(r.originalVariableScenariosChanged).toBe(false)
    expect(Object.values(summary.outputs).every(v=>v===null)).toBe(true)
  })
  it('is deterministic and leaves old rows untouched',()=>{
    const old=JSON.stringify(summary.supportingPilotVariableEconomics)
    const f=()=>calculateMxDriverRestAlternatives(policy,summary.supportingPilotVariableEconomics,{mxnPerUsd:18.3688})
    expect(f()).toEqual(f());expect(JSON.stringify(summary.supportingPilotVariableEconomics)).toBe(old)
  })
  it('rejects duplicate or inconsistent pay instead of adding it twice',()=>{
    const c=structuredClone(summary.supportingPilotVariableEconomics)
    c.scenarios[0].rows.push(c.scenarios[0].rows.find(r=>r.id==='MX_DRIVER_PAY')!)
    expect(()=>calculateMxDriverRestAlternatives(policy,c,{mxnPerUsd:18.3688})).toThrow('MX_DRIVER_PAY_ROW_IDENTITY')
    expect(()=>calculateMxDriverRestAlternatives({...policy,restRate:1/6},summary.supportingPilotVariableEconomics,{mxnPerUsd:18.3688})).toThrow()
  })
})
