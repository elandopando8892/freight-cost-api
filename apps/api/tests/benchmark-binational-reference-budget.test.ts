import { describe, expect, it } from 'vitest'
import { calculateSharedBoxFinancePlanning, consolidateBinationalReferenceBudget, REFERENCE_BUDGET_PINS } from '../scripts/consolidate-binational-reference-budget.js'
import { readLocalDocument, readLocalDocumentBytes, pointerExists } from '../scripts/assemble-economic-reference-cards.js'
import { allocateFixedCost } from '../src/modules/engine/fixed-cost-allocation.js'

const summary = consolidateBinationalReferenceBudget()

describe('same box public financing sensitivity, not actual lending or adopted cost',()=>{
  const input={netAssetValueMxn:630000,mxnPerUsd:18.3688,
    cashScenarios:[{id:'NET_PLUS_VAT',monthlyCapitalMxn:3750},{id:'GROSS_INCLUDES_VAT',monthlyCapitalMxn:6853.448275862071}]}
  it('keeps source rates apart from CAT and disclosed planning assumptions',()=>{
    const r=summary.supportingSharedBoxFinancePlanning
    expect(r.source).toMatchObject({fixedAnnualRateBounds:[0.15,0.38],openingFeeRate:0.01,publishedCat:0.172,
      publishedCatUsedAsInterest:false,assetEligibilityOrBorrowerApprovalObserved:false})
    expect(r.scenarios).toHaveLength(8)
    expect(new Set(r.scenarios.map(s=>s.principalMxn))).toEqual(new Set([504000,630000]))
    expect(r.scenarios.every(s=>s.termMonths===24&&s.oneSharedBox&&!s.selected)).toBe(true)
    expect(r).toMatchObject({actualDebtObserved:false,actualPurchaseOrLoanRequested:false,externalCalls:false,
      completeBoxFinancedCapitalUsd:null,completeD2DCostUsd:null,quoteReady:false})
    expect(Object.values(summary.outputs).every(v=>v===null)).toBe(true)
  })
  it('conserves principal and interest and never adds debt service to depreciation',()=>{
    for(const s of calculateSharedBoxFinancePlanning(input).scenarios){
      expect(s.totalDebtServiceMxn-s.totalInterestMxn).toBeCloseTo(s.principalMxn,6)
      expect(s.terminalBalanceMxn).toBeCloseTo(0,6)
      expect(s.principalOrDebtServiceAddedToEconomicExpense).toBe(false)
      for(const fee of s.feeTaxAlternatives){
        expect(fee.monthlyCapitalComponentMxn).toBeCloseTo(s.cashValueLossMonthlyMxn+s.averageInterestMxn+fee.economicFeeMxn/24,8)
        expect(fee.monthlyCapitalComponentMxn).not.toBeCloseTo(s.cashValueLossMonthlyMxn+s.monthlyDebtServiceMxn,2)
      }
    }
  })
  it('keeps one financing surcharge across cash tax alternatives and allocates fee only once',()=>{
    const r=calculateSharedBoxFinancePlanning(input)
    for(const s of r.scenarios.filter(s=>s.cashTaxScenario==='NET_PLUS_VAT')){
      const other=r.scenarios.find(o=>o.cashTaxScenario==='GROSS_INCLUDES_VAT'&&o.financedShare===s.financedShare&&o.annualRate===s.annualRate)!
      expect(other.averageInterestMxn).toBe(s.averageInterestMxn)
      expect(s.openingFeeGrossCashMxn).toBeCloseTo(s.principalMxn*0.01*1.16,8)
      expect(s.feeTaxAlternatives[1].feeAllocationMxn-s.feeTaxAlternatives[0].feeAllocationMxn).toBeCloseTo(s.principalMxn*0.01*0.16/24,8)
    }
  })
  it('increases interest with rate or leverage without changing depreciation',()=>{
    const r=calculateSharedBoxFinancePlanning(input).scenarios.filter(s=>s.cashTaxScenario==='NET_PLUS_VAT')
    expect(r[1].averageInterestMxn).toBeGreaterThan(r[0].averageInterestMxn)
    expect(r[2].averageInterestMxn).toBeGreaterThan(r[0].averageInterestMxn)
    expect(new Set(r.map(s=>s.cashValueLossMonthlyMxn))).toEqual(new Set([3750]))
  })
  it('rejects duplicate tax identities instead of doubling the same box',()=>{
    expect(()=>calculateSharedBoxFinancePlanning({...input,cashScenarios:[input.cashScenarios[0],input.cashScenarios[0]]})).toThrow('BOX_FINANCE_DUPLICATE_CASH_ALTERNATIVE')
  })
  it('rejects invalid FX or loss and unexpected CAT/rate inputs',()=>{
    expect(()=>calculateSharedBoxFinancePlanning({...input,mxnPerUsd:0})).toThrow()
    expect(()=>calculateSharedBoxFinancePlanning({...input,cashScenarios:[{...input.cashScenarios[0],monthlyCapitalMxn:-1},input.cashScenarios[1]]})).toThrow()
    expect(()=>calculateSharedBoxFinancePlanning({...input,annualRate:0.172})).toThrow()
  })
  it('is deterministic and leaves the original input intact',()=>{
    const before=JSON.stringify(input),first=calculateSharedBoxFinancePlanning(input)
    expect(calculateSharedBoxFinancePlanning(input)).toEqual(first)
    expect(JSON.stringify(input)).toBe(before)
  })
})

