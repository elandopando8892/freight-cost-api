import {describe,it,expect} from 'vitest'
import {calculateMxDriverPublicForecast,joinPilotDriverForecastComponents} from '../scripts/lib/reference-mx-driver-forecast.js'
import {calculateMx2026ContributionReference} from '../scripts/lib/reference-mx-variable-driver.js'
import {consolidateBinationalReferenceBudget} from '../scripts/consolidate-binational-reference-budget.js'
import {readLocalDocument} from '../scripts/assemble-economic-reference-cards.js'

const s=consolidateBinationalReferenceBudget(),policy=JSON.parse(readLocalDocument('docs/research/B2_MX_DRIVER_FORECAST_2026-10-02.json'))
const run=(args:{policy?:unknown;cycles?:unknown;physical?:unknown;wages?:unknown;variables?:unknown;fx?:unknown}={})=>calculateMxDriverPublicForecast(
  args.policy??policy,args.cycles??s.supportingPilotCycleExposure,args.physical??s.supportingPilotPhysicalCycle,
  args.wages??s.supportingMxVariableDriver,args.variables??s.supportingPilotVariableEconomics,args.fx??{mxnPerUsd:18.3688})

describe('public driver forecast connected to same-box pilot, not real payroll',()=>{
  it('derives worker calendar independently from24asset elapsed days',()=>{
    const r=s.supportingMxDriverForecast
    expect(r.calendar).toMatchObject({calendarDays:365,holidayDays:7,poolProductiveWorkedDays:306,primaryProductiveWorkedDays:294})
    expect(r.calendar.weeklyRestDates).toHaveLength(52)
    expect(r.monthCoveredDays).toBe(31)
    expect(r).toMatchObject({driverWorkedDaysInferredFromAssetClock:false,normalizedContributionProxyIsActualBimester:false,
      stateJurisdictionObserved:false,reliefMaintainsExistingCapacityHypothesis:true,reliefRosterOrTimetableProven:false})
  })
  it('respects all quantity/time limits including newly corrected MX clock',()=>{
    for(const row of s.supportingMxDriverForecast.scenarios){
      expect(row.compatibleKnownCyclesPerMonth).toBe(Math.min(...row.capacityConstraints.map(c=>c.cycles)))
      expect(row.monthlyKnownPaidKm).toBeLessThanOrEqual(10000+1e-8)
      expect(row.compatibleKnownCyclesPerMonth).toBeGreaterThan(0)
      const clock=s.supportingPilotPhysicalCycle.scenarios.find(c=>c.id===row.cycleScenarioId)!
      expect(row.compatibleKnownCyclesPerMonth*clock.knownMxElapsedClockDays).toBeLessThanOrEqual(24+1e-8)
      expect(row.compatibleKnownCyclesPerMonth*clock.knownBoxClockDays).toBeLessThanOrEqual(24+1e-8)
    }
  })
  it('partitions road wages between primary and relief instead of paying twice',()=>{
    for(const r of s.supportingMxDriverForecast.scenarios){
      expect(r.primary.annualRoadWagesMxn+r.relief.annualRoadWagesMxn).toBeCloseTo(r.annualRoadWagesMxn,8)
      expect(r.primary.annualRoadWagesMxn/r.relief.annualRoadWagesMxn).toBeCloseTo(294/12,10)
      expect(r.relief).toMatchObject({workedDays:12,coveredCalendarDays:14,roadPayAlreadyInKmPool:true})
      expect(r.holidayVacancyReliefRoadPayAddedAgain).toBe(false)
    }
  })
  it('adds holiday/vacation/aguinaldo/premium once and proportionate relief benefits',()=>{
    for(const r of s.supportingMxDriverForecast.scenarios){
      const daily=r.workedDayPlanningIncomeMxn,b=r.primary.benefits
      expect(b.annualVacationWagesMxn).toBeCloseTo(daily*12,9)
      expect(b.annualVacationPremiumMxn).toBeCloseTo(daily*3,9)
      expect(b.annualAguinaldoMxn).toBeCloseTo(daily*15,9)
      expect(r.primary.annualHolidayPayMxn).toBeCloseTo(daily*7,9)
      expect(r.relief.proratedBenefitsMxn).toBeCloseTo(daily*30*14/365,9)
      expect(r.annualTaxableWagesMxn).toBeCloseTo(r.annualRoadWagesMxn+daily*37+r.relief.proratedBenefitsMxn,8)
    }
  })
  it('calculates each person contribution base and fixed daily quota separately',()=>{
    for(const r of s.supportingMxDriverForecast.scenarios){
      const a=r.primary.contributions,b=r.relief.contributions
      expect(a.coveredDays).toBe(31);expect(b.coveredDays).toBe(14)
      expect(a.dailySbcMxn).toBeCloseTo(r.primary.annualCashMxn/365,9)
      expect(b.dailySbcMxn).toBeCloseTo(r.relief.annualCashMxn/14,9)
      expect(r.fixedContributionMonthlyMxn).toBeCloseTo(117.31*.204*(31+14/12),9)
      expect(r.monthlyContributionReferenceMxn).toBeCloseTo(a.knownContributionsMxn+a.workRiskContributionMxn!+(b.knownContributionsMxn+b.workRiskContributionMxn!)/12,8)
    }
  })
  it('taxes remuneration, not SBC or employer contribution, in explicit NL hypothesis',()=>{
    for(const r of s.supportingMxDriverForecast.scenarios){
      expect(r.monthlyStateTaxAccrualMxn).toBeCloseTo(r.annualTaxableWagesMxn*.03/12,9)
      expect(r.monthlyStateTaxAccrualMxn).not.toBeCloseTo((r.annualTaxableWagesMxn/12+r.monthlyContributionReferenceMxn)*.03,2)
      expect(r.minimumWageMeanContrast.actualDailyMinimumComplianceCertified).toBe(false)
    }
  })
  it('separates fixed IMSS CFU component from income-linked CVU without duplicated original pay',()=>{
    for(const r of s.supportingMxDriverForecast.scenarios){
      const old=s.supportingPilotVariableEconomics.scenarios.find(v=>v.cycleScenarioId===r.cycleScenarioId)!
      const original=old.rows.find(row=>row.id==='MX_DRIVER_PAY')!
      expect(r.fixedEmployerComponentUsd+r.variableWageAndEmployerComponentUsd).toBeCloseTo(r.wageAndKnownEmployerComponentUsd,9)
      expect(r.conditionalKnownVariableSubtotalUsd).toBeCloseTo(old.knownVariableComponentSubtotalUsd-original.amountUsd+r.variableWageAndEmployerComponentUsd,9)
      expect(r.conditionalKnownMixedComponentTotalUsd-r.conditionalKnownVariableSubtotalUsd).toBeCloseTo(r.fixedEmployerComponentUsd,9)
      expect(r.replacesOriginalMxPayOnce).toBe(true)
    }
  })
  it('keeps rest interpretations alternative, not additive or selected',()=>{
    const rows=s.supportingMxDriverForecast.scenarios
    expect(rows).toHaveLength(4)
    for(const high of rows.filter(r=>r.restInterpretation==='RATE_EXCLUDES_WEEKLY_REST')){
      const low=rows.find(r=>r.cycleScenarioId===high.cycleScenarioId&&r.restInterpretation==='RATE_INCLUDES_WEEKLY_REST')!
      expect(high.annualRoadWagesMxn/low.annualRoadWagesMxn).toBeCloseTo(1.1666,10)
      expect(high.fixedContributionMonthlyMxn).toBe(low.fixedContributionMonthlyMxn)
      expect(high.knownMonthlyWageAndNormativeComponentsMxn).toBeGreaterThan(low.knownMonthlyWageAndNormativeComponentsMxn)
    }
  })
  it('does not certify missing duty, wait/PTU or physical coverage as zero or a complete cost',()=>{
    for(const r of s.supportingMxDriverForecast.scenarios)expect(r).toMatchObject({overtimeMxn:null,
      sundayOrHolidayWorkPremiumMxn:null,waitMealsLodgingMxn:null,ptuAndOtherBenefitsMxn:null,
      fullCompatibleDriverRosterCostMxn:null,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,
      dutyComplianceProven:false,additionalBobtailDistanceComplete:false,actualPayrollObserved:false,selected:false,quoteReady:false})
    expect(Object.values(s.outputs).every(v=>v===null)).toBe(true)
  })
  it('is deterministic and preserves original source/scenario objects',()=>{
    const before=JSON.stringify([policy,s.supportingPilotCycleExposure,s.supportingPilotPhysicalCycle,s.supportingMxVariableDriver])
    expect(run()).toEqual(run())
    expect(JSON.stringify([policy,s.supportingPilotCycleExposure,s.supportingPilotPhysicalCycle,s.supportingMxVariableDriver])).toBe(before)
  })
  it('rejects mismatched holiday calendar, foreign jurisdiction, wage policy or tax',()=>{
    for(const patch of [{calendar:{...policy.calendar,holidays:policy.calendar.holidays.map((x:string)=>x==='2026-03-16'?'2026-03-21':x)}},
      {statePayrollRate:.04},{employerJurisdictionHypothesis:'ACTUAL_QUERETARO_FROM_OFFER'},
      {contributionBasis:'ACTUAL_BIMESTER'}, {calendar:{...policy.calendar,primaryVacationWorkedDays:0}}])expect(()=>run({policy:{...policy,...patch}})).toThrow()
  })
  it('rejects repeated cycles/resources/pay identity and broken original salary scope',()=>{
    const cycle=structuredClone(s.supportingPilotCycleExposure)
    cycle.scenarios[1]=cycle.scenarios[0]
    expect(()=>run({cycles:cycle})).toThrow('DRIVER_FORECAST_DUPLICATE_CYCLE')
    const wages=structuredClone(s.supportingMxVariableDriver)
    wages.scenarios[0].paidKnownPhysicalKm+=10
    expect(()=>run({wages})).toThrow('DRIVER_FORECAST_PAY_SCOPE_MISMATCH')
  })
  it('rejects invalid FX rather than inventing a value',()=>expect(()=>run({fx:{mxnPerUsd:0}})).toThrow())
})

describe('shared full/partial coverage contribution primitive retains narrow normative scope',()=>{
  const i={dailySbcMxn:1000,coveredDays:14,umaDailyMxn:117.31,riskRegistration:'NEW_CARGO_CLASS_V'}
  it('caps per person, not salary pool',()=>{
    const one=calculateMx2026ContributionReference({...i,dailySbcMxn:2000}),two=calculateMx2026ContributionReference({...i,dailySbcMxn:4000})
    expect(one.cappedDailySbcMxn).toBe(2000);expect(two.cappedDailySbcMxn).toBe(2932.75)
    expect(one.componentsMxn.CEAV*2).not.toBe(two.componentsMxn.CEAV)
  })
  it.each([{coveredDays:0},{coveredDays:32},{coveredDays:14.5},{dailySbcMxn:400},{riskRegistration:'OFFICE_CLASS_I'},
    {umaDailyMxn:113.14},{dailySbcMxn:Infinity}])('rejects unsupported period/bracket/profile %#',patch=>expect(()=>calculateMx2026ContributionReference({...i,...patch})).toThrow())
  it('keeps existing premium unknown while exposing known statutory components',()=>{
    expect(calculateMx2026ContributionReference({...i,riskRegistration:'EXISTING_RATE_UNKNOWN'}).workRiskContributionMxn).toBeNull()
  })
})