describe('one reference-budget summary without converting public fragments into adopted costs', () => {
  it('connects normalized admin and parallel border clocks without selecting a subtotal as whole cost',()=>{
    expect(summary.cutDate).toBe('2026-10-02')
    expect(summary.sourcePins).toHaveLength(79)
    expect(summary.supportingAdminScaleReference).toMatchObject({payrollComponentMonthlyUsd:3020.22,tmsComponentMonthlyUsd:138,
      observedFte:false,pilotFleetCountsChanged:false,companySeatQuantitiesAutomaticallyInherited:false})
    expect(summary.supportingAdminScaleReference.scenarios.map(s=>s.knownMonthlyComponentUsd)).toEqual([6664.791666666667,6833.741666666667])
    const [network,dedicated]=summary.supportingPilotPhysicalCycle.scenarios
    expect(network.knownMxElapsedClockDays-network.priorMxElapsedClockDays).toBeCloseTo(87/60/24,10)
    expect(dedicated.knownMxElapsedClockDays).toBeCloseTo(dedicated.knownBoxClockDays,10)
    expect(summary.supportingPilotPhysicalCycle).toMatchObject({completeD2DCostUsd:null,oldVariableTotalsCertifiedComplete:false,unknownDistanceDefaultedToZero:false})
    expect(Object.values(summary.outputs).every(v=>v===null)).toBe(true)
  })
  it('connects both US capital payment modes to the same exposure without filling missing costs',()=>{
    const r=summary.supportingUsCapitalComparison
    expect(r).toMatchObject({selectedScenario:null,alternativesNotAdded:true,completeBudgetRowsAdded:0,
      acquisitionCorrectionsOrUnknownFeesSetToZero:false,completeCapitalFamilyUsd:null})
    expect(r.scenarios).toHaveLength(summary.supportingJointUsCapitalExposure.scenarios.length)
    for(const scenario of r.scenarios){
      const exposure=summary.supportingJointUsCapitalExposure.scenarios.find(s=>s.id===scenario.exposureId)!
      expect(scenario.askingValueLossMonthlyUsd).toBeCloseTo(exposure.askingValueLossMonthlyUsd,10)
      expect(scenario.cash.completeCapitalMonthlyUsd).toBeNull()
      expect(scenario.financed.completeCapitalMonthlyUsd).toBeNull()
      expect(scenario.providerAprConvertedToNominal).toBe(false)
    }
    expect(summary.budgetRows.find(row=>row.economicExpenseId==='US_TRACTOR_CAPITAL')!.completeAmountUsdPerMonth).toBe(472.99)
  })
  it('moves one reviewed US premium model into the partial budget, not canonical calibration',()=>{
    expect(summary.reviewedUsInsurancePublicModel).toMatchObject({monthlyBudgetUsd:1055.42,
      annualExpenseReferenceUsd:12665,budgetFamilyModeled:true,archivedSourcesChecked:true,
      matchedPolicyObserved:false,boxCoverageProven:false,mxCoverageProven:false,
      completeBinationalInsuranceUsd:null,allOtherExpenseAmountsPreserved:true})
    expect(summary.originalBudgetBaseline).toMatchObject({completeRows:0,originalWorksheetModified:false,status:'INCOMPLETE'})
    const index=summary.budgetRows.findIndex(e=>e.economicExpenseId==='US_TRACTOR_INSURANCE')
    expect(summary.authoritativeBudget.conditions.some(c=>c.field===`expenses.${index}`)).toBe(false)
    expect(summary.authoritativeBudget.completeRows).toBe(2)
    expect(summary.authoritativeBudget).toMatchObject({completeRowsArePublicModelExpenseRows:true,calibratedRows:0,matchedPolicyInvoiceRows:0})
    expect(summary.reviewedPublicModelBudget.expenses.filter(e=>e.amount!==null)).toHaveLength(2)
    expect(summary.reviewedPublicModelBudget.evidence.every(e=>e.kind==='DOCUMENTED_PUBLIC_MODEL')).toBe(true)
  })
  it('repeats reconciliation without accumulating source refs or mutating the original',()=>{
    const before=readLocalDocument(REFERENCE_BUDGET_PINS.find(p=>p.id==='worksheet')!.file)
    const first=consolidateBinationalReferenceBudget(),second=consolidateBinationalReferenceBudget()
    expect(first.budgetRows).toEqual(second.budgetRows)
    for(const row of second.budgetRows) expect(new Set(row.refs).size).toBe(row.refs.length)
    expect(first.reviewedPublicModelBudget).toEqual(second.reviewedPublicModelBudget)
    expect(readLocalDocument(REFERENCE_BUDGET_PINS.find(p=>p.id==='worksheet')!.file)).toBe(before)
  })
  it('checks the original cargo source archive before producing the model budget',()=>{
    expect(()=>consolidateBinationalReferenceBudget(readLocalDocument,file=>file.endsWith('INSUREON_TRUCK_COST_REVIEW_20261002.html')
      ? new Uint8Array([1,2,3]) : readLocalDocumentBytes(file))).toThrow('SOURCE_ARCHIVE_HASH_MISMATCH:INSUREON_CARGO_2025')
  })
  it('connects historical Mexican inspection without adopting it or summing Texas',()=>{
    expect(summary.supportingSharedBoxMexicoInspection).toMatchObject({historicalAnnualGrossMxn:700,
      currentMonthlyInspectionMxn:null,originalPagesArchived:false,completeBoxCfuUsd:null,
      texasRenewalAutomaticallyAdded:false,separateUsPeriodicInspectionAutomaticallyAdded:false,
      reciprocalMexicoRecognitionEstablished:false,eligibleForBudget:false})
    expect(summary.budgetRows.find(row=>row.economicExpenseId==='SHARED_TRAILER_PERMITS')!.refs).toContain('sharedBoxMxInspection#/sources')
    expect(summary.authoritativeBudget.completeRows).toBe(2)
    expect(Object.values(summary.outputs).every(v=>v===null)).toBe(true)
  })
  it('connects full Texas renewal arithmetic once, without selecting pilot jurisdiction',()=>{
    const r=summary.supportingSharedBoxTexasCompliance
    expect(r).toMatchObject({annualRecurringTexasReferenceUsd:101.75,annualInspectionPlanningUsd:62,
      archivedSourcesChecked:true,actualPilotJurisdictionSelected:false,physicalBoxCount:1,
      completeBinationalMonthlyPermitsUsd:null,completeBoxCfuUsd:null,eligibleForBudget:false})
    expect(r.monthlyRecurringTexasReferenceUsd).toBeCloseTo(101.75/12,12)
    expect(summary.budgetRows.find(row=>row.economicExpenseId==='SHARED_TRAILER_PERMITS')!.refs).toContain('sharedBoxTxCompliance#/fees')
    expect(summary.authoritativeBudget.completeRows).toBe(2)
    expect(Object.values(summary.outputs).every(v=>v===null)).toBe(true)
  })
  it.each([
    ['TX_COUNTY_FEES_2026_REVIEW_20261001.pdf','TX_COUNTY_2026'],
    ['TX_REGISTRATION_MANUAL_AUG2026_REVIEW_20261001.pdf','TX_REGISTRATION_MANUAL_AUG2026'],
    ['TX_TOKEN_TRAILERS_REVIEW_20261001.html','TX_TOKEN_2026'],
  ])('rejects modified Texas compliance archive %s',(name,id)=>{
    expect(()=>consolidateBinationalReferenceBudget(readLocalDocument,file=>file.endsWith(name)
      ? new Uint8Array([8,9]) : readLocalDocumentBytes(file))).toThrow(`SOURCE_ARCHIVE_HASH_MISMATCH:${id}`)
  })
  it('connects one-box US PD amounts without selecting a binational premium or replacing the MX asset',()=>{
    const r=summary.supportingSharedBoxInsurance
    expect(r.publishedMonthlyRangeUsd).toEqual({low:25,high:150})
    expect(r.publishedAnnualEquivalentRangeUsd).toEqual({low:300,high:1800})
    expect(r.source).toMatchObject({kind:'BROKER_PUBLISHED_PLANNING_RULE',territory:'US',coverage:'OWNED_TRAILER_PHYSICAL_DAMAGE'})
    expect(r).toMatchObject({physicalBoxCount:1,currency:'USD',valueBasedMonthlyRangeUsd:null,
      selectedMonthlyPremiumUsd:null,completeBinationalMonthlyInsuranceUsd:null,
      selectedUsedMxAssetReplaced:false,insuredValueInferredFromAskingPrice:false,
      unknownMxnUsdFxInvented:false,duplicateBoxChargeAdded:false,completeBoxCfuUsd:null,quoteReady:false})
    const row=summary.budgetRows.find(r=>r.economicExpenseId==='SHARED_TRAILER_INSURANCE')!
    expect(row.refs).toContain('sharedBoxInsurance#/publishedMonthlyRangeUsd')
    expect(row.completeAmountUsdPerMonth).toBeNull()
    expect(summary.authoritativeBudget.completeRows).toBe(2)
    expect(Object.values(summary.outputs).every(v=>v===null)).toBe(true)
  })
  it('keeps public modeled estimation separate from identified-carrier operational acceptance',()=>{
    expect(summary.estimationMandate).toMatchObject({result:'COMPLETE_PUBLIC_MODEL_D2D_COST_ESTIMATE',
      evidenceKinds:['PUBLIC_OBSERVATION','DOCUMENTED_PUBLIC_MODEL'],reviewedBenchmarkSupportedHypothesesAllowed:true,
      actualCarrierIdentityRequired:false,actualCarrierFleetSizeRequired:false,actualLoanContractRequired:false,
      privateXbfRecordsRequired:false,actualInsurerQuoteRequiredForReferenceEstimate:false,
      monetaryAmountsAndCapacityNeedSupport:true,sourceCountryEquipmentScopeAndUnitsRequired:true,
      unknownTermsMayBecomeZero:false,automaticProxyAdoptionAllowed:false,operationalAcceptanceProvenByModel:false,
      costEstimateIsPurchaseOrSalePrice:false,completePilotStillRequired:true})
    expect(summary.authoritativeBudget.completeRows).toBe(2)
    expect(Object.values(summary.outputs).every(v=>v===null)).toBe(true)
  })
  it('projects four box capital-tax alternatives and two MX movements without duplicate box or complete CFU',()=>{
    const r=summary.supportingSharedBoxCapitalExposure
    expect(r.scenarios).toHaveLength(8)
    expect(new Set(r.scenarios.map(s=>s.movementScenarioId))).toEqual(new Set(summary.supportingCaseCycle.mxDrivingStageContrasts.map(s=>s.scenarioId)))
    expect(r.scenarios[0].mxPrefix.byDistanceMxn).toBeCloseTo(421.7161578572526,9)
    expect(r.scenarios[0].input.mxDistanceKm).toBe(summary.supportingCaseCycle.candidateMxDistanceKm)
    for(const s of r.scenarios) {
      expect(s.input).toMatchObject({physicalBoxCount:1,monthlyKm:10000,monthlyAssetDays:25,
        usDistanceKm:null,usMovementElapsedHours:null,borderDetachedHours:null})
      expect(s).toMatchObject({completeForwardMovementReferenceMxn:null,completeBoxCfuMxn:null,
        unknownCapitalAdjustmentsSetToZero:false,duplicateBoxChargeAdded:false,phaseAllocationsAdditive:false,
        productiveBoxCapacityObserved:false,eligibleForBudget:false,quoteReady:false})
      expect(s.mxPrefix.conditionalReferenceMxn).toBe(Math.max(s.mxPrefix.byDistanceMxn,s.mxPrefix.byTimeMxn))
    }
    expect(r).toMatchObject({onePhysicalBox:true,scenarioResultsAreAlternativesNotSum:true,completeBoxCapitalMxn:null,
      completeBoxCfuMxn:null,eligibleForBudget:false,quoteReady:false})
    expect(summary.authoritativeBudget.completeRows).toBe(2)
    expect(Object.values(summary.outputs).every(v=>v===null)).toBe(true)
  })
  it('connects MX forward advertised pay and US historical alternatives without complete employer cost',()=>{
    const r=summary.supportingDriverEconomics
    expect(r.mxForwardPayReference.conditionalAdvertisedPayMxn).toBeCloseTo(2361.6104840006145,9)
    expect(r.mxForwardPayReference.candidateDistanceKm).toBe(summary.supportingCaseCycle.candidateMxDistanceKm)
    expect(r.usReportedCompensationAlternatives).toHaveLength(5)
    expect(r).toMatchObject({usOriginalArchiveChecked:true,selectedUsFleetGroup:null,
      imtSubtotalCombinedWithMxPay:false,fxConversionPerformed:false,pilotDriverCvuUsd:null,eligibleForPilot:false,quoteReady:false})
    expect(summary.supportingVariableEconomics.selectedMxBaseModel.driverCostAdded).toBe(false)
    expect(Object.values(summary.outputs).every(v=>v===null)).toBe(true)
  })
  it('rejects a replaced original ATRI compensation report',()=>{
    expect(()=>consolidateBinationalReferenceBudget(readLocalDocument,file=>file.endsWith('ATRI_OPSCOST_2025_REVIEW_20261001.pdf')
      ? new Uint8Array([4,5,6]) : readLocalDocumentBytes(file))).toThrow('DRIVER_COMPONENT_ARCHIVE_HASH_MISMATCH')
  })
  it('connects a joint2025 variable-component model to the MX candidate without claiming a complete CVU',()=>{
    const r=summary.supportingVariableEconomics
    expect(r.sourceFileChecks).toEqual({fuel:6,maintenance:10})
    expect(r.selectedMxBaseModel.selectedSubtotalMxnPerVehicleKm).toBeCloseTo(17.57138,12)
    expect(r.selectedMxBaseModel.conditionalSelectedCandidateStageAmountMxn).toBeCloseTo(19760.35963159939,8)
    expect(r.selectedMxBaseModel.candidateStage.distanceKm).toBe(summary.supportingCaseCycle.candidateMxDistanceKm)
    expect(r.selectedMxBaseModel).toMatchObject({extraTrailerChargeAdded:false,capitalOrAdminAdded:false,
      driverCostAdded:false,target53FootProfileMatched:false,truckRouteAdjusted:false,selectedSubtotalNotCompleteCvu:true})
    expect(r).toMatchObject({eligibleForPilot:false,pilotCvuUsd:null,crossCountryTotalUsd:null,adoptedValues:0,quoteReady:false})
    expect(summary.authoritativeBudget.completeRows).toBe(2)
    expect(Object.values(summary.outputs).every(v=>v===null)).toBe(true)
  })
  it.each(['IMT_PT881_2025.pdf','TTI_UMR2025_APPENDIX_C.pdf','ORNL_TM2011_471.pdf'])('rejects a replaced variable-component source %s',name=>{
    expect(()=>consolidateBinationalReferenceBudget(readLocalDocument,file=>file.endsWith(name)
      ? new Uint8Array([7,7,7]) : readLocalDocumentBytes(file))).toThrow(`SOURCE_HASH_MISMATCH:docs/research/sources/${name}`)
  })
  it('joins retained MX detail to two driving-stage sensitivities without making a fleet or cycle',()=>{
    const r=summary.supportingCaseCycle
    expect(r.candidateMxDistanceKm).toBeCloseTo(1124.5764209526735,9)
    expect(r.candidateMxIdealMinutes).toBeCloseTo(709.8829924923754,9)
    expect(r.mxDrivingStageContrasts.map(s=>s.drivingHoursPer24HourBlock)).toEqual([10,14])
    expect(r.mxDrivingStageContrasts[0].conditionalMovementOnlyElapsedHours).toBeCloseTo(25.83138320820626,9)
    expect(r.mxDrivingStageContrasts[1].conditionalMovementOnlyElapsedHours).toBeCloseTo(12.831383208206257,9)
    expect(r).toMatchObject({candidateIsApprovedTruckRoute:false,usDistanceKm:null,usDrivingMinutes:null,
      usStage:null,usRouteContentRetained:false,tractorCycles:null,sharedTrailerCycleDays:null,
      adminAllocationShares:null,adminTripComponentMxn:null,resourceExposureAdopted:false,
      eligibleForResourceExposure:false,adoptedValues:0,quoteReady:false})
    expect(Object.values(summary.outputs).every(v=>v===null)).toBe(true)
  })
  it.each(['NOM087_DRIVING_RULES_20261001.html','NOM087_STATUS_20261001.html'])('checks official driving archive %s',name=>{
    const id=name.startsWith('NOM087_DRIVING')?'NOM087_RULES':'NOM087_CURRENT_STATUS'
    expect(()=>consolidateBinationalReferenceBudget(readLocalDocument,file=>file.endsWith(name)
      ? new Uint8Array([9,8,7]) : readLocalDocumentBytes(file))).toThrow(`SOURCE_ARCHIVE_HASH_MISMATCH:${id}`)
  })
  it('connects continuous seat quantity to one administrative pool without adding historical FTE again', () => {
    const {monitoringCoverageContrast: coverage, monitoringPlanningPayrollContrasts: rows} = summary.supportingFacilityStaffing
    expect(coverage.roundedPlanningHeadcount).toBe(6)
    expect(rows.map(r => r.staffing.knownSalaryComponentsOnly)).toEqual([90000,96000])
    for(const [i,row] of rows.entries()) {
      const employee = summary.insuranceEmployerReferences.mxEmployerRiskContrasts[i]
      expect(row.conditionalStaffingPlanningComponentMxn).toBeCloseTo(employee.conditionalPlanningComponentSumMxn! * 6, 8)
      expect(row.staffing.unknownRoles).toHaveLength(6)
      expect(row).toMatchObject({economicExpenseId:'GROUP_ADMIN_COMPANY_SINGLE_POOL',employeeReferenceMonth:'2026-10',
        endpointsAreAlternativesNotAdditive:true,oneEmployeeBaselineAddedAgain:false,vacationWagesAddedAgain:false,
        salaryProratedByShorterShift:false,mixesCalendarMonthContributionsWithAnnualAccrual:true,
        sundayHolidayPremiumAndEmployerEffectsMxn:null,completeMonthlyAdminEmployerCostMxn:null,
        actualFleetQuantity:null,monitoredUnitsPerSeat:null,allocationShares:null,resourceCostAllocationMxn:null,
        coversContinuousOperations:false,fxConversionPerformed:false,eligibleForBudget:false,selected:false})
    }
    expect(summary.supportingFacilityStaffing.staffingContrasts[0].knownSalaryComponentsOnly).toBe(15000)
    expect(summary.authoritativeBudget.completeRows).toBe(2)
    expect(summary.adoptedValues).toBe(0)
    expect(Object.values(summary.outputs).every(v => v === null)).toBe(true)
  })
  it('fails closed on changed LFT coverage archive', () => {
    expect(() => consolidateBinationalReferenceBudget(readLocalDocument,file => file.endsWith('LFT_COVERAGE_REVIEW_20261001.pdf')
      ? new Uint8Array([9,9,9]) : readLocalDocumentBytes(file))).toThrow('SOURCE_ARCHIVE_HASH_MISMATCH:LFT_COVERAGE_2026')
  })
  it('adds employer class V risk once, preserves remuneration-based ISN and historical sources', () => {
    const rows=summary.insuranceEmployerReferences.mxEmployerRiskContrasts
    for (const [i,row] of rows.entries()) {
      const wage=summary.insuranceEmployerReferences.mxEmployerContrasts[i]
      const tax=summary.insuranceEmployerReferences.nlPayrollTaxContrasts[i]
      const risk=wage.monthlySalaryMxn/30*383/365*31*.0758875
      expect(row.workRiskContributionMxn).toBeCloseTo(risk,9)
      expect(row.conditionalPlanningComponentSumMxn).toBeCloseTo(tax.conditionalPlanningComponentSumMxn+risk,9)
      expect(row).toMatchObject({referenceRate:.0758875,riskClass:'V',registrationBasis:'NEW_REGISTRATION_CLASS_V_REFERENCE',
        administrativeEmployeeNotDriver:true,entireGroupPayrollEstablished:false,classifiedByEmployeeOccupation:false,
        actualEmployerRateEstablished:false,advertisedGrossNetConfirmed:false,completeMonthlyEmployerCostMxn:null,eligibleForBudget:false})
      expect(wage.workRiskContributionMxn).toBeNull()
      expect(wage.statePayrollTaxMxn).toBeNull()
      expect(tax.monthlyTaxDueMxn).toBeNull()
    }
    expect(summary.authoritativeBudget.completeRows).toBe(2)
    expect(Object.values(summary.outputs).every(v=>v===null)).toBe(true)
  })
  it.each(['LSS_RISK_REVIEW_20261001.pdf','RACERF_RISK_REVIEW_20261001.pdf'])('fails closed on altered risk source %s', name => {
    const sourceId=name.startsWith('LSS')?'LSS_RISK_2026':'RACERF_RISK_CLASS'
    expect(()=>consolidateBinationalReferenceBudget(readLocalDocument,file=>file.endsWith(name)
      ? new Uint8Array([1,2,3]) : readLocalDocumentBytes(file))).toThrow(`SOURCE_ARCHIVE_HASH_MISMATCH:${sourceId}`)
  })
  it('joins NL annual tax accrual once without rewriting historical unknown monthly ISN', () => {
    const rows=summary.insuranceEmployerReferences.nlPayrollTaxContrasts
    expect(rows.map(r=>r.meanMonthTaxAccrualMxn)).toEqual([472.5,504])
    for(const [i,row] of rows.entries()) {
      const employer=summary.insuranceEmployerReferences.mxEmployerContrasts[i]
      expect(row.conditionalPlanningComponentSumMxn).toBeCloseTo(employer.conditionalComponentSumMxn+row.meanMonthTaxAccrualMxn,9)
      expect(row.annualAguinaldoMxn).toBe(employer.annualAguinaldoMxn)
      expect(row.annualVacationPremiumMxn).toBe(employer.annualVacationPremiumMxn)
      expect(row).toMatchObject({referenceRate:.03,employerContributionReferenceMonth:'2026-10',monthlyTaxDueMxn:null,
        completeMonthlyEmployerCostMxn:null,combinesCalendarMonthContributionsWithAnnualBenefitAndTaxAccrual:true,
        advertisedGrossNetConfirmed:false,eligibleForBudget:false,selected:false})
      expect(employer.statePayrollTaxMxn).toBeNull()
    }
    expect(summary.adoptedValues).toBe(0)
    expect(summary.authoritativeBudget.completeRows).toBe(2)
    expect(Object.values(summary.outputs).every(v=>v===null)).toBe(true)
  })
  it('rejects changes to the visually reviewed NL official binary archive', () => {
    expect(()=>consolidateBinationalReferenceBudget(readLocalDocument,file=>file.endsWith('NL_RECONDUCCION_20260101.pdf')
      ? new Uint8Array([1,2,3]) : readLocalDocumentBytes(file))).toThrow('SOURCE_ARCHIVE_HASH_MISMATCH:NL_RECONDUCCION_2026')
  })
  it('joins two MX wage counterfactuals without changing the original gross/net evidence', () => {
    const rows=summary.insuranceEmployerReferences.mxEmployerContrasts
    expect(rows.map(r => r.monthlySalaryMxn)).toEqual([15000,16000])
    expect(rows.map(r => r.meanMonthBenefitAccrualMxn)).toEqual([750,800])
    for(const r of rows) {
      expect(r).toMatchObject({month:'2026-10',coveredDays:31,sourceLocation:'General Escobedo, Nuevo Leon',
        advertisedGrossNetConfirmed:false,compensationBasis:'GROSS_FIXED_WAGES_ONLY_HYPOTHESIS',
        workRiskContributionMxn:null,statePayrollTaxMxn:null,completeMonthlyEmployerCostMxn:null,eligibleForBudget:false})
      expect(r.conditionalComponentSumMxn).toBeCloseTo(r.monthlySalaryMxn+r.meanMonthBenefitAccrualMxn+r.knownContributionComponentMxn,8)
    }
    expect(summary.authoritativeBudget.completeRows).toBe(2)
    expect(summary.adoptedValues).toBe(0)
    expect(Object.values(summary.outputs).every(v => v === null)).toBe(true)
  })
  it('integrates insurance normalization and employer tax components without completing insurance/payroll',() => {
    const result=summary.insuranceEmployerReferences
    expect(result.usInsuranceNormalized).toMatchObject({basis:'MONTHLY_AVERAGE',monthlyMoneyReference:926,annualMoneyEquivalent:11112,termMonths:null})
    expect(result.usEmployerContrast.employees.map(r => r.id)).toEqual(['DISPATCHER','BILLING_ADMIN'])
    expect(result.usEmployerContrast.annualKnownEmployerTaxComponentUsd).toBeCloseTo((54740+51070)*0.0765,8)
    expect(result.usEmployerContrast.meanMonthKnownEmployerTaxComponentUsd).toBeCloseTo(674.53875,8)
    expect(result.mxEmployer.monthlyEmployerTotalMxn).toBeNull()
    expect(result).toMatchObject({normalizationImplementedInResearchOnly:true,activePublishedEngineChanged:false,completeMonthlyInsuranceUsd:null,completeMonthlyEmployerCostUsd:null,driverEmployerCvu:null,adoptedValues:0,eligibleForBudget:false})
    expect(summary.adoptedValues).toBe(0)
    expect(summary.authoritativeBudget.completeRows).toBe(2)
    expect(Object.values(summary.outputs).every(v => v === null)).toBe(true)
  })
  it('normalizes each alternative MX annual amount once and retains currency',() => {
    for(const row of summary.mxInsuranceAlternatives) {
      expect(row.normalization.currency).toBe('MXN')
      expect(row.normalization.monthlyMoneyReference).toBeCloseTo(row.annualGrossMxn/12,8)
      expect(row.normalization.monthlyEconomicInsurance).toBeNull()
      expect(row.packageAlternativesNotSum).toBe(true)
    }
  })
  it.each(REFERENCE_BUDGET_PINS)('rejects altered source $id', pin => {
    expect(() => consolidateBinationalReferenceBudget(file => readLocalDocument(file) + (file === pin.file ? ' ' : '')))
      .toThrow(`SOURCE_HASH_MISMATCH:${pin.id}`)
  })
  it('covers every original budget row and resolves each evidence pointer', () => {
    const worksheet = JSON.parse(readLocalDocument(REFERENCE_BUDGET_PINS.find(p => p.id === 'worksheet')!.file))
    expect(summary.budgetRows.map(r => r.economicExpenseId)).toEqual(worksheet.budget.expenses.map((e: { economicExpenseId: string }) => e.economicExpenseId))
    for (const row of summary.budgetRows) {
      expect(row.missing.length).toBeGreaterThan(0)
      if(row.economicExpenseId==='US_TRACTOR_INSURANCE') {
        expect(row.completeAmountUsdPerMonth).toBe(1055.42)
        expect(row.status).toBe('DOCUMENTED_PUBLIC_MODEL_NOT_CALIBRATED')
      } else if(row.economicExpenseId==='US_TRACTOR_CAPITAL') {
        expect(row.completeAmountUsdPerMonth).toBe(472.99)
        expect(row.status).toBe('DOCUMENTED_PUBLIC_MODEL_NOT_CALIBRATED')
      } else expect(row.completeAmountUsdPerMonth).toBeNull()
      for (const ref of row.refs) {
        const [id, pointer] = ref.split('#')
        const pin = REFERENCE_BUDGET_PINS.find(p => p.id === id)!
        expect(pointerExists(JSON.parse(readLocalDocument(pin.file)), pointer)).toBe(true)
      }
    }
  })
  it('keeps real reconciliation incomplete and all business outputs null', () => {
    expect(summary.authoritativeBudget).toMatchObject({ status: 'INCOMPLETE', completeRows: 2, monthlyFixedUsdByResource: null, monthlyGroupTotalUsd: null })
    expect(summary.authoritativeBudget.conditions).toHaveLength(11)
    expect(Object.values(summary.outputs).every(v => v === null)).toBe(true)
    expect(summary).toMatchObject({ calibrated: false, quoteReady: false, adoptedValues: 0, refreshedExternallyThisCut: false })
    expect(Object.values(summary.externalChanges).every(v => v === false)).toBe(true)
  })
  it.each(summary.mxInsuranceAlternatives)('keeps MX package $packageId gross, alternative and separate from USD', p => {
    expect(p.monthlyGrossEquivalentMxn * 12).toBeCloseTo(p.annualGrossMxn, 8)
    expect(p).toMatchObject({ selected: false, eligibleForBudget: false, includesVatFeeAndDiscount: true, packageAlternativesNotSum: true })
  })
  it.each(summary.conditionalUs.scenarios)('recomputes conditional sum and matched stress denominator $id', s => {
    const ci = JSON.parse(readLocalDocument(REFERENCE_BUDGET_PINS[0].file))
    const original = ci.usConditionalValueLoss.scenarios.find((x: { id: string }) => x.id === s.id)
    const q = .9071 ** 3 * .999 ** (82677 * s.useMultiplier * 3 / 1000)
    const loss = 40495 * (1 - q) / 36
    expect(s.grossAskingValueLossMonthlyUsd).toBeCloseTo(loss, 8)
    expect(s.grossAskingValueLossMonthlyUsd).toBe(original.askingValueLossMonthlyUsd)
    expect(s.conditionalComponentSumUsdPerMonth).toBeCloseTo(loss + 926, 8)
    expect(s.monthlyKmReference).toBeCloseTo(82677 * s.useMultiplier * 1.609344 / 12, 8)
    expect(s.monthlyOperatingDaysReference).toBeCloseTo(268 / 12, 8)
    expect(s.distanceAllocationReferenceUsdPerKm).toBeCloseTo((loss + 926) / s.monthlyKmReference, 12)
    expect(s.timeAllocationReferenceUsdPerDay).toBeCloseTo((loss + 926) / s.monthlyOperatingDaysReference, 12)
    expect(s).toMatchObject({ classification: 'CROSS_COHORT_COUNTERFACTUAL_NOT_OBSERVED_BUDGET', isMinimumCost: false, eligibleForBudget: false, selected: false })
  })
  it('exposes coherent sensitivity, not fixed budget divided by unrelated changing use', () => {
    const [less, base, more] = summary.conditionalUs.scenarios
    expect(less.conditionalComponentSumUsdPerMonth).toBeLessThan(base.conditionalComponentSumUsdPerMonth)
    expect(base.conditionalComponentSumUsdPerMonth).toBeLessThan(more.conditionalComponentSumUsdPerMonth)
    expect(less.distanceAllocationReferenceUsdPerKm).toBeGreaterThan(base.distanceAllocationReferenceUsdPerKm)
    expect(base.distanceAllocationReferenceUsdPerKm).toBeGreaterThan(more.distanceAllocationReferenceUsdPerKm)
    expect(summary.conditionalUs.missingCapitalAdjustment).toContain('capitalizableAcquisitionUsd - 40495 + disposalCostUsd')
  })
  it.each([{ km: 1000, days: 1 }, { km: 1, days: 2 }])('uses max, not sum, in a synthetic trip $km km / $days days', trip => {
    // Synthetic allocation demonstration only; not DF-Fort Smith distance or cycle.
    const s = summary.conditionalUs.scenarios[1]
    const distance = s.distanceAllocationReferenceUsdPerKm * trip.km
    const time = s.timeAllocationReferenceUsdPerDay * trip.days
    const allocation = allocateFixedCost(distance, time)
    expect(allocation).toBeCloseTo(s.conditionalComponentSumUsdPerMonth * Math.max(trip.km / s.monthlyKmReference, trip.days / s.monthlyOperatingDaysReference), 8)
    expect(allocation).toBeLessThan(distance + time)
  })
  it('keeps one unknown box exposure rather than borrowing a tractor denominator or charging per leg', () => {
    expect(summary.exposureAndAllocation.sharedTrailer).toEqual({ monthlyKm: null, monthlyProductiveDays: null, shares: null, rule: 'ONE_BOX_WHOLE_CYCLE_THEN_ALLOCATE_NOT_MAX_PER_LEG' })
    expect(summary.registrationReferences.trailerTokenBase).toMatchObject({ annualUsd: 15, monthlyBaseUsd: 1.25, fullMonthlyPermitUsd: null, eligibleProfile: null, chargedPerLeg: false })
    expect(summary.budgetRows.filter(r => r.family === 'ADMIN_AND_COMPANY')).toHaveLength(1)
    expect(summary.exposureAndAllocation).toMatchObject({ diagnosticOnly: true, routeCycleInvented: false })
  })
  it('keeps both historical contrasts unselected and does not relabel operating days as productive days', () => {
    expect(summary.exposureAndAllocation.mxHistoricalContrast).toEqual({ monthlyKm: 10000, monthlyOperatingDays: 25, isCurrentDryVanBenchmark: false, selected: false })
    expect(summary.exposureAndAllocation.usHistoricalContrast).toMatchObject({ isCurrentDryVanBenchmark: false, selected: false })
    expect(summary.exposureAndAllocation.usHistoricalContrast.monthlyKm).toBeCloseTo(82677 * 1.609344 / 12, 8)
  })
  it('keeps UCR per entity/year unallocated and authority opening costs nonrecurring', () => {
    expect(summary.registrationReferences.ucrAlternatives).toHaveLength(12)
    for (const row of summary.registrationReferences.ucrAlternatives) {
      expect(row.monthlyEntityReferenceUsd * 12).toBeCloseTo(row.annualUsd, 8)
      expect(row).toMatchObject({ unit: 'USD/entity-average-month', selected: false, eligibleForResourceBudget: false })
    }
    expect(summary.registrationReferences).toMatchObject({ authorityOpeningEventUsd: 300, authorityMonthlyRecurringUsd: null, ucrAllocatedMonthlyUsd: null })
  })
  it('normalizes only the conditional recurring non-logging HVUT component', () => {
    const hvut = summary.registrationReferences.hvut
    expect(hvut.recurringAnnualReferenceUsd).toBe(550)
    expect(hvut.recurringAverageMonthReferenceUsd).toBeCloseTo(550 / 12, 12)
    expect(hvut).toMatchObject({ conditionalCategory: 'V', conditionalVehicleTaxableWeightLb: 80000,
      weightIsModelAssumptionNotVerifiedTaxableWeight: true, selected: false, eligibleForResourceBudget: false,
      fullMonthlyPermitUsd: null, completeMonthlyComplianceUsd: null, actualSelectedTaxUsd: null })
    expect(summary.budgetRows.find(r => r.economicExpenseId === 'US_TRACTOR_PERMITS')!.completeAmountUsdPerMonth).toBeNull()
  })
  it('preserves all 59 APVD jurisdictions and the published 2026 denominator, not just trip states', () => {
    const irp = summary.registrationReferences.irpPublicModel
    expect(irp.jurisdictionCount).toBe(59)
    expect(irp.publishedDistanceTotal).toBe(82631)
    expect(new Set(irp.jurisdictions.map(row => row.id)).size).toBe(59)
    expect(irp.jurisdictions.reduce((sum, row) => sum + row.distance, 0)).toBe(82631)
    expect(irp.jurisdictions.reduce((sum, row) => sum + row.distanceShare, 0)).toBeCloseTo(1, 12)
    expect(irp.jurisdictions.find(row => row.id === 'TX')).toMatchObject({ distance: 35179 })
    expect(irp.jurisdictions.find(row => row.id === 'AR')).toMatchObject({ distance: 2897 })
    expect(irp.jurisdictions.find(row => row.id === 'NL')).toMatchObject({ distance: 0, distanceShare: 0,
      nativeAnnualBaseCad:2193, conditionalAnnualComponentUsd:0,completeJurisdictionFee:false })
    expect(irp.distanceBasis).toMatchObject({ applicationEffectiveYear: 2026, routeLegPercentagesUsed: false,
      actualFleetHasNoDistance: null, selectedForPilot: false })
  })
  it('computes a Texas component including conditional TERP, not an unapportioned full IRP bill', () => {
    const irp = summary.registrationReferences.irpPublicModel
    const texas = irp.jurisdictions.find(row => row.id === 'TX')!
    expect(texas.fullAnnualBaseUsd).toBe(840)
    expect(texas.apportionedAnnualBaseUsd).toBeCloseTo(840 * 35179 / 82631, 10)
    expect(texas.conditionalAnnualTerpUsd).toBeCloseTo(84 * 35179 / 82631, 10)
    expect(irp.conditionalTexasAnnualComponentUsd).toBeCloseTo(393.3801599883821, 10)
    expect(irp.conditionalTexasMeanMonthComponentUsd).toBeCloseTo(32.781679999031844, 10)
    expect(irp.conditionalTexasAnnualComponentUsd).not.toBe(840)
    expect(irp.texasFeeAssumptions).toMatchObject({ analyticalTermMonths: 12,
      registeredWeightIsNotHvutTaxableWeight: true, terpAllocationIsAnalyticalNotInvoice: true,
      cashInvoiceRoundingAndProration: null, selected: false, eligibleForBudget: false })
  })
  it('does not silently zero unresolved jurisdiction rates or infer a complete budget', () => {
    const irp = summary.registrationReferences.irpPublicModel
    expect(irp.missingFeeJurisdictionIds).toHaveLength(3)
    expect(irp.missingFeeJurisdictionIds).not.toContain('NL')
    for (const row of irp.jurisdictions.filter(row => irp.missingFeeJurisdictionIds.includes(row.id))) {
      expect(row).toMatchObject({ fullAnnualBaseUsd: null, apportionedAnnualBaseUsd: null,
        conditionalAnnualTerpUsd: null, conditionalAnnualComponentUsd: null, feeCurrencyOrConversionConfirmed: false })
    }
    expect(irp).toMatchObject({ fullIrpAnnualUsd: null, fullMonthlyPermitUsd: null, actualInvoiceUsd: null,
      knownComponentIsTotalOrMinimum: false })
    expect(summary.authoritativeBudget.completeRows).toBe(2)
    expect(summary.adoptedValues).toBe(0)
    expect(Object.values(summary.outputs).every(v => v === null)).toBe(true)
  })
  it('does not turn public apportionment into actual registrant, productive capacity or box charges', () => {
    expect(summary.registrationReferences.irpPublicModel).toMatchObject({ actualBaseJurisdiction: null,
      eligibilityConfirmed: false, appliedToPilot: false, distanceTableIsCapacity: false,
      newFleetAssumedFromUsedAssetPurchase: false, weightSelectedForHvut: false,
      chargedToSharedTrailer: false, chargedPerNationalLeg: false })
    expect(summary.registrationReferences.hvut.actualSelectedTaxUsd).toBeNull()
    expect(summary.registrationReferences.ucrAllocatedMonthlyUsd).toBeNull()
    expect(summary.registrationReferences.trailerTokenBase.monthlyBaseUsd).toBe(1.25)
  })
  it('keeps the 59 dated test invoices separate from APVD and the pilot', () => {
    const irp = summary.registrationReferences.irpPublicModel
    const test = irp.officialFeeTestContrast
    expect(test.rows).toHaveLength(59)
    expect(new Set(test.rows.map((r: { id: string }) => r.id)).size).toBe(59)
    expect(test.registrationOnlyTestSubtotalUsd).toBeCloseTo(2021.47, 8)
    expect(test).toMatchObject({ workbookTab: 'Fee Test 2', effectiveDate: '2026-01-01',
      operation: 'HAUL_FOR_HIRE', totalDistance: 59000, termMonths: 12,
      reweightedToApvd: false, roundedInvoiceMultipliedBy59AsFullRate: false,
      usdColumnAlreadyConverted: true, additionalCurrencyConversionApplied: false,
      isCurrentPilotEstimate: false, isApvdSubtotal: false, budgetEligible: false,
      administrativeAndMiscFeesIncluded: false, completePermitBudget: false })
    expect(test.vehicle).toMatchObject({ year: 2022, make: 'Kenworth', purchasePriceUsd: 136000 })
    expect(test.staleInternalCaption).toBe('Invoice Amount Fee Test 1')
    expect(irp.fullIrpAnnualUsd).toBeNull()
  })
  it.each([['AR', 1553, 0], ['OK', 948, 100]] as const)('uses underlying %s rules without rescaling rounded test invoices', (id, base, extra) => {
    const row = summary.registrationReferences.irpPublicModel.jurisdictions.find(r => r.id === id)!
    expect(row.fullAnnualBaseUsd).toBe(base)
    expect(row.apportionedAnnualBaseUsd).toBeCloseTo(base * row.distanceShare, 10)
    expect(row.additionalAnalyticalComponentUsd).toBeCloseTo(extra * row.distanceShare, 10)
    expect(row.conditionalAnnualComponentUsd).toBeCloseTo((base + extra) * row.distanceShare, 10)
    expect(row).toMatchObject({ conditionalAnnualTerpUsd: null, invoiceRoundingConfirmedForApvd: false,
      effectiveDateOfReference: '2026-01-01', selected: false, appliedToPilot: false })
    if (id === 'OK') expect(row.conditionalAnnualComponentUsd).not.toBeCloseTo(17.7 * 59 * row.distanceShare, 4)
  })
  it('preserves reporter currency conflicts and does not interpret self USD zero as exemption', () => {
    const test = summary.registrationReferences.irpPublicModel.officialFeeTestContrast
    expect(test.matrixDisagreements.find((r: { id: string }) => r.id === 'MB')).toMatchObject({ selfUsdColumnB: 0, selfCadColumnC: 138.95, texasInvoiceUsd: 100.93 })
    expect(test.matrixDisagreements.find((r: { id: string }) => r.id === 'NL')).toMatchObject({ selfUsdColumnB: 37.15, selfCadColumnC: 37.15, texasInvoiceUsd: 26.89 })
    expect(summary.registrationReferences.irpPublicModel.jurisdictions.find(r => r.id === 'MB')!.conditionalAnnualComponentUsd).toBeNull()
  })
  it('does not transfer California test vehicle value to the Ryder asking reference', () => {
    const irp = summary.registrationReferences.irpPublicModel
    expect(irp.californiaValueDependency).toMatchObject({ testPurchasePriceUsd: 136000,
      roundedTestValueUsd: 136100, vlfFraction: 0.0065, testVlfUsd: 885, transferToRyder40495Confirmed: false })
    expect(irp.jurisdictions.find(r => r.id === 'CA')!.conditionalAnnualComponentUsd).toBeNull()
    expect(summary.adoptedValues).toBe(0)
    expect(Object.values(summary.outputs).every(v => v === null)).toBe(true)
  })
  it.each([
    ['AL',815,0], ['AZ',3957,0], ['CT',1546,0], ['DE',1390,0], ['GA',725,275],
    ['IL',2890,0], ['IN',1692,540], ['IA',1695,0], ['KS',1870,400], ['LA',504,0],
    ['MO',1050.5,669], ['OH',1395,0], ['TN',1386.5,0],
  ] as const)('projects dated %s base and separate components without calling it a complete fee', (id, base, extra) => {
    const row = summary.registrationReferences.irpPublicModel.jurisdictions.find(r => r.id === id)!
    expect(row.fullAnnualBaseUsd).toBe(base)
    expect(row.additionalAnalyticalComponentUsd).toBeCloseTo(extra * row.distanceShare, 10)
    expect(row.conditionalAnnualComponentUsd).toBeCloseTo((base + extra) * row.distanceShare, 10)
    expect(row).toMatchObject({ ruleSourceRef:'irpUsBatch#/rules', completeJurisdictionFee:false,
      currentFeeConfirmed:false, unknownOtherFeesAssumedZero:false, selected:false, appliedToPilot:false })
  })
  it('preserves the hire-vs-private difference and dated/fuel-specific rule conditions', () => {
    const batch = summary.registrationReferences.irpPublicModel.usRuleBatch
    expect(batch.knownJurisdictionComponentCount).toBe(35)
    const rows = batch.rules as (Record<string, unknown> & { id:string })[]
    expect(rows.find(r => r.id === 'GA')).toMatchObject({ baseRegistrationUsd:725, privateCarrierBaseUsdNotUsed:400, operation:'HAUL_FOR_HIRE' })
    expect(rows.find(r => r.id === 'AZ')).toMatchObject({ fuel:'DIESEL', minimumModelYear:1979 })
    expect(rows.find(r => r.id === 'KS')).toMatchObject({ lastFeeChangeDateInSource:'2021-08-01' })
    expect(rows.find(r => r.id === 'OH')).toMatchObject({ feeScheduleDateInSource:'2018-01-01', currentFeeConfirmed:false })
  })
  it('keeps KY value-inclusive rule distinct from plate-only reporter and excludes generic FL mapping', () => {
    const irp = summary.registrationReferences.irpPublicModel
    expect(irp.usRuleBatch.excludedDependentRules.find((r:{id:string}) => r.id === 'KY')).toMatchObject({
      exampleAdValoremUsd:330.19, exampleRuleTotalUsd:30.01, texasReporterInvoiceUsd:24.41,
      onlyPlateReporterVsValueInclusiveRuleConflict:true, usedForPilot:false })
    expect(irp.usRuleBatch.excludedDependentRules.find((r:{id:string}) => r.id === 'FL')).toMatchObject({ explicitTest2OperationMapping:false })
    expect(irp.jurisdictions.find(r => r.id === 'FL')!.conditionalAnnualComponentUsd).toBeNull()
    for (const id of ['KY','CA']) expect(irp.jurisdictions.find(r => r.id === id)!.conditionalAnnualComponentUsd).toBeNull()
    expect(irp.fullIrpAnnualUsd).toBeNull()
    expect(summary.authoritativeBudget.completeRows).toBe(2)
    expect(summary.adoptedValues).toBe(0)
  })
  it.each([
    ['DC',2325,0], ['MD',1820,10], ['MA',1600,0], ['MI',1992,0], ['MN',1760,0],
    ['MT',750,264.75], ['NH',873.48,0], ['NJ',1223,0], ['NM',172.27,0], ['NY',968,240],
    ['NC',2205,0], ['ND',1059,0], ['OR',998,0], ['PA',2754,180], ['RI',1044,0],
    ['SD',1457,0], ['VA',1888,0], ['WA',1830,291], ['WI',2834,0],
  ] as const)('projects %s weight components independently of reporter rounding', (id, base, extra) => {
    const row=summary.registrationReferences.irpPublicModel.jurisdictions.find(r => r.id === id)!
    expect(row.fullAnnualBaseUsd).toBe(base)
    expect(row.additionalAnalyticalComponentUsd).toBeCloseTo(extra*row.distanceShare,10)
    expect(row.conditionalAnnualComponentUsd).toBeCloseTo((base+extra)*row.distanceShare,10)
    expect(row).toMatchObject({ ruleSourceRef:'irpUsWeightRules#/rules', currentFeeConfirmed:false,
      completeJurisdictionFee:false, unknownOtherFeesAssumedZero:false, invoiceRoundingConfirmedForApvd:false,
      selected:false, appliedToPilot:false })
  })
  it('preserves model-year, quarterly period, share and invoice inconsistencies', () => {
    const batch=summary.registrationReferences.irpPublicModel.usWeightRuleBatch
    expect(batch.knownJurisdictionComponentCount).toBe(35)
    const rows=batch.rules as (Record<string,unknown> & {id:string})[]
    expect(rows.find(r => r.id === 'MN')).toMatchObject({ minimumModelYear:2020,maximumModelYear:2026 })
    expect(rows.find(r => r.id === 'OR')).toMatchObject({ registrationQuarters:4,quarterlyProrationIsMonthlyProration:false })
    expect(rows.find(r => r.id === 'NC')).toMatchObject({ publishedTestShare:0.0169,
      testShareTimesBaseUsd:37.2645,publishedTestFeeUsd:37.37,testShareInconsistencyResolved:false,publishedTestShareUsedForApvd:false })
    expect(rows.find(r => r.id === 'ND')).toMatchObject({ publishedTestFeeUsd:18,testUnroundedFeeUsd:17.95005,invoiceRoundingConfirmedForApvd:false })
  })
  it('keeps unmapped or internally conflicting registration bases unresolved', () => {
    const irp=summary.registrationReferences.irpPublicModel
    const expected=['ID','UT','VT']
    expect([...irp.missingFeeJurisdictionIds].sort()).toEqual([...expected].sort())
    expect(irp.usWeightRuleBatch.excludedOrDependentRules.find((r:{id:string}) => r.id === 'ID')).toMatchObject({ hirePrivateLabelConflict:true })
    expect(irp.usWeightRuleBatch.excludedOrDependentRules.find((r:{id:string}) => r.id === 'VT')).toMatchObject({ sourceInternallyInconsistent:true })
    expect(irp.fullIrpAnnualUsd).toBeNull()
    expect(summary.authoritativeBudget.completeRows).toBe(2)
    expect(summary.adoptedValues).toBe(0)
    expect(Object.values(summary.outputs).every(v => v === null)).toBe(true)
  })
  it.each([['CA',1942],['CO',2350],['KY',1440],['MS',1512],['NV',1360],['SC',800],['WV',1131.25],['WY',907.5]] as const)(
    'separates %s registration reference from unresolved charges and pilot compatibility', (id,base) => {
      const row=summary.registrationReferences.irpPublicModel.jurisdictions.find(r => r.id === id)!
      expect(row.fullAnnualBaseUsd).toBe(base)
      expect(row.apportionedAnnualBaseUsd).toBeCloseTo(base*row.distanceShare,10)
      expect(row.conditionalAnnualComponentUsd).toBeNull()
      expect(row.additionalAnalyticalComponentUsd).toBeNull()
      expect(row.registrationOnlyDependencies).toBeTruthy()
      expect(row).toMatchObject({registrationOnlyReference:true,registrationOnlyCompatibleWithPilotConfirmed:false,
        ruleSourceRef:'irpSeparableRegistration#/rules',currentFeeConfirmed:false,completeJurisdictionFee:false,
        unknownOtherFeesAssumedZero:false,selected:false,appliedToPilot:false})
    })
  it('retains California and Colorado extras without pretending dependent value charges are zero', () => {
    const irp=summary.registrationReferences.irpPublicModel
    const ca=irp.jurisdictions.find(r => r.id === 'CA')!
    expect(ca.separatePublishedCharges.map(r => r.annualUsd)).toEqual([118,122,3])
    const co=irp.jurisdictions.find(r => r.id === 'CO')!
    expect(co.separatePublishedCharges.map(r => r.annualUsd)).toEqual([32,39])
    expect(co.registrationOnlyDependencies).toContain('0.165')
    expect(irp.separableRegistration.completePermitUsd).toBeNull()
    expect(summary.authoritativeBudget.completeRows).toBe(2)
    expect(summary.adoptedValues).toBe(0)
    expect(Object.values(summary.outputs).every(v => v === null)).toBe(true)
  })
  it.each([['FL',1322],['NE',1340]] as const)('links %s statutory reference without completing a permit', (id,base) => {
    const irp=summary.registrationReferences.irpPublicModel
    const row=irp.jurisdictions.find(r => r.id === id)!
    expect(row.fullAnnualBaseUsd).toBe(base)
    expect(row.apportionedAnnualBaseUsd).toBeCloseTo(base*row.distanceShare,10)
    expect(row).toMatchObject({ruleSourceRef:'irpStateReferences#/rules',registrationOnlyReference:true,
      registrationOnlyCompatibleWithPilotConfirmed:false,conditionalAnnualComponentUsd:null,
      currentFeeConfirmed:false,completeJurisdictionFee:false,selected:false,appliedToPilot:false})
    expect(irp.stateReferenceReconciliation.completeIrpUsd).toBeNull()
    expect(irp.stateReferenceReconciliation.actualFeeUsd).toBeNull()
  })
  it('derives Nebraska from the post2024 statute, not the reporter or old35 rate', () => {
    const state=summary.registrationReferences.irpPublicModel.stateReferenceReconciliation
    const rule=state.rules.find(r => r.id === 'NE')!
    expect(rule.baseRegistrationUsd).toBe(80000/2000*33.5)
    expect(rule.effectiveDateOfReference).toBe('2024-07-01')
    const contrasts=state.exerciseContrasts as {id:string;rawReferenceComponentUsd:number;reporterUsedToDeriveBase:boolean}[]
    expect(contrasts.find(r => r.id === 'NE')).toMatchObject({rawReferenceComponentUsd:22.713,reporterUsedToDeriveBase:false})
    expect(contrasts.find(r => r.id === 'FL')).toMatchObject({rawReferenceComponentUsd:22.4079,reporterUsedToDeriveBase:false})
    expect(summary.registrationReferences.irpPublicModel.jurisdictions.find(r => r.id === 'FL')!.effectiveDateOfReference).toBeNull()
  })
  it('rejects altered Florida original even when the derived artifact pin matches', () => {
    const source=summary.registrationReferences.irpPublicModel.stateReferenceReconciliation.sources.find((r:{id:string}) => r.id === 'FL_320_08_2025')
    expect(() => consolidateBinationalReferenceBudget(file => readLocalDocument(file)+(file === source.archive.file ? ' ' : '')))
      .toThrow('SOURCE_ARCHIVE_HASH_MISMATCH:FL_320_08_2025')
  })
  it('preserves unresolved state blocks and distinguishes web observation from original archive', () => {
    const state=summary.registrationReferences.irpPublicModel.stateReferenceReconciliation
    expect(state.retainedBlocks.map((r:{id:string}) => r.id)).toEqual(['ID','UT','VT'])
    for(const source of state.sources.filter((r:{id:string}) => r.id.startsWith('NE_'))) {
      expect(source).toMatchObject({archive:null,evidenceType:'OFFICIAL_WEB_READER_OBSERVATION_NOT_ORIGINAL_ARCHIVE',currentAsOfServiceDateConfirmed:false})
    }
    expect(summary.adoptedValues).toBe(0)
    expect(summary.authoritativeBudget.completeRows).toBe(2)
    expect(Object.values(summary.outputs).every(v => v === null)).toBe(true)
  })
  it.each([['AB',1809],['BC',2039],['MB',2003],['NB',2121],['NL',2193],['NS',2356],['ON',2603],['PE',1634],['QC',2889],['SK',2204]] as const)(
    'projects %s CAD registration base with exactly one dated conversion', (id,cad) => {
      const row=summary.registrationReferences.irpPublicModel.jurisdictions.find(r => r.id === id)!
      expect(row.nativeAnnualBaseCad).toBe(cad)
      expect(row.fullAnnualBaseUsd).toBeCloseTo(cad*0.7235,10)
      expect(row.apportionedAnnualBaseUsd).toBeCloseTo(cad*row.distanceShare*0.7235,10)
      expect(row).toMatchObject({ruleSourceRef:'irpCurrencyValue#/registrationRules',currencyConversionIsCurrent:false,
        completeJurisdictionFee:false,currentFeeConfirmed:false,unknownOtherFeesAssumedZero:false,appliedToPilot:false})
      if(['BC','MB','SK'].includes(id)) expect(row.conditionalAnnualComponentUsd).toBeNull()
    })
  it.each(['BC','MB','SK','CO','ME','NV','SC','WV'])('reproduces %s value charge only as the official test contrast', id => {
    const value=summary.registrationReferences.irpPublicModel.currencyValueReferences.valueTestContrasts.find(r => r.id === id)!
    expect(value.roundedTestNativeCents).toBeCloseTo(Math.round(value.publishedTestCharge*100)/100,8)
    expect(value).toMatchObject({pilotValueChargeUsd:null,appliedToPilot:false,eligibleForBudget:false,referenceAskingPriceSubstituted:false})
    if(id === 'SK') expect(value.historicalUnroundedUsdContrast).toBeCloseTo(value.apportionedTestNative*0.7235,10)
    else expect(value.historicalUnroundedUsdContrast).toBe(value.apportionedTestNative)
    if(id === 'NV') {expect(value.annualRaw).toBeCloseTo(927.78,8);expect(value.annualAfterSourceRounding).toBe(928)}
    if(id === 'SC') expect(value).toMatchObject({valueMultiplier:0.9,timeFactor:1})
  })
  it('keeps distinct AB, ON and QC rounding paths without generalizing actual invoices', () => {
    const currency=summary.registrationReferences.irpPublicModel.currencyValueReferences
    expect(currency.knownRegistrationBaseJurisdictionCount).toBe(56)
    expect(currency.unresolvedCadValueIds).toEqual(['BC','MB','SK'])
    expect(currency.roundingTestContrasts.find(r => r.id === 'AB')!.sourcePathUsd).toBe(22)
    expect(currency.roundingTestContrasts.find(r => r.id === 'ON')!.sourcePathUsd).toBe(32.56)
    expect(currency.roundingTestContrasts.find(r => r.id === 'QC')!.sourcePathUsd).toBeCloseTo(35.453295709427678,10)
    expect(currency).toMatchObject({invoiceRoundingGeneralized:false,completeCadFeesUsd:null,pilotValueChargesUsd:null})
    expect(currency.fx).toMatchObject({referenceDate:'2026-01-20',isCurrentFx:false,usdReporterColumnConvertedAgain:false})
  })
  it('preserves NB, NL and QC discrepancies without substituting current FX or pilot values', () => {
    const currency=summary.registrationReferences.irpPublicModel.currencyValueReferences
    const rows=currency.registrationRules as (Record<string,unknown> & {id:string})[]
    expect(rows.find(r => r.id === 'NB')).toMatchObject({sourceExampleFx:0.7423,instructionFx:0.7235,fxConflictResolved:false})
    expect(rows.find(r => r.id === 'NL')).toMatchObject({sourceExampleShare:0.01694,instructionShare:0.01695,shareConflictResolved:false})
    expect(rows.find(r => r.id === 'QC')).toMatchObject({combinationAxles:5,reporterConflictResolved:false,texasReporterUsd:34.75})
    expect(summary.adoptedValues).toBe(0)
    expect(summary.authoritativeBudget.completeRows).toBe(2)
    expect(Object.values(summary.outputs).every(v => v === null)).toBe(true)
  })
  it('matches the public value profile without equating asking to actual purchase or MSRP', () => {
    const profile=summary.registrationReferences.irpPublicModel.assetValueProfile
    expect(profile.asset).toMatchObject({modelYear:2021,askingUsd:40495,askingExcludesTaxesAndFees:true,
      purchasePriceUsd:null,capitalizableAcquisitionUsd:null,msrpUsd:null,actualTaxableValueUsd:null,purchaseDate:null})
    expect(profile).toMatchObject({askingIsMsrp:false,askingIsConfirmedTaxableValue:false,completeValueChargesUsd:null})
    expect(profile.blockedBases.find((r:{id:string}) => r.id === 'KY')).toMatchObject({purchaseYearKnown:false})
  })
  it('uses the 2021-and-older Maine chart without transferring the 2022 factor or closing its fee', () => {
    const irp=summary.registrationReferences.irpPublicModel
    const value=irp.assetValueProfile.purchaseSensitivities.find(r => r.id === 'ME')!
    expect(value.factor).toBe(0.004)
    expect(value.annualChargeNative).toBeCloseTo(161.98,10)
    expect(value.annualChargeNative).not.toBeCloseTo(40495*0.0065,8)
    expect(irp.jurisdictions.find(r => r.id === 'ME')).toMatchObject({fullAnnualBaseUsd:837,
      conditionalAnnualComponentUsd:null,valueChargeUnresolved:true,ruleSourceRef:'irpAssetValue#/maine'})
  })
  it.each(['ME','BC','MB','SK','SC'])('keeps %s purchase-based contrast conditional and separate from the fixed budget', id => {
    const value=summary.registrationReferences.irpPublicModel.assetValueProfile.purchaseSensitivities.find(r => r.id === id)!
    expect(value.unroundedApvdUsdContrast).toBeCloseTo(value.historicalAnnualUsdContrast*value.distanceShare,10)
    expect(value).toMatchObject({actualPurchaseUsd:null,actualTaxableValue:null,actualValueChargeUsd:null,
      askingEqualsPurchaseIsExplicitHypothesis:true,invoiceRoundingApplied:false,eligibleForBudget:false,appliedToPilot:false})
    if(id !== 'ME') expect(value.factorApplicableToModel2021ConfirmedInDatedChart).toBe(false)
    if(id === 'MB') expect(value.priceBasisNative).toBeCloseTo(40495*1.3821*0.7235,8)
    if(id === 'SK') expect(value.priceBasisNative).toBeCloseTo(40495*1.3821,8)
    expect(summary.authoritativeBudget.completeRows).toBe(2)
    expect(summary.adoptedValues).toBe(0)
  })
  it('rejects altered original IRP charts/manual and TERP guidance', () => {
    for (const source of summary.registrationReferences.irpPublicModel.sources as { id: string; archive: { file: string } }[]) {
      const target = source.archive.file
      expect(() => consolidateBinationalReferenceBudget(
        path => readLocalDocument(path) + (path === target ? ' ' : ''),
        path => path === target ? new Uint8Array([...readLocalDocumentBytes(path), 0]) : readLocalDocumentBytes(path),
      )).toThrow(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
    }
  })
  it('preserves the fiscal weight boundary and never selects the logging column for dry van', () => {
    const [u, v] = summary.registrationReferences.hvut.categories
    expect(u).toMatchObject({ category: 'U', maximumLbInclusive: 75000, annualNonLoggingUsd: 540 })
    expect(v).toMatchObject({ category: 'V', minimumLbExclusive: 75000, annualNonLoggingUsd: 550,
      annualLoggingUsdNotApplicableToDryVan: 412.5 })
    expect(summary.registrationReferences.hvut.recurringAnnualReferenceUsd).not.toBe(v.annualLoggingUsdNotApplicableToDryVan)
  })
  it('keeps partial-period cash separate from expense per covered month, including rounding', () => {
    const hvut = summary.registrationReferences.hvut
    expect(hvut.partialPeriodAlternatives).toHaveLength(12)
    expect(hvut.partialPeriodAlternatives.map((r: { publishedCashTaxUsd: number }) => r.publishedCashTaxUsd)).toEqual([550, 504.17, 458.33, 412.5, 366.67, 320.83, 275, 229.17, 183.33, 137.5, 91.67, 45.83])
    for (const [i, row] of hvut.partialPeriodAlternatives.entries()) {
      expect(row.coveredMonths).toBe(12 - i)
      expect(row.expensePerCoveredMonthUsd * row.coveredMonths).toBeCloseTo(row.publishedCashTaxUsd, 10)
      expect(Math.abs(row.publishedCashTaxUsd - 550 / 12 * row.coveredMonths)).toBeLessThan(.005)
      expect(row).toMatchObject({ selected: false, appliedToPilot: false })
    }
    const october = hvut.partialPeriodAlternatives[3]
    expect(october).toMatchObject({ firstUseMonth: '2026-10', coveredMonths: 9, publishedCashTaxUsd: 412.5 })
    expect(october.expensePerCoveredMonthUsd).toBeCloseTo(550 / 12, 12)
    expect(october.expensePerCoveredMonthUsd).not.toBe(412.5 / 12)
    expect(hvut.partialPeriodAlternatives[11].expensePerCoveredMonthUsd).toBe(45.83)
  })
  it('does not confuse UCR calendar years, service date, mileage history or unknown suspension with fiscal eligibility', () => {
    const hvut = summary.registrationReferences.hvut
    expect(hvut.referenceTaxPeriod).toEqual({ start: '2026-07-01', end: '2027-06-30', months: 12 })
    expect(Object.values(hvut.unknownEligibility).every(v => v === null)).toBe(true)
    expect(hvut.interpretation).toMatchObject({ foreignRegistrationIsNotAutomaticExemption: true,
      listingGvwIsNotTaxableGrossWeight: true, odometerHistoryIsNotUsHighwayTaxPeriodMiles: true,
      serviceDateIsNotFirstTaxableUseMonth: true, privateSellerPaidTaxRuleAppliedToDealerListing: false })
    expect(hvut).toMatchObject({ mixedWithUcrCalendarYear: false, appliedToPilot: false })
  })
  it('charges a taxable power unit reference once, not a second standalone box or authority opening cost', () => {
    expect(summary.registrationReferences.hvut).toMatchObject({ chargeUnit: 'SELF_PROPELLED_TAXABLE_VEHICLE',
      trailerWeightIncludedInCombination: true, standaloneTrailerCharge: false, chargedPerNationalLeg: false,
      openingAuthorityAddedToRecurringExpense: false })
    expect(summary.registrationReferences.trailerTokenBase.fullMonthlyPermitUsd).toBeNull()
    expect(summary.authoritativeBudget).toMatchObject({ status: 'INCOMPLETE', completeRows: 2 })
    expect(summary.adoptedValues).toBe(0)
    expect(Object.values(summary.outputs).every(v => v === null)).toBe(true)
  })
  it('rejects altered original IRS HTML and PDF bytes', () => {
    for (const source of summary.registrationReferences.hvut.sources as { id: string; archive: { file: string } }[]) {
      const target = source.archive.file
      expect(() => consolidateBinationalReferenceBudget(
        path => readLocalDocument(path) + (path === target ? ' ' : ''),
        path => path === target ? new Uint8Array([...readLocalDocumentBytes(path), 0]) : readLocalDocumentBytes(path),
      )).toThrow(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
    }
  })
  it('preserves the primary dry-van period columns and exact fleet-unit conversion', () => {
    const capacity = summary.supportingDryVanCapacity
    expect(capacity.observations.map(o => o.id)).toEqual(['FY2024', 'FY2025', 'H12025', 'H12026', 'Q22025', 'Q22026'])
    for (const o of capacity.observations) {
      expect(o.reportedFleetTotalKm).toBeCloseTo(o.reportedThousandTotalMiles * 1000 * 1.609344, 7)
      expect(o.reportedFleetMeanMonthKm * o.months).toBeCloseTo(o.reportedFleetTotalKm, 7)
      expect(o.distanceUnit).toBe('km/reported-mileage-population-average-month')
      expect(capacity.sources.some((s: { id: string }) => s.id === o.sourceId)).toBe(true)
    }
    expect(capacity.observations.find(o => o.id === 'FY2025')).toMatchObject({ reportedThousandTotalMiles: 163767, months: 12, reportedEmptyMilesPercent: 8.6, averageCompanyDriverTrucks: 1593, averageOwnerOperatorTrucks: 502 })
    expect(capacity.observations.find(o => o.id === 'Q22026')).toMatchObject({ reportedThousandTotalMiles: 43567, months: 3, reportedEmptyMilesPercent: 7.35, averageCompanyDriverTrucks: 1540, averageOwnerOperatorTrucks: 454 })
  })
  it('keeps empty-share arithmetic conditional rather than adding empty percent to loaded km', () => {
    for (const o of summary.supportingDryVanCapacity.observations) {
      const share = o.reportedEmptyMilesPercent / 100
      expect(o.conditionalTotalKmPerLoadedKm * (1 - share)).toBeCloseTo(1, 12)
      expect(o.conditionalTotalKmPerLoadedKm).toBeGreaterThan(1 + share)
      expect(o).toMatchObject({ physicalEmptyDefinitionConfirmed: false, appliedToPilot: false, eligibleForResourceExposure: false, monthlyKmPerTractor: null, monthlyProductiveDays: null })
    }
    expect(summary.supportingDryVanCapacity.calculationPolicy.actualTripReturnFactor).toBeNull()
  })
  it('does not turn closing stocks, non-driver employees or overlapping periods into capacity', () => {
    const capacity = summary.supportingDryVanCapacity
    expect(capacity.pointInTimeContext).toMatchObject({ asOf: '2025-12-31', operatedTrucks: 2094, trailers: 8020, isPeriodAverage: false })
    expect(capacity.closingTrailersPerOperatedTruck).toBeCloseTo(8020 / 2094, 12)
    expect(capacity.closingNonDriverEmployees).toBe(767)
    expect(capacity).toMatchObject({ closingRatioIsAverageCapacity: false, closingEmployeesUsedAsAdminFte: false, overlappingPeriodsAdded: false, joinedToForeignBudgetOrAtRiDays: false, appliedToPilot: false })
    expect(capacity.cohort).toMatchObject({ dryVanServiceConfirmed: true, ownMxUsRelayConfirmed: false, milesToCompanyOrOwnerTruckPopulationJoinConfirmed: false, selectedForPilot: false })
  })
  it('labels the web extraction honestly and does not close the economic gate', () => {
    expect(summary.supportingDryVanCapacity).toMatchObject({ captureKind: 'STRUCTURED_EXTRACTION_FROM_PRIMARY_WEB_READER_NOT_ORIGINAL_HTTP_ARCHIVE', rawHttpArchiveObtained: false, eligibleForResourceExposure: false })
    expect(summary.authoritativeBudget).toMatchObject({ status: 'INCOMPLETE', completeRows: 2 })
    expect(summary.resourceBudgetExposure.status).toBe('INCOMPLETE')
    expect(summary.adoptedValues).toBe(0)
    expect(Object.values(summary.outputs).every(v => v === null)).toBe(true)
  })
  it('recomputes conditional per-truck proxies without assigning all mileage to company trucks', () => {
    const review = summary.supportingDryVanCapacity.denominatorReview
    expect(review.candidates).toHaveLength(6)
    for (const c of review.candidates) {
      const o = summary.supportingDryVanCapacity.observations.find(row => row.id === c.observationId)!
      expect(c.combinedAverageTrucks).toBe(o.averageCompanyDriverTrucks + o.averageOwnerOperatorTrucks)
      expect(c.conditionalKmPerCombinedAverageTruckMonth * c.combinedAverageTrucks * c.months).toBeCloseTo(o.reportedFleetTotalKm, 7)
      expect(c.companyOnlyDivisorContrastKmPerMonth).toBeGreaterThan(c.conditionalKmPerCombinedAverageTruckMonth)
      expect(c).toMatchObject({ companyOnlyContrastIsOwnedProductivity: false, monthlyProductiveAssetDays: null,
        appliedToPilot: false, eligibleForResourceExposure: false, classification: 'CONDITIONAL_PUBLIC_MODEL_PROXY_NOT_OBSERVED_OWNED_CAPACITY' })
      expect(o.monthlyKmPerTractor).toBeNull()
    }
    expect(review.candidates.find(c => c.observationId === 'H12026')!.conditionalKmPerCombinedAverageTruckMonth).toBeCloseTo(11307.27187593797, 8)
    expect(review.candidates.find(c => c.observationId === 'FY2025')!.conditionalKmPerCombinedAverageTruckMonth).toBeCloseTo(10483.589452983295, 8)
  })
  it('corroborates only the explicit H1 averages and never substitutes quarter closing counts', () => {
    const review = summary.supportingDryVanCapacity.denominatorReview
    expect(review.candidates.filter(c => c.averageCountCorroborated).map(c => c.observationId)).toEqual(['H12025', 'H12026'])
    expect(review.candidates.find(c => c.observationId === 'H12025')).toMatchObject({ combinedAverageTrucks: 2132, tenQAverageTrucksInService: 2132 })
    expect(review.candidates.find(c => c.observationId === 'H12026')).toMatchObject({ combinedAverageTrucks: 1999, tenQAverageTrucksInService: 1999 })
    expect(review.candidates.find(c => c.observationId === 'Q22025')).toMatchObject({ combinedAverageTrucks: 2084, tenQAverageTrucksInService: null, averageCountCorroborated: false })
    expect(review.closingCountsUsedAsAverage).toBe(false)
    expect(review.interpretation.allMileageAssignedToCombinedAverageTrucksConfirmed).toBe(false)
  })
  it('preserves source disagreement and does not infer absolute productive days from growth', () => {
    const review = summary.supportingDryVanCapacity.denominatorReview
    const [quarter, half] = review.productivityComparisons
    expect(quarter).toMatchObject({ releasePercent: 12.8, tenQPercent: 12.0 })
    expect(quarter.conditionalQuotientChangePercent).toBeCloseTo(12.832150273146304, 8)
    expect(quarter.releaseMinusTenQPercentagePoints).toBeCloseTo(.8, 10)
    expect(half).toMatchObject({ releasePercent: null, tenQPercent: 8.9, releaseMinusTenQPercentagePoints: null })
    expect(half.conditionalQuotientChangePercent).toBeCloseTo(10.182244154404852, 8)
    for (const comparison of review.productivityComparisons) {
      expect(comparison.quotientMinusTenQPercentagePoints).toBeCloseTo(comparison.conditionalQuotientChangePercent - comparison.tenQPercent, 10)
      expect(comparison).toMatchObject({ quotientIsPublishedDayMetric: false, sourceConflictResolved: false, numericalMatchProvesPopulationJoin: false })
    }
    expect(review.publishedPercentUsedToInferProductiveDays).toBe(false)
  })
  it('exposes a recommendation only, without replacing budget, exposure or prior evidence', () => {
    const review = summary.supportingDryVanCapacity.denominatorReview
    expect(review.recommendation).toMatchObject({ preferredComparisonObservationId: 'H12026', selectedForPilot: false, eligibleForResourceExposure: false })
    expect(review).toMatchObject({ completeBudgetJoined: false, statisticalConfidenceInterval: false, rawHttpArchiveObtained: false, appliedToPilot: false })
    expect(REFERENCE_BUDGET_PINS.find(p => p.id === 'dryVanCapacity')!.sha256).toBe('ac224e566b80e51d5ff56675e85d67c2b38c181ce845b0b486130677c9a44e8a')
    expect(summary.resourceBudgetExposure.status).toBe('INCOMPLETE')
    expect(summary.authoritativeBudget.completeRows).toBe(2)
    expect(Object.values(summary.outputs).every(v => v === null)).toBe(true)
    expect(summary.adoptedValues).toBe(0)
  })
  it('relates all three resource profiles to the original budget without inventing fleet quantities', () => {
    const profiles = summary.publicModelResourceProfiles
    expect(profiles.resources.map(r => r.resourceId)).toEqual(['MX_TRACTOR', 'US_TRACTOR', 'SHARED_TRAILER'])
    for (const r of profiles.resources) {
      expect(r.budgetFamilies.map(f => f.economicExpenseId)).toEqual(summary.budgetRows.filter(f => f.resources.includes(r.resourceId)).map(f => f.economicExpenseId))
      expect(r).toMatchObject({ normalizationAssetCount: 1, normalizationIsGroupFleetCount: false, paymentModes: ['CASH', 'FINANCED'], completeMonthlyCapital: null, completeMonthlyFixedBudget: null, monthlyProductiveAssetDays: null, appliedToPilot: false })
    }
    expect(profiles).toMatchObject({ groupFleetQuantities: null, groupMonthlyBudgetUsd: null, publicObservationsCombinedAsSameCarrier: false, unknownExpensesSetToZero: false })
    expect(profiles.groupAllocation).toMatchObject({ poolChargedOnce: true, shares: null, equalThirdsInvented: false })
  })
  it('computes one-VIN activity from ordered elapsed dates, not stale listing mileage or productive days', () => {
    const history = summary.supportingJointUsCapitalExposure.historicalUse
    expect(history.records).toHaveLength(7)
    expect(history.intervals).toHaveLength(6)
    expect(history.fullHistory).toMatchObject({ start: '2024-09-03', end: '2026-03-30', elapsedCalendarDays: 573, additionalMiles: 315215, operatingDays: null, productiveAssetDays: null, forwardForecast: false })
    expect(history.fullHistory.annualizedMeanMonthKm).toBeCloseTo(315215 * 1.609344 / 573 * 365 / 12, 8)
    expect(history.intervals.reduce((sum, interval) => sum + interval.additionalMiles, 0)).toBe(315215)
    expect(history.intervals.reduce((sum, interval) => sum + interval.elapsedCalendarDays, 0)).toBe(573)
    expect(history.intervals[5]).toMatchObject({ elapsedCalendarDays: 161, additionalMiles: 25897 })
    expect(history.intervals[5].annualizedMeanMonthKm).toBeCloseTo(7873.794654409939, 8)
    const unweighted = history.intervals.reduce((sum, interval) => sum + interval.annualizedMeanMonthKm, 0) / history.intervals.length
    expect(history.fullHistory.annualizedMeanMonthKm).not.toBeCloseTo(unweighted, 5)
    expect(history).toMatchObject({ listingOdometerUsedAsChronologyEndpoint: false, currentOdometerCertified: false, recordsAuthenticateFutureUsageOrCondition: false })
  })
  it('uses the exact same scenario mileage in capital retention and its distance divisor', () => {
    const joint = summary.supportingJointUsCapitalExposure
    expect(joint.scenarios.map(s => s.id)).toEqual(['FY2025', 'H12026', 'Q22026', 'FULL_PUBLISHED_HISTORY', 'LATEST_PUBLISHED_INTERVAL'])
    for (const s of joint.scenarios) {
      const retention = .9071 ** 3 * .999 ** (s.monthlyKm / 1.609344 * 36 / 1000)
      expect(s.additionalMiles).toBeCloseTo(s.monthlyKm / 1.609344 * 36, 8)
      expect(s.retention).toBeCloseTo(retention, 12)
      expect(s.grossEndpointUsd).toBeCloseTo(40495 * retention, 8)
      expect(s.askingValueLossMonthlyUsd * 36 + s.grossEndpointUsd).toBeCloseTo(40495, 8)
      expect(s.askingValueLossPerScenarioKmUsd * s.monthlyKm).toBeCloseTo(s.askingValueLossMonthlyUsd, 8)
      expect(s).toMatchObject({ sameMileageInCapitalAndDistanceDivisor: true, crossSourceJointObservation: false, completeCapitalUsd: null, completeFixedBudgetUsd: null, productiveAssetDays: null, priceOrCfuFloor: false, appliedToPilot: false })
    }
    expect(joint.scenarios.find(s => s.id === 'H12026')!.askingValueLossMonthlyUsd).toBeCloseTo(472.9918087706058, 8)
    expect(joint.scenarios.find(s => s.id === 'FULL_PUBLISHED_HISTORY')!.askingValueLossMonthlyUsd).toBeCloseTo(665.3185770697922, 8)
    expect(joint).toMatchObject({ holdingIsRemainingLife: false, appliesToMxOrTrailer: false, insuranceAddedToCapital: false, currentOdometerAddedToIncrementalExponent: false, priceOrCfuFloor: false })
  })
  it('changes the capital piece with use and never treats a falling rate per km as lower total capital', () => {
    const scenarios = summary.supportingJointUsCapitalExposure.scenarios
    const recent = scenarios.find(s => s.id === 'LATEST_PUBLISHED_INTERVAL')!
    const full = scenarios.find(s => s.id === 'FULL_PUBLISHED_HISTORY')!
    expect(full.monthlyKm).toBeGreaterThan(recent.monthlyKm)
    expect(full.askingValueLossMonthlyUsd).toBeGreaterThan(recent.askingValueLossMonthlyUsd)
    expect(full.grossEndpointUsd).toBeLessThan(recent.grossEndpointUsd)
    expect(full.askingValueLossPerScenarioKmUsd).toBeLessThan(recent.askingValueLossPerScenarioKmUsd)
    expect(summary.authoritativeBudget).toMatchObject({ status: 'INCOMPLETE', completeRows: 2 })
    expect(Object.values(summary.outputs).every(v => v === null)).toBe(true)
  })
  it('rejects changed asset chronology archives or historical capital methods', () => {
    const profile = JSON.parse(readLocalDocument(REFERENCE_BUDGET_PINS.find(p => p.id === 'economicProfiles')!.file))
    for (const [file, code] of [[profile.usHistoricalUse.sourceArchive.file, 'SOURCE_ARCHIVE_HASH_MISMATCH:US_ASSET_HISTORY'],
      [profile.jointUsCapitalExposure.capitalMethodPin.file, 'SOURCE_HASH_MISMATCH:US_CAPITAL_METHOD']]) {
      expect(() => consolidateBinationalReferenceBudget(path => readLocalDocument(path) + (path === file ? ' ' : ''))).toThrow(code)
    }
  })
})