describe('fixed/variable/road components joined to pilot without faking full cost',()=>{
  const join=(d:unknown=s.supportingMxDriverForecast,f:unknown=s.supportingPilotPhysicalCycle,r:unknown=s.supportingPilotRoadBorderEconomics)=>joinPilotDriverForecastComponents(d,f,r)
  it('produces8independent alternatives, not a sum across incompatible scenarios',()=>{
    expect(s.supportingPilotPayrollComponents.scenarios).toHaveLength(8)
    expect(new Set(s.supportingPilotPayrollComponents.scenarios.map(r=>r.id)).size).toBe(8)
  })
  it('conserves fixed/variable rows and charges original MX pay and box/admin only once',()=>{
    for(const r of s.supportingPilotPayrollComponents.scenarios){
      expect(r.fixedComponents.reduce((sum,x)=>sum+x.amountUsd,0)).toBeCloseTo(r.knownCfuComponentUsd,9)
      expect(r.variableComponents.reduce((sum,x)=>sum+x.amountUsd,0)).toBeCloseTo(r.knownCvuComponentUsd,9)
      expect(r.totalKnownComponentsUsd).toBeCloseTo(r.knownCfuComponentUsd+r.knownCvuComponentUsd,9)
      expect(r.fixedComponents.filter(x=>x.resourceId==='SHARED_TRAILER')).toHaveLength(1)
      expect(r.fixedComponents.filter(x=>x.id==='MX_DRIVER_FIXED_EM_QUOTA')).toHaveLength(1)
      expect(r).toMatchObject({sameBoxChargedOnce:true,adminPoolChargedOnce:true,originalMxPayAddedAgain:false,
        completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,isLowerBound:false,selected:false})
    }
  })
  it('keeps physical/company/duty/road gaps explicit',()=>{
    expect(s.supportingPilotPayrollComponents).toMatchObject({physicallyComplete:false,completeFixedCompanyInsuranceUsd:null,
      completeDriverDutyUsd:null,completeRoadBorderUsd:null,completeD2DCostUsd:null,adoptedValues:0})
  })
  it('rejects repeated payroll alternative identities',()=>{
    const d=structuredClone(s.supportingMxDriverForecast);d.scenarios[1]=d.scenarios[0]
    expect(()=>join(d)).toThrow('PILOT_PAYROLL_COMPONENT_DUPLICATE_IDENTITY')
  })
  it('rejects broken fixed resource sums or repeated box allocation',()=>{
    const f=structuredClone(s.supportingPilotPhysicalCycle)
    f.scenarios[0].conditionalFixedAllocations[0].resources[2].conditionalOldDistanceKnownClockMaxUsd+=100
    expect(()=>join(s.supportingMxDriverForecast,f)).toThrow('PILOT_PAYROLL_FIXED_RESOURCES_NOT_CONSERVED')
    const repeated=structuredClone(s.supportingPilotPhysicalCycle)
    repeated.scenarios[0].conditionalFixedAllocations[0].resources[0].resourceId='SHARED_TRAILER'
    expect(()=>join(s.supportingMxDriverForecast,repeated)).toThrow('PILOT_PAYROLL_FIXED_RESOURCES_NOT_CONSERVED')
  })
  it('is deterministic and leaves existing projections untouched',()=>{
    const before=JSON.stringify([s.supportingMxDriverForecast,s.supportingPilotPhysicalCycle,s.supportingPilotRoadBorderEconomics])
    expect(join()).toEqual(join())
    expect(JSON.stringify([s.supportingMxDriverForecast,s.supportingPilotPhysicalCycle,s.supportingPilotRoadBorderEconomics])).toBe(before)
  })
})
