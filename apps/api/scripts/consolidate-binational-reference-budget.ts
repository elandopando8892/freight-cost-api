import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { readLocalDocument, readLocalDocumentBytes } from './assemble-economic-reference-cards.js'
import { BINATIONAL_RESOURCES, reconcileBinationalFixedBudget } from '../src/modules/engine/benchmark-binational-budget.js'
import { calculateBinationalBudgetCostProjection } from '../src/modules/engine/benchmark-binational-cost-projection.js'
import { calculateReferenceDebtSchedule } from './lib/reference-debt-schedule.js'
import { calculateUsCapitalComparison } from './lib/reference-us-capital-comparison.js'
import { applyUsProspectiveCapitalPublicModel } from './lib/reference-us-prospective-capital.js'
import { applyBoxProspectiveCashScenario, verifyDatedFixArchive } from './lib/reference-box-prospective-capital.js'
import { applyMxProspectiveCapitalScenario } from './lib/reference-mx-prospective-capital.js'
import { applyMxTractorInsurancePublicModel } from './lib/reference-mx-insurance-public-model.js'
import { calculateRecurringPermitComponentScenario } from './lib/reference-recurring-permit-components.js'
import { calculateCentralAdminPoolScenarios } from './lib/reference-central-admin-pool.js'
import { calculateAdminScaleReference } from './lib/reference-admin-scale.js'
import { calculateCompanyServicePool } from './lib/reference-company-service-pool.js'
import { calculatePilotCycleExposureScenarios } from './lib/reference-pilot-cycle-exposure.js'
import {readBorderLinkPlanning} from './lib/reference-border-link-planning.js'
import { calculatePilotVariableScenarios } from './lib/reference-pilot-variable.js'
import { calculatePilotRoadBorderScenarios } from './lib/reference-pilot-road-border.js'
import { calculatePilotPhysicalCycle } from './lib/reference-pilot-physical-cycle.js'
import { calculateMxDriverRestAlternatives } from './lib/reference-mx-variable-driver.js'
import { calculateMxDriverPublicForecast, joinPilotDriverForecastComponents } from './lib/reference-mx-driver-forecast.js'
import { calculatePilotFinancedCfu } from './lib/reference-pilot-financed-cfu.js'
import { calculatePilotOrdinaryDuty } from './lib/reference-pilot-ordinary-duty.js'
import { calculateBoxInsuranceCfu } from './lib/reference-box-insurance-cfu.js'
import { calculateCargoTripInsuranceReference } from './lib/reference-cargo-trip-insurance.js'
import { calculatePilotCargoInsuranceProjection } from './lib/reference-pilot-cargo-insurance.js'
import { calculateCompanyServicesCfu } from './lib/reference-company-services-cfu.js'
import { calculateDriverConnectivity } from './lib/reference-driver-connectivity.js'
import { calculateBoxVisibility } from './lib/reference-box-visibility.js'
import { calculatePilotTripSupplements } from './lib/reference-pilot-trip-supplements.js'
import { calculateOperatingFluids } from './lib/reference-operating-fluids.js'
import { calculateMxReservedYard } from './lib/reference-mx-yard.js'
import { calculateMxBobtailWearReference, type MxBobtailWearBasis } from './lib/reference-mx-bobtail-wear.js'
import { reviewMxTollCoverage } from './lib/reference-mx-toll-coverage.js'
import { calculateCrossborderInsuranceExposure } from './lib/reference-crossborder-insurance.js'
import { calculateCrossborderLiabilityForecast, type CrossborderLiabilityBasis } from './lib/reference-crossborder-liability-forecast.js'
import { compareReferenceAssetTaxBases } from './lib/reference-asset-tax-contrast.js'
import { calculateFacilityReferenceContrast, calculateStaffingReferenceContrast } from './lib/reference-facility-staffing.js'
import { ADMIN_ROLES } from '../src/modules/engine/benchmark-payroll-capital-contract.js'
import { normalizeInsuranceReference, calculateUsEmployerStatutoryReference, calculateOwnedTrailerInsurancePlanningReference, applyUsTractorInsurancePublicModel } from './lib/reference-insurance-employer.js'
import { calculateMxEmployerReference } from './lib/reference-mx-employer.js'
import { calculateNlPayrollTaxReference } from './lib/reference-nl-payroll-tax.js'
import { calculateMxWorkRiskReference } from './lib/reference-mx-work-risk.js'
import { calculateMonitoringCoverageReference } from './lib/reference-monitoring-coverage.js'
import { calculateMxDrivingStageReference } from './lib/reference-mx-driving-stage.js'
import { reconcileReferenceBudgetExposure, projectSharedTrailerReference } from './lib/reference-budget-exposure.js'
import { calculateVariableComponentReferences, calculateDriverComponentReferences } from './lib/reference-variable-components.js'
import { calculateSharedBoxTexasComplianceReference, calculateSharedBoxMexicoInspectionReference } from './lib/reference-shared-box-compliance.js'
import { verifyFuelFiles } from './review-fuel-reference.js'
import { verifyMaintenanceFiles } from './review-maintenance-tires-reference.js'

/** Local, read-only research projection. No rate adoption, route, network or DB calls.
 * Exact pins make this a dated reproducible scenario, not a current-source refresh. */
export const REFERENCE_BUDGET_PINS = [
  { id: 'capitalInsurance', file: 'docs/research/B2_CAPITAL_INSURANCE_COMPONENTS_2026-10-01.json', sha256: '9eae7d6cf036a89f5be5f43c4cc3ab8407702dc2d1f418e1eed95ad160a3b8f5' },
  { id: 'registration', file: 'docs/research/B2_FIXED_REGISTRATION_COMPONENTS_2026-10-01.json', sha256: '14cc6c23795d1e0ce38dd8fdf1f5eee4ecff4aa171334a1269497a6569383e99' },
  { id: 'exposure', file: 'docs/research/B2_REFERENCE_PROFILE_EXPOSURE_2026-09-29.json', sha256: '336c00c88d3e13f64ce6706905cf926142885bc591c7355b3f7a666508bb7857' },
  { id: 'worksheet', file: 'docs/research/B2_BINATIONAL_FIXED_BUDGET_WORKSHEET_2026-10-01.json', sha256: '63629b174897277ce5501f833e9c24a40fdd24e4c2e323e8663366e2a1a24b80' },
  { id: 'selection', file: 'docs/research/B2_BINATIONAL_OWN_RELAY_SELECTED.json', sha256: '9e169339515fb467f5207748d3c0676bed1dbb6cfb30b01f0696b56ccfd4a775' },
  { id: 'case', file: 'docs/research/B2_D2D_READINESS_CASE_2026-09-30.json', sha256: 'a897778d6f907b1041895f9bcace01cd91654cd2cb51dc9abc0570369024d28b' },
  { id: 'overhead', file: 'docs/research/B1_OVERHEAD_EXPOSURE_BRIDGE_2026-09-29.json', sha256: '587cc5ecb2aaaceaf3de1dd86c56599b3f188eca727a3b536f0e2bc63719eb47' },
  { id: 'mxUsedMarket', file: 'docs/research/B2_MX_USED_MARKET_COMPARABILITY_2026-10-01.json', sha256: '96eed7e67cf7fdef8b63ec46efaea2e0b0162bbce96144d05f2672bec908ca9b' },
  { id: 'cashFinanced', file: 'docs/research/B2_CASH_FINANCED_CAPITAL_2026-10-01.json', sha256: '5faff7e9ee44a233ef8c501bfd8102d64c687dd81a3b0ecc91d6da25a294ce8e' },
  { id: 'trailerOverhead', file: 'docs/research/B2_TRAILER_OVERHEAD_COMPONENTS_2026-10-01.json', sha256: '6330b2b0a83e907b0ae26ed6c7863ba1b01d53a8b370fede1231264b0e31109d' },
  { id: 'payrollComparators', file: 'docs/research/B1_MX_US_PAYROLL_ASSET_COMPARATORS_2026-09-29.json', sha256: '1a032ae20fa9d2fe64cc9e15db600fa63e7d325a3ceda722937947a4e6579460' },
  { id: 'facilityStaffing', file: 'docs/research/B2_OFFICE_YARD_ADMIN_SCENARIOS_2026-10-01.json', sha256: '7c1cbc154a5bae865a8e6f516d67754e2fac0d452dbe8ab1c62c5405f49a032a' },
  { id: 'resourceExposure', file: 'docs/research/B2_RESOURCE_BUDGET_EXPOSURE_HANDOFF_2026-10-01.json', sha256: '601717e1cd49dce33fb645b03ec57564b7858f69878500ce5a306250ebc74cf7' },
  { id: 'dryVanCapacity', file: 'docs/research/B2_US_DRYVAN_CAPACITY_2026-10-01.json', sha256: 'ac224e566b80e51d5ff56675e85d67c2b38c181ce845b0b486130677c9a44e8a' },
  { id: 'dryVanDenominator', file: 'docs/research/B2_DRYVAN_DENOMINATOR_RECONCILIATION_2026-10-01.json', sha256: 'fce0a1a773bb2c75857e0e665b72b3bdae14596f1ce2e8d65014ac95fa19b805' },
  { id: 'economicProfiles', file: 'docs/research/B2_RESOURCE_ECONOMIC_PROFILES_2026-10-01.json', sha256: '52c83c5c6a0bbb82350895c4ab2ba3cfa6caa851e1fc765c20599960fc37de4b' },
  { id: 'recurringCompliance', file: 'docs/research/B2_US_RECURRING_COMPLIANCE_2026-10-01.json', sha256: 'aa99998bc00da3fd0e86e75625732d71bc41d27733150f2398782805018074b5' },
  { id: 'irpModel', file: 'docs/research/B2_IRP_PUBLIC_MODEL_2026-10-01.json', sha256: '757b6fdb26e25fc15ebb54135419125e2dc4ece819a63994ad276506c76ec388' },
  { id: 'irpRules', file: 'docs/research/B2_IRP_CONSOLIDATED_RULES_2026-10-01.json', sha256: 'e84419618759d959b4db0e978cd8544c3ae92bce825d9cf8249771030d2bed16' },
  { id: 'irpUsBatch', file: 'docs/research/B2_IRP_US_RULE_BATCH_2026-10-01.json', sha256: '3dd09afe78ca8e5eff021d43d7902b193289e3cfdf483c2b896175c4c09b0dfe' },
  { id: 'irpUsWeightRules', file: 'docs/research/B2_IRP_US_WEIGHT_RULES_2026-10-01.json', sha256: '975648a038fb350e2ec03c8f48d34c4517e88fe7c3215f7b3a1e29f845ef3261' },
  { id: 'irpCurrencyValue', file: 'docs/research/B2_IRP_CURRENCY_VALUE_RULES_2026-10-01.json', sha256: 'e454640050b4184c3f8239f5d637497d396c8d632712e5234e101959dac295ee' },
  { id: 'irpAssetValue', file: 'docs/research/B2_IRP_ASSET_VALUE_PROFILE_2026-10-01.json', sha256: '77f1b126fc404ae732ac977f4ee5300a1e3d83cec68c690eb8308e89ef176c65' },
  { id: 'irpSeparableRegistration', file: 'docs/research/B2_IRP_SEPARABLE_REGISTRATION_2026-10-01.json', sha256: '2f4e13c785b0082c6a08d3d022e977262edc6e78cf85fb2abdcabb811dbfe54a' },
  { id: 'irpStateReferences', file: 'docs/research/B2_IRP_STATE_REFERENCE_RECONCILIATION_2026-10-01.json', sha256: 'b8c149c12a41791e3af58e9cc4d52fc22b026dd1bfdccec51e9d4fe095153df0' },
  { id: 'insuranceEmployer', file: 'docs/research/B2_INSURANCE_EMPLOYER_COMPONENTS_2026-10-01.json', sha256: '6b69a7198ca533a5c7d7a7e8f2f141d7549c386501daad0bcd3c853d38f2efb0' },
  { id: 'mxEmployerRules', file: 'docs/research/B1_MX_DRIVER_EMPLOYER_COST_RULES_2026-09-29.json', sha256: '570937768fe0e4cc2f402f6b0fff0f3ea24af9fa51cf5af041f6597c21975176' },
  { id: 'mxEmployerScenario', file: 'docs/research/B2_MX_EMPLOYER_SCENARIO_2026-10-01.json', sha256: 'c206e93e464142bcced5ce12193f211a18288578371d53aebef0359745af9f22' },
  { id: 'nlPayrollTax', file: 'docs/research/B2_NL_PAYROLL_TAX_REFERENCE_2026-10-01.json', sha256: 'e06b3d1cb3fb81c59d5388b275a8da21de4de88d36f11e2bff0917444de59064' },
  { id: 'mxWorkRisk', file: 'docs/research/B2_MX_WORK_RISK_REFERENCE_2026-10-01.json', sha256: '4b72bc1b23bfac7677028d1a9c3279668d9db7e462564dbf46cac7ca33720b17' },
  { id: 'monitoringCoverage', file: 'docs/research/B2_MONITORING_COVERAGE_REFERENCE_2026-10-01.json', sha256: '06d7b4ff7928573994805a6e81cc42fa2e135872cfa41ad841e7a7fdc8e3b84a' },
  { id: 'mxDrivingStage', file: 'docs/research/B2_MX_DRIVING_STAGE_REFERENCE_2026-10-01.json', sha256: '1c9f949fd08b6617757a83e58f6588f446fb949032446f750ea9f9f5f8613ee0' },
  { id: 'sakbeMxDetail', file: 'docs/research/B2_SAKBE_MX_LIVE_DETAIL_2026-09-30.json', sha256: '731cb21c1f7bfe2196ab90b12d56a91d4ebd4b1ef5b698ce73209341958b2970' },
  { id: 'googleUsReceipt', file: 'docs/research/B2_GOOGLE_BASIC_LIVE_RECEIPT_2026-09-30.json', sha256: '38ac14333857627c86defeaa76ef82f604fc307837234929b2dd5c5e218980f8' },
  { id: 'fuelReference', file: 'docs/research/B2_FUEL_PRICE_PERFORMANCE_REFERENCE_2026-09-30.json', sha256: '8824dcdb1180e28c9b7950bb4b77155b94edce78410f6a392a3cdaecc8c80be1' },
  { id: 'maintenanceReference', file: 'docs/research/B2_MAINTENANCE_TIRES_REFERENCE_2026-09-30.json', sha256: '021cc89442452036fd1c6edc782fc42db89c6e5b5b8398db56150fdf89dfdbdb' },
  { id: 'variableComponents', file: 'docs/research/B2_VARIABLE_COMPONENTS_REFERENCE_2026-10-01.json', sha256: '4e9749bad7caeb7db3a26c62883965cd74d4bf729cfc2e7e68635ec15ef730d2' },
  { id: 'laborBridge', file: 'docs/research/B2_LABOR_COMPENSATION_BRIDGE_2026-09-29.json', sha256: '321c07a2b208b41b8f6be256cafed9ff521ef083ad3751ba56402b081f4f00aa' },
  { id: 'pilotAssetLabor', file: 'docs/research/B1_PILOT_ASSET_LABOR_EVIDENCE_2026-09-29.json', sha256: 'ba33bcbdf4fcfabef81c926c76e7ed3dd58f8792bffe44177817aea4d1cc716f' },
  { id: 'driverComponents', file: 'docs/research/B2_DRIVER_DISTANCE_COMPONENTS_2026-10-01.json', sha256: 'd97fcef52ff5824eb9c1b680613f879e4f19c2fbee6b42088225033118fbf9a8' },
  { id: 'sharedBoxProjection', file: 'docs/research/B2_SHARED_BOX_CAPITAL_EXPOSURE_2026-10-01.json', sha256: '4582155bd880562736219b62be63b312e291096db68ad8e1ecdb47174b6fb719' },
  { id: 'sharedBoxInsurance', file: 'docs/research/B2_SHARED_BOX_INSURANCE_REFERENCE_2026-10-01.json', sha256: 'f8e677b4aeb8b60427d3ec1997ad911ce3455ba12a49bdd8c6bd7fb861a44a01' },
  { id: 'sharedBoxTxCompliance', file: 'docs/research/B2_SHARED_BOX_TX_COMPLIANCE_2026-10-01.json', sha256: 'e3f1ea7e63ff1cbd7d8fa100543bbc6325f02fd893a2c8fd9a21a42a27273b39' },
  { id: 'sharedBoxMxInspection', file: 'docs/research/B2_SHARED_BOX_MX_INSPECTION_2026-10-02.json', sha256: '317a9be97cc8cc17981405f4c9e5aceb6d152793d673ca3f3d927871e15387c4' },
  { id: 'usInsurancePublicModel', file: 'docs/research/B2_US_INSURANCE_PUBLIC_MODEL_2026-10-02.json', sha256: '060d813a21599e0864d26089227df79705c496f9c9e24b6887b4cdf057e4a80a' },
  { id: 'usCapitalComparison', file: 'docs/research/B2_US_CAPITAL_COMPARISON_2026-10-02.json', sha256: 'bb5145b51dc22afc7e6d0faa2f1150ffd1223d280587926149c9459efc5e43bc' },
  { id: 'usProspectiveCapital', file: 'docs/research/B2_US_PROSPECTIVE_CAPITAL_2026-10-02.json', sha256: 'cfcb00305f4ec09868ada9e40589ef57c8c4e58240e1634ead4c501700f2248a' },
  { id: 'datedFx', file: 'docs/research/B2_FX_REFERENCE_2026-10-02.json', sha256: 'b1e62ecb4f9e569fc5763155b59bfd39042a72e3067f6be1b4dabafafa8e4713' },
  { id: 'boxProspective', file: 'docs/research/B2_BOX_PROSPECTIVE_SCENARIOS_2026-10-02.json', sha256: 'c5a709e3bb96b399de1e7286ca1834959e317596e2c93117a622771c24fdc1bf' },
  { id: 'mxProspective', file: 'docs/research/B2_MX_PROSPECTIVE_CAPITAL_2026-10-02.json', sha256: 'c58a40cdbc57cbe73aff36cbec0e341fc5afc907cc8d84c5c1e2264e9066eee7' },
  { id: 'mxInsuranceModel', file: 'docs/research/B2_MX_INSURANCE_PUBLIC_MODEL_2026-10-02.json', sha256: '4c3f9f5061c37a77cd8dc5bda90be7c35ac1149cd9eb064268d1f9cad4741254' },
  { id: 'permitComponentScenario', file: 'docs/research/B2_RECURRING_PERMIT_COMPONENT_SCENARIO_2026-10-02.json', sha256: 'f3c94f8a627a3a9a267c8bac8a20f0f8753fe103d799976d0e5b36a6e224fae5' },
  { id: 'adminPool', file: 'docs/research/B2_CENTRAL_ADMIN_POOL_SCENARIOS_2026-10-02.json', sha256: 'eb62ffdd98781fbb04b48849bd69fbdfe32f7f43621ea93b45625241ce3800f8' },
  { id: 'companyPool', file: 'docs/research/B2_COMPANY_SERVICE_POOL_SCENARIOS_2026-10-02.json', sha256: '5eb76af7da21df1459d0628f254a03d1bf6b512f61cba278c02e420697790ab5' },
  { id: 'pilotCycle', file: 'docs/research/B2_PILOT_CYCLE_EXPOSURE_SCENARIOS_2026-10-02.json', sha256: '327674619252a10df0a01ed692f40829829c67141d330bc46e568debde4b9ea4' },
  { id: 'pilotUsPostalRoad', file: 'docs/research/B2_US_POSTAL_ROUTE_REFERENCE_2026-10-03.json', sha256: '1698466636bfd6f4b400c5c8193576d127b7fee3031eec1b2b5f40f00da4f1ed' },
  { id: 'pilotVariables', file: 'docs/research/B2_PILOT_VARIABLE_SCENARIOS_2026-10-02.json', sha256: '15dced8b67235a42b04213420f2770438b15b5cd9d2002576a5dac40f94a773a' },
  { id: 'mxTollFollowup', file: 'docs/research/B2_MX_TOLL_FOLLOWUP_2026-09-30.json', sha256: '52cecc69261cfb3b7410389acf978a2c8b544a0b26038daf538e18c26edadee6' },
  { id: 'borderTariffResearch', file: 'docs/research/B2_BINATIONAL_BORDER_2026-09-30.json', sha256: '5a6cce075e02b2dd1e7df2d6339f9f374618e22d950a3f73ccf7541390338827' },
  { id: 'pilotRoadBorder', file: 'docs/research/B2_PILOT_ROAD_BORDER_SCENARIOS_2026-10-02.json', sha256: '69047bd29c1c08938f784a7811b8244bb05255bb09637bda23fa9566b774d2e5' },
  { id: 'adminScale', file: 'docs/research/B2_ADMIN_SCALE_PUBLIC_MODEL_2026-10-02.json', sha256: '6beb2c17384e49cf3d5bad774ae1d8dbc9b27afb832fabc6e64e0d44af48d058' },
  { id: 'pilotPhysicalCycle', file: 'docs/research/B2_PILOT_PHYSICAL_CYCLE_2026-10-02.json', sha256: 'b17f8889c8a16e68a788dcded3ad03d88f61d2e6168def030aa1431bb820c6ad' },
  { id: 'mxVariableDriver', file: 'docs/research/B2_MX_VARIABLE_DRIVER_PUBLIC_MODEL_2026-10-02.json', sha256: '23f5a5d777d47987fe0976d99e4f958c0bb5ad5484ff6213a58dee16bc89e945' },
  { id: 'mxDriverForecast', file: 'docs/research/B2_MX_DRIVER_FORECAST_2026-10-02.json', sha256: '01e73bb21c19dbdd929d9cbdb35b6bf5ac3da45c3c6599fe0d8645128e5189c4' },
  { id: 'pilotFinancedCfu', file: 'docs/research/B2_PILOT_FINANCED_CFU_2026-10-02.json', sha256: 'bc01b7e12e8bc9c2a33fea8184f0b0cbbcfcc1bf24d72bff947de16fb46a9626' },
  { id: 'pilotOrdinaryDuty', file: 'docs/research/B2_PILOT_ORDINARY_DUTY_2026-10-02.json', sha256: '25dec0b7045723b853f8c8441f859033ce7325fe9914b3812e36db4af179ef00' },
  { id: 'boxInsuranceCfu', file: 'docs/research/B2_BOX_INSURANCE_CFU_2026-10-02.json', sha256: 'dcb982c615b061dbe212e3388479a506e797c4f06d053ca6d36fa24b8baf6f5d' },
  { id: 'cargoTripInsurance', file: 'docs/research/B2_CARGO_TRIP_INSURANCE_2026-10-02.json', sha256: '5cbb5946c8e7af7a91b271a253f0bc9ba80d0c6ca6a7308f881fa7c0fcce92a8' },
  { id: 'companyServicesCfu', file: 'docs/research/B2_COMPANY_SERVICES_CFU_2026-10-02.json', sha256: 'fcf41cbe0f02243e23afbebfce1fe4defd5b7c87c3f332fdfa0c67c77afbfb83' },
  { id: 'driverConnectivity', file: 'docs/research/B2_DRIVER_CONNECTIVITY_2026-10-02.json', sha256: 'cb1a77798897f6f5b4ede191c7eb76746e4cffec2d93542d4759e6efeeb2d255' },
  { id: 'boxVisibility', file: 'docs/research/B2_BOX_VISIBILITY_2026-10-02.json', sha256: 'a72919049cc74391779f6a076b03e2ca92b74157f7c346f2a12b8efab85d8c9b' },
  { id: 'tripSupplements', file: 'docs/research/B2_PILOT_TRIP_SUPPLEMENTS_2026-10-02.json', sha256: '85a0981e4bcc1159d4f67cd3b49a3050b56ed78f8004d3ad4ba29278f81757cb' },
  { id: 'operatingFluids', file: 'docs/research/B2_OPERATING_FLUIDS_2026-10-02.json', sha256: '2b3f3d2655a1bb42fcdf5ff5123fc83d1615b5215bac82a416fb02b328f83763' },
  { id: 'mxReservedYard', file: 'docs/research/B2_MX_YARD_2026-10-02.json', sha256: 'fca23386ca34e2a48e9d204c1db222dad4bb367e847e2fe47aefd14960ef0c05' },
  { id: 'mxTollCoverage', file: 'docs/research/B2_MX_TOLL_COVERAGE_2026-10-02.json', sha256: '54c02d00a8aacdae7c7c432d1ba0a16e7b93224613d18620123174e7cf56880f' },
  { id: 'crossborderInsuranceExposure', file: 'docs/research/B2_CROSSBORDER_INSURANCE_EXPOSURE_2026-10-03.json', sha256: 'cfce41e1d640f201038a47f971df1feb83d74b5a264c850670456f15f7d7aff5' },
  { id: 'borderLinkPlanning', file: 'docs/research/B2_BORDER_LINK_PLANNING_2026-10-03.json', sha256: '9b1330d9a4bdea66e21548bd683a88a0d0c5ebe88a4bad2cd8407a0a2a930572' },
  { id: 'mxBobtailWear', file: 'docs/research/B2_MX_BOBTAIL_WEAR_REFERENCE_2026-10-03.json', sha256: 'e18d4f618c70b2deabfa1b0b0d03852e41e730279d38d62f9b757e226f28bb54' },
  { id: 'crossborderLiabilityForecast', file: 'docs/research/B2_CROSSBORDER_LIABILITY_FORECAST_2026-10-03.json', sha256: '2fdee42c4a15d9336b75166f4d02559c484f6eafbfb8f6e3d46269fa8c2893de' },
] as const

type LossScenario = { id: string; useMultiplier: number; annualMiles: number; askingValueLossMonthlyUsd: number }
type MxPackage = { id: string; annualGrossMxn: number }
type UCRSchedule = { registrationYear: number; rows: { bracket: string; vehicleRange: string; annualUsd: number }[] }
type ExposureSource = { id: string; annualDistance: { value: number; unit: string }; annualOperatingDays: { value: number } }

// Each row addresses a whole budget family. A published piece cannot close that row.
const rowEvidence: Record<string, { refs: string[]; missing: string[] }> = {
  MX_TRACTOR_CAPITAL: { refs: ['capitalInsurance#/assetReferences/0', 'mxUsedMarket#/mxTractorReview', 'cashFinanced#/mxHistoricalOffer'], missing: ['Public-model capitalizable acquisition and explicit tax assumptions', 'Supported reviewed MX used-residual/holding hypothesis; rejected age-only pair cannot certify it', 'Supported cash/financed interest and fee hypotheses; no actual carrier debt contract required for reference estimation'] },
  MX_TRACTOR_INSURANCE: { refs: ['capitalInsurance#/mxInsurance'], missing: ['Compatible asset, insured value and territorial package', 'Economic tax treatment and validity'] },
  MX_TRACTOR_PERMITS: { refs: ['registration#/mxPermitObservations'], missing: ['Applicable dated procedures and full recurring reference-model budget', 'Explicit modeled registration jurisdiction/entity scope and event treatment; not an identified legal registrant'] },
  US_TRACTOR_CAPITAL: { refs: ['capitalInsurance#/usConditionalValueLoss', 'cashFinanced#/usPublishedOffer'], missing: ['Supported explicit acquisition/disposal hypotheses', 'Reviewed holding/residual public-model hypothesis, not certified remaining service life of the advertised VIN', 'Supported financed nominal-rate/fee assumptions; published APR cannot silently become nominal interest'] },
  US_TRACTOR_INSURANCE: { refs: ['capitalInsurance#/usInsurance'], missing: ['Compatible public-model equipment/territory premium, assumptions and validity', 'Coverage limits, exclusions and overlaps'] },
  US_TRACTOR_PERMITS: { refs: ['registration#/irp', 'registration#/ucr', 'registration#/authority', 'recurringCompliance#/hvut', 'irpModel#/distanceBasis', 'irpModel#/texasFeeComponent', 'irpRules#/supportedAnalyticalRules', 'irpRules#/officialTestContrast'], missing: ['Full IRP/compliance budget, jurisdiction rates, additional fees and reporting exposure', 'Applicable registrant/year/bracket and single allocation; HVUT taxable weight/use/suspension and used-vehicle eligibility', 'Opening events excluded or explicitly amortized'] },
  SHARED_TRAILER_CAPITAL: { refs: ['capitalInsurance#/assetReferences/2', 'mxUsedMarket#/trailerMarketContrast', 'cashFinanced#/commonCapitalPolicy', 'trailerOverhead#/trailerTaxSensitivity'], missing: ['One explicitly modeled economic owner and capitalizable acquisition', 'Supported tax/residual/holding/financing hypotheses; price gap alone is not net residual'] },
  SHARED_TRAILER_INSURANCE: { refs: ['capitalInsurance#/sharedTrailerInsurance'], missing: ['Explicit modeled owner/insured/custody/territories and compatible coverage assumptions', 'Supported box premium or reviewed public-model range, without duplicate national charging; broker heuristic is not a binational quote'] },
  SHARED_TRAILER_PERMITS: { refs: ['registration#/tokenTrailer'], missing: ['Explicit reference-model jurisdiction and eligibility assumptions', 'Full supported fees, tax/payment treatment and reference-period validity'] },
  GROUP_ADMIN_COMPANY_SINGLE_POOL: { refs: ['overhead#/observations', 'trailerOverhead#/overheadUnitComponents', 'facilityStaffing#/facilityObservations', 'facilityStaffing#/staffingScenarios'], missing: ['One supported same-scope group pool including office/payroll and supported unit quantities', 'Explicit resource shares, excluding direct assets and variable/trip expenses'] },
}

/** Public-rate boundary sensitivity for the SAME net-valued box. Not a credit
 * application, existing debt reconstruction or personalized BBVA quote. */
export function calculateSharedBoxFinancePlanning(raw: unknown) {
  const input=z.object({
    netAssetValueMxn:z.literal(630000),mxnPerUsd:z.number().finite().positive(),
    cashScenarios:z.array(z.object({id:z.enum(['NET_PLUS_VAT','GROSS_INCLUDES_VAT']),
      monthlyCapitalMxn:z.number().finite().positive()}).strict()).length(2),
  }).strict().parse(raw)
  if(new Set(input.cashScenarios.map(s=>s.id)).size!==2)throw new Error('BOX_FINANCE_DUPLICATE_CASH_ALTERNATIVE')
  const source={id:'BBVA_SIMPLE_PYME_FIXED_MXN_20261002',
    url:'https://www.bbva.mx/empresas/productos/financiamiento/creditos-a-corto-y-largo-plazo/credito-simple-pyme.html',
    reviewedAt:'2026-10-02',capture:'PRIMARY_WEB_READER_NOT_ARCHIVED_ORIGINAL_HTTP',
    locator:'Characteristics: equipment/fixed assets12–60months; rates/fees: fixedMXN15–38%, opening1%+IVA; CAT date30June2026/valid27Dec2026',
    fixedAnnualRateBounds:[0.15,0.38],openingFeeRate:0.01,publishedCat:0.172,
    publishedCatUsedAsInterest:false,assetEligibilityOrBorrowerApprovalObserved:false}
  // 80%/100%,24months,no grace/balloon and annual/12 are DECLARED planning
  // assumptions. Published bounds are not market quantiles or a quoted range
  // for this asset. The original cash box and budget are not overwritten.
  const scenarios=input.cashScenarios.flatMap(cash=>[0.8,1].flatMap(financedShare=>[0.15,0.38].map(annualRate=>{
    const principalMxn=input.netAssetValueMxn*financedShare
    const openingFeeNetMxn=principalMxn*source.openingFeeRate
    const schedule=calculateReferenceDebtSchedule({currency:'MXN',principal:principalMxn,
      rateKind:'EXPLICIT_PLANNING_NOMINAL_ANNUAL',annualRate,termMonths:24,comparisonMonths:24,
      totalGraceMonths:0,graceTreatment:'CAPITALIZE_MONTHLY_INTEREST',openingFeeCash:openingFeeNetMxn*1.16,
      feeTreatment:'PAID_UPFRONT_EXCLUDED_FROM_PRINCIPAL',balloon:0})
    const averageInterestMxn=schedule.averageInterestOverComparisonMonths
    // Separate tax alternatives; do not assert actual creditable VAT or silently
    // finance purchase VAT. This bridge is NOT the lender's effective-interest accounting.
    const feeTaxAlternatives=[{id:'FEE_VAT_CREDITABLE_ASSUMPTION',economicFeeMxn:openingFeeNetMxn},
      {id:'FEE_VAT_NOT_CREDITABLE_ASSUMPTION',economicFeeMxn:openingFeeNetMxn*1.16}].map(fee=>{
      const feeAllocationMxn=fee.economicFeeMxn/24
      const monthlyCapitalComponentMxn=cash.monthlyCapitalMxn+averageInterestMxn+feeAllocationMxn
      return {...fee,feeAllocationMxn,monthlyCapitalComponentMxn,monthlyCapitalComponentUsd:monthlyCapitalComponentMxn/input.mxnPerUsd}
    })
    return {id:`${cash.id}_DEBT_${financedShare}_${annualRate}`,cashTaxScenario:cash.id,
      resourceId:'SHARED_TRAILER' as const,financedShare,annualRate,principalMxn,termMonths:24,
      cashValueLossMonthlyMxn:cash.monthlyCapitalMxn,averageInterestMxn,openingFeeNetMxn,
      openingFeeGrossCashMxn:schedule.openingFeeCash,monthlyDebtServiceMxn:schedule.regularPaymentAfterGrace,
      totalInterestMxn:schedule.totalAccruedInterest,totalDebtServiceMxn:schedule.totalDebtService,
      terminalBalanceMxn:schedule.rows.at(-1)!.closingBalance,feeTaxAlternatives,
      principalOrDebtServiceAddedToEconomicExpense:false,oneSharedBox:true,completeCapitalMonthlyUsd:null,selected:false}
  })))
  return {model:'FCM_SHARED_BOX_PUBLIC_RATE_BOUNDARY_SENSITIVITY_V1',source,scenarios,
    assumptions:['80% and100% net-asset financing are declared leverage sensitivities, not observed lender advance rates',
      '24months matches the comparison horizon and lies within published12–60months; no actual maturity is observed',
      'Rate/12 monthly annuity with no grace/balloon is planning arithmetic, not a day-count lender schedule',
      'Opening debt is a counterfactual balance at comparison start, not a historical purchase or actual outstanding loan',
      'Fee is paid upfront outside principal; economic fee spread24months is separate declared allocation',
      'Net asset principal excludes purchase VAT; recovery/cash financing of purchase VAT is unresolved',
      'Only the same one box changes; no depreciation or debt principal added twice'],
    actualDebtObserved:false,actualPurchaseOrLoanRequested:false,publishedCatConvertedToInterest:false,
    actualContractMonthlyInterest:null,completeBoxFinancedCapitalUsd:null,completeD2DCostUsd:null,
    remaining:['PURCHASE_VAT_CASH_FINANCING','ANY_REQUIRED_INSURANCE_ACCOUNT_OR_OTHER_CREDIT_COSTS','TRANSFER_TO_SELECTED_PROSPECTIVE_DEBT_PROFILE'],
    selected:false,calibrated:false,quoteReady:false,externalCalls:false}
}

export function consolidateBinationalReferenceBudget(readSource: (file: string) => string = readLocalDocument,
  readBinarySource: (file: string) => Uint8Array = readLocalDocumentBytes,
  usRoadBasis: 'POSTAL_REFERENCE' | 'LEGACY_CITY' = 'POSTAL_REFERENCE',
  borderLinkBasis: 'UNRESOLVED_LINK' | 'PUBLIC_LINK_FORECAST' = 'UNRESOLVED_LINK',
  bobtailWearBasis: MxBobtailWearBasis = 'UNPRICED',
  crossborderLiabilityBasis: CrossborderLiabilityBasis = 'UNPRICED', rawCargoSelection?:unknown,
  rawCostProjection?:unknown) {
  if(usRoadBasis!=='POSTAL_REFERENCE'&&usRoadBasis!=='LEGACY_CITY')throw new Error('US_ROAD_BASIS_INVALID')
  if(borderLinkBasis!=='UNRESOLVED_LINK'&&borderLinkBasis!=='PUBLIC_LINK_FORECAST')throw new Error('BORDER_LINK_BASIS_INVALID')
  if(borderLinkBasis==='PUBLIC_LINK_FORECAST'&&usRoadBasis!=='POSTAL_REFERENCE')throw new Error('BORDER_LINK_REQUIRES_MATCHED_POSTAL_YARD_REFERENCE')
  if(bobtailWearBasis!=='UNPRICED'&&bobtailWearBasis!=='IMT_C3_NON_ARTICULATED_PROXY')throw new Error('MX_BOBTAIL_BASIS_INVALID')
  if(bobtailWearBasis==='IMT_C3_NON_ARTICULATED_PROXY'&&borderLinkBasis!=='PUBLIC_LINK_FORECAST')throw new Error('MX_BOBTAIL_REQUIRES_EXPLICIT_LINK_FORECAST')
  if(crossborderLiabilityBasis!=='UNPRICED'&&crossborderLiabilityBasis!=='PUBLIC_US_PRIMARY_LIABILITY_PROXY')throw new Error('CROSSBORDER_LIABILITY_BASIS_INVALID')
  if(crossborderLiabilityBasis==='PUBLIC_US_PRIMARY_LIABILITY_PROXY'&&borderLinkBasis!=='PUBLIC_LINK_FORECAST')throw new Error('CROSSBORDER_LIABILITY_REQUIRES_EXPLICIT_LINK_FORECAST')
  // The local reader already confines reads to docs, including realpath checks.
  const documents: Record<string, any> = {}
  for (const pin of REFERENCE_BUDGET_PINS) {
    const content = readSource(pin.file)
    if (createHash('sha256').update(content).digest('hex') !== pin.sha256) throw new Error(`SOURCE_HASH_MISMATCH:${pin.id}`)
    documents[pin.id] = JSON.parse(content)
  }
  const { capitalInsurance: ci, registration: reg, exposure, worksheet } = documents
  const sharedBoxInsurance=calculateOwnedTrailerInsurancePlanningReference(documents.sharedBoxInsurance)
  const sharedBoxTxCompliance=calculateSharedBoxTexasComplianceReference(documents.sharedBoxTxCompliance)
  const sharedBoxMxInspection=calculateSharedBoxMexicoInspectionReference(documents.sharedBoxMxInspection)
  for(const source of documents.permitComponentScenario.sources as {id:string;archive:{file:string;sha256:string}}[]) {
    // Preserve the canonical identity of the shared IRP archive across scenarios.
    const archiveSourceId=source.id==='IRP_INSTRUCTIONS_SCOPE'?'IRP_FEE_INSTRUCTIONS_2026':source.id
    if(createHash('sha256').update(readBinarySource(source.archive.file)).digest('hex')!==source.archive.sha256) throw new Error(`SOURCE_ARCHIVE_HASH_MISMATCH:${archiveSourceId}`)
  }
  const recurringPermitComponents=calculateRecurringPermitComponentScenario(documents.permitComponentScenario,
    documents.registration,documents.irpRules,documents.recurringCompliance,documents.sharedBoxTxCompliance)
  for(const source of [...sharedBoxTxCompliance.sources,...sharedBoxMxInspection.sources]) {
    if(source.archive && createHash('sha256').update(readBinarySource(source.archive.file)).digest('hex')!==source.archive.sha256) {
      throw new Error(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
    }
  }
  const market = documents.mxUsedMarket
  const fxArchive=documents.datedFx.source.archive
  const fxHtml=readSource(fxArchive.file)
  if(createHash('sha256').update(readBinarySource(fxArchive.file)).digest('hex')!==fxArchive.sha256) throw new Error('SOURCE_ARCHIVE_HASH_MISMATCH:BANXICO_FIX_20261001')
  const datedFx=verifyDatedFixArchive(documents.datedFx,fxHtml)
  const mxInsuranceArchive=documents.mxInsuranceModel.source.archive
  const mxInsuranceHtml=readSource(mxInsuranceArchive.file)
  if(createHash('sha256').update(readBinarySource(mxInsuranceArchive.file)).digest('hex')!==mxInsuranceArchive.sha256) throw new Error('SOURCE_ARCHIVE_HASH_MISMATCH:TIMI_CASCADIA2021_YEAR_TABLE')
  for(const source of documents.mxProspective.sources as {id:string;archive:{file:string;sha256:string}}[]) {
    if(createHash('sha256').update(readBinarySource(source.archive.file)).digest('hex')!==source.archive.sha256) throw new Error(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
  }
  const finance = documents.cashFinanced
  const trailerOverhead = documents.trailerOverhead
  const facilityStaffing = documents.facilityStaffing
  for (const source of [...documents.nlPayrollTax.sources,...documents.mxWorkRisk.sources,...documents.monitoringCoverage.sources,...documents.mxDrivingStage.sources] as {id:string;archive:{file:string;sha256:string}|null}[]) {
    if (source.archive && createHash('sha256').update(readBinarySource(source.archive.file)).digest('hex') !== source.archive.sha256) {
      throw new Error(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
    }
  }
  for (const source of [...trailerOverhead.sources, ...facilityStaffing.sources, ...documents.recurringCompliance.sources, ...documents.irpModel.sources, ...documents.irpRules.sources] as { id: string; archive: { file: string; sha256: string } }[]) {
    const content = /\.(pdf|xlsx)$/i.test(source.archive.file) ? readBinarySource(source.archive.file) : readSource(source.archive.file)
    if (createHash('sha256').update(content).digest('hex') !== source.archive.sha256) {
      throw new Error(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
    }
  }
  for (const source of [...market.sources, ...finance.sources] as { id: string; archive: { file: string; sha256: string } }[]) {
    if (createHash('sha256').update(readSource(source.archive.file)).digest('hex') !== source.archive.sha256) {
      throw new Error(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
    }
  }
  const newerBox = market.offers.find((o: { sourceId: string }) => o.sourceId === market.trailerMarketContrast.newerOfferId)
  const olderBox = market.offers.find((o: { sourceId: string }) => o.sourceId === market.trailerMarketContrast.olderOfferId)
  const specsMatch = (market.trailerMarketContrast.matchedSpecificationFields as string[]).every(key => newerBox[key] === olderBox[key])
  const modelYearGap = newerBox.year - olderBox.year
  if (!specsMatch || modelYearGap <= 0) throw new Error('TRAILER_MARKET_COMPARABILITY_MISMATCH')
  const publishedGap = newerBox.askingMxn - olderBox.askingMxn
  const tax = trailerOverhead.trailerTaxSensitivity
  const trailerTaxContrasts = (tax.olderQuoteBasisAlternatives as string[]).flatMap(olderQuoteBasis =>
    (tax.nonrecoverablePurchaseVatFractionAlternatives as number[]).map(nonrecoverablePurchaseVatFraction => compareReferenceAssetTaxBases({
      currency: 'MXN', newerQuotedNet: newerBox.askingMxn, olderQuotedAmount: olderBox.askingMxn, olderQuoteBasis,
      vatRate: tax.genericVatRateReference, nonrecoverablePurchaseVatFraction, analogyMonths: tax.analogyMonths,
      saleVatTreatment: tax.saleVatTreatment,
    })))
  const companyRows = (documents.overhead.companyPairs as { fieldSuffix: string; family: string; overlap: string }[]).map(row => {
    const componentIds = (trailerOverhead.overheadUnitComponents as { economicExpenseId: string; canonicalFieldsCovered: string[] }[])
      .filter(c => c.canonicalFieldsCovered.includes(row.fieldSuffix)).map(c => c.economicExpenseId)
    return { ...row, componentIds, status: componentIds.length ? 'UNIT_PRICE_COMPONENT_NOT_COMPLETE_EXPENSE' : 'UNRESOLVED_NOT_ZERO',
      quantity: null, adoptedUnitPrice: null, monthlyEconomicAmount: null }
  })
  if (companyRows.length !== 23 || new Set(companyRows.map(r => r.fieldSuffix)).size !== 23) throw new Error('COMPANY_INVENTORY_COVERAGE_MISMATCH')
  const wageSource = facilityStaffing.sources.find((s: { id: string }) => s.id === 'ADMIN_WAGE_READOUT')
  const wageReadout = JSON.parse(readSource(wageSource.archive.file))
  const usWages = wageReadout.sources.find((s: { id: string }) => s.id === 'BLS_ADMIN').rows as { role: string; annualUsd: number }[]
  // Revalidate the existing crosswalk without reauthoring its dated evidence.
  if (usWages.length !== ADMIN_ROLES.length || usWages.some((r, i) => r.role !== ADMIN_ROLES[i] ||
    r.annualUsd !== documents.payrollComparators.roleCrosswalkUS[i].meanAnnualWageUsd)) throw new Error('ADMIN_WAGE_CROSSWALK_MISMATCH')
  const mxWage = wageReadout.sources.find((s: { id: string }) => s.id === 'MX_TRACKING')
  const insuranceEmployer = documents.insuranceEmployer
  const mxEmployerScenario = documents.mxEmployerScenario.scenario
  const mxRules = documents.mxEmployerRules.normativeRulePack
  if(mxEmployerScenario.wageSourceId !== mxWage.id || mxEmployerScenario.location !== mxWage.location ||
    mxEmployerScenario.employeeCountAssumption !== 1 || mxEmployerScenario.umaDailyMxn !== mxRules.uma.dailyMxn ||
    mxEmployerScenario.ceavRate !== mxRules.ceav2026PublishedRows.at(-1).ratePercent/100) {
    throw new Error('MX_EMPLOYER_REFERENCE_MISMATCH')
  }
  const mxEmployerContrasts = (mxEmployerScenario.wageEndpoints as ('low'|'high')[]).map(endpoint => ({
    wageEndpoint:endpoint, wageSourceId:mxWage.id, sourceLocation:mxWage.location,
    advertisedGrossNetConfirmed:false,
    ...calculateMxEmployerReference({month:mxEmployerScenario.month,monthlySalaryMxn:mxWage.publishedMonthlyMxn[endpoint],
      compensationBasis:mxEmployerScenario.compensationBasis,profile:mxEmployerScenario.profile,
      umaDailyMxn:mxEmployerScenario.umaDailyMxn,ceavRate:mxEmployerScenario.ceavRate}),
  }))
  const employerScenario = insuranceEmployer.usEmployerScenario
  const nl = documents.nlPayrollTax.scenario
  if (nl.sourceLocation !== mxWage.location || nl.wageSourceId !== mxWage.id ||
      nl.compensationBasis !== mxEmployerScenario.compensationBasis || nl.profile !== mxEmployerScenario.profile ||
      nl.referenceRate !== documents.nlPayrollTax.rateEvidence.publishedReferenceRate) throw new Error('NL_PAYROLL_REFERENCE_MISMATCH')
  const nlPayrollTaxContrasts = mxEmployerContrasts.map(row => {
    const tax=calculateNlPayrollTaxReference({year:nl.year,jurisdiction:nl.jurisdiction,monthlySalaryMxn:row.monthlySalaryMxn,
      compensationBasis:nl.compensationBasis,profile:nl.profile,annualPaymentHypothesis:nl.annualPaymentHypothesis,
      reliefHypothesis:nl.reliefHypothesis,referenceRate:nl.referenceRate})
    return {
    wageEndpoint:row.wageEndpoint,sourceLocation:row.sourceLocation,advertisedGrossNetConfirmed:false,
    ...tax,
    employerContributionReferenceMonth:row.month,
    conditionalPlanningComponentSumMxn:row.conditionalComponentSumMxn+tax.meanMonthTaxAccrualMxn,
    combinesCalendarMonthContributionsWithAnnualBenefitAndTaxAccrual:true,
    }
  })
  const matchedStaffingScenario = facilityStaffing.staffingScenarios.find((s:{id:string}) => s.id === employerScenario.staffingScenarioId)
  const riskPolicy=documents.mxWorkRisk.scenario
  if (riskPolicy.sourceLocation !== mxWage.location || riskPolicy.wageSourceId !== mxWage.id ||
      riskPolicy.referenceRate !== documents.mxWorkRisk.ruleEvidence.initialMeanRateFraction ||
      riskPolicy.riskClass !== documents.mxWorkRisk.ruleEvidence.riskClass) throw new Error('MX_WORK_RISK_REFERENCE_MISMATCH')
  const mxEmployerRiskContrasts=mxEmployerContrasts.map((row,index) => {
    const risk=calculateMxWorkRiskReference({
      employerInput:{month:row.month,monthlySalaryMxn:row.monthlySalaryMxn,compensationBasis:row.compensationBasis,
        profile:row.profile,umaDailyMxn:row.umaDailyMxn,ceavRate:row.ceavRate},
      employerActivity:riskPolicy.employerActivity,employeeRegistrationHypothesis:riskPolicy.employeeRegistrationHypothesis,
      registrationBasis:riskPolicy.registrationBasis,riskClass:riskPolicy.riskClass,referenceRate:riskPolicy.referenceRate,
    })
    const tax=nlPayrollTaxContrasts[index]
    if (tax.wageEndpoint !== row.wageEndpoint || risk.sbcPeriodBaseMxn !== row.sbcPeriodBaseMxn) throw new Error('MX_EMPLOYER_COMPONENT_JOIN_MISMATCH')
    return {...risk,wageEndpoint:row.wageEndpoint,sourceLocation:row.sourceLocation,advertisedGrossNetConfirmed:false,
      meanMonthIsnAccrualMxn:tax.meanMonthTaxAccrualMxn,
      conditionalPlanningComponentSumMxn:risk.conditionalWageBenefitsContributionSumMxn === null ? null :
        risk.conditionalWageBenefitsContributionSumMxn+tax.meanMonthTaxAccrualMxn,
      combinesCalendarMonthContributionsWithAnnualBenefitAndTaxAccrual:true,
      administrativeEmployeeNotDriver:true,entireGroupPayrollEstablished:false,
    }
  })
  if (!matchedStaffingScenario || employerScenario.employeeCountPerRoleAssumption !== 1 ||
      employerScenario.roles.some((role:string) => matchedStaffingScenario.selectedRoleFteAssumptions[role] !== 1) ||
      insuranceEmployer.sources[1].transportMonthlyUsd !== ci.usInsurance.transportMonthlyPerPowerUnit) {
    throw new Error('INSURANCE_EMPLOYER_REFERENCE_MISMATCH')
  }
  const usEmployerContrast = calculateUsEmployerStatutoryReference({
    ruleYear:insuranceEmployer.usEmployerRule.ruleYear,
    socialSecurityRate:insuranceEmployer.usEmployerRule.socialSecurityRate,
    socialSecurityCapUsd:insuranceEmployer.usEmployerRule.socialSecurityCapUsd,
    medicareRate:insuranceEmployer.usEmployerRule.medicareRate,
    taxYear:employerScenario.taxYear,
    employees:(employerScenario.roles as string[]).map(role => ({id:role,
      annualTaxableWageUsd:usWages.find(w => w.role === role)!.annualUsd,compensationBasis:'WAGES_ONLY'})),
  })
  const facilityContrasts = (facilityStaffing.facilityScenarios as unknown[]).map(calculateFacilityReferenceContrast)
  type StaffingScenario = { id: string; country: 'MX' | 'US'; currency: 'MXN' | 'USD';
    selectedRoleFteAssumptions: Partial<Record<typeof ADMIN_ROLES[number], number>>;
    mxTrackingEndpoint: 'low' | 'high' | null; assumption: string }
  const staffingContrasts = (facilityStaffing.staffingScenarios as StaffingScenario[]).map(s => calculateStaffingReferenceContrast({
    scenarioId: s.id, country: s.country, currency: s.currency, assumption: s.assumption, illustrativeNotCarrierFacts: true,
    roles: ADMIN_ROLES.map(role => {
      const fte = s.selectedRoleFteAssumptions[role] ?? null
      const wage = s.country === 'US' ? usWages.find(r => r.role === role)!.annualUsd / 12
        : role === 'TRACKING_CS' && s.mxTrackingEndpoint ? mxWage.publishedMonthlyMxn[s.mxTrackingEndpoint] : null
      return { role, fte, fteRationale: fte === null ? null : s.assumption, monthlyWageReference: wage,
        wageBasis: wage === null ? null : s.country === 'US' ? 'WORKER_WAGES_ONLY' : 'ADVERTISED_SALARY_BASIS_UNRESOLVED',
        sourceId: wage === null ? null : s.country === 'US' ? 'BLS_ADMIN' : 'MX_TRACKING' }
    }),
  }))
  const coverageDocument = documents.monitoringCoverage
  const monitoringCoverageContrast = calculateMonitoringCoverageReference(coverageDocument.scenario)
  if (coverageDocument.integration.role !== 'TRACKING_CS' ||
      coverageDocument.integration.economicExpenseId !== 'GROUP_ADMIN_COMPANY_SINGLE_POOL' ||
      monitoringCoverageContrast.year !== Number(documents.mxEmployerScenario.scenario.month.slice(0,4)) ||
      coverageDocument.quantityPolicy.sourceGeographyUnchanged !== mxWage.location) {
    throw new Error('MONITORING_EMPLOYER_SCOPE_JOIN_MISMATCH')
  }
  const monitoringPlanningPayrollContrasts = mxEmployerRiskContrasts.map(row => {
    const staffing = calculateStaffingReferenceContrast({
      scenarioId: `${monitoringCoverageContrast.scenarioId}_${row.wageEndpoint}`,
      country: 'MX', currency: 'MXN', assumption: 'Rounded annual seat-capacity headcount; full monthly wage retained under explicit six-hour-shift hypothesis; not observed roster',
      illustrativeNotCarrierFacts: true,
      roles: ADMIN_ROLES.map(role => ({role,
        fte: role === 'TRACKING_CS' ? monitoringCoverageContrast.roundedPlanningHeadcount : null,
        fteRationale: role === 'TRACKING_CS' ? 'monitoringCoverage#/scenario; quantity derived from annual seat hours, break relief, weekly rest and vacation' : null,
        monthlyWageReference: role === 'TRACKING_CS' ? row.monthlySalaryMxn : null,
        wageBasis: role === 'TRACKING_CS' ? 'ADVERTISED_SALARY_BASIS_UNRESOLVED' : null,
        sourceId: role === 'TRACKING_CS' ? 'MX_TRACKING' : null,
      })),
    })
    return {wageEndpoint: row.wageEndpoint, sourceLocation: row.sourceLocation,
      economicExpenseId: 'GROUP_ADMIN_COMPANY_SINGLE_POOL', staffing,
      employeeReferenceMonth: row.month,
      knownPerEmployeePlanningComponentMxn: row.conditionalPlanningComponentSumMxn,
      conditionalStaffingPlanningComponentMxn: row.conditionalPlanningComponentSumMxn === null ? null :
        row.conditionalPlanningComponentSumMxn * monitoringCoverageContrast.roundedPlanningHeadcount,
      endpointsAreAlternativesNotAdditive: true, oneEmployeeBaselineAddedAgain: false,
      vacationWagesAddedAgain: false, salaryProratedByShorterShift: false,
      mixesCalendarMonthContributionsWithAnnualAccrual: true,
      sundayHolidayPremiumAndEmployerEffectsMxn: null,
      employerRegistrationAndGrossWageAreHypotheses: true,
      completeMonthlyAdminEmployerCostMxn: null, monthlyGroupEconomicCostUsd: null,
      actualFleetQuantity: null, monitoredUnitsPerSeat: null, allocationShares: null,
      resourceCostAllocationMxn: null, fxConversionPerformed: false,
      coversContinuousOperations: false, eligibleForBudget: false, selected: false,
    }
  })
  const mxAsking = ci.assetReferences.find((a: { resourceId: string }) => a.resourceId === 'MX_TRACTOR').asking.value as number
  const usAsking = ci.assetReferences.find((a: { resourceId: string }) => a.resourceId === 'US_TRACTOR').asking.value as number
  const plan = finance.mxHistoricalStressPlan
  const mxDown = mxAsking * finance.mxHistoricalOffer.downPaymentFraction
  const mxPrincipal = mxAsking - mxDown
  const mxStress = (plan.ratesUsedAsPlanningAnnualNominal as number[]).map(annualRate => calculateReferenceDebtSchedule({
    currency: 'MXN', principal: mxPrincipal, rateKind: 'EXPLICIT_PLANNING_NOMINAL_ANNUAL', annualRate,
    termMonths: plan.termMonths, comparisonMonths: plan.comparisonMonths, totalGraceMonths: plan.totalGraceMonths,
    graceTreatment: plan.graceTreatment, openingFeeCash: mxPrincipal * finance.mxHistoricalOffer.openingFeeFractionOfFinancedAmount,
    feeTreatment: plan.feeTreatment, balloon: plan.balloon,
  }))
  const baselineAudit = reconcileBinationalFixedBudget(worksheet.budget)
  const reviewedInsurance = applyUsTractorInsurancePublicModel(worksheet.budget,documents.usInsurancePublicModel)
  for(const source of reviewedInsurance.model.sources) {
    if(createHash('sha256').update(readBinarySource(source.archive.file)).digest('hex')!==source.archive.sha256) throw new Error(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
  }
  let audit = reconcileBinationalFixedBudget(reviewedInsurance.budget)
  let resourceBudgetExposure = reconcileReferenceBudgetExposure(reviewedInsurance.budget, documents.resourceExposure.exposurePlan)
  const drivingStage = documents.mxDrivingStage
  for (const pin of drivingStage.reusedPins as {id:string;file:string;sha256:string}[]) {
    if (!REFERENCE_BUDGET_PINS.some(p => p.id === pin.id && p.file === pin.file && p.sha256 === pin.sha256)) throw new Error('DRIVING_STAGE_REUSED_PIN_MISMATCH')
  }
  const mxDetail = documents.sakbeMxDetail
  if (mxDetail.provider !== 'INEGI_SAKBE_V3_1' || mxDetail.country !== 'MX' || mxDetail.direction !== 'MX_TO_US' ||
      mxDetail.request.origin.id !== 2656 || mxDetail.request.destination.id !== 301105 ||
      documents.case.route.mxEndpoint !== 'Mexico, DF' || documents.case.route.mxGateway !== 'Nuevo Laredo' ||
      documents.selection.confirmations.referenceVariant.id !== 'OWN_MX_US_RELAY_SAME_TRAILER') throw new Error('DRIVING_STAGE_CASE_SCOPE_MISMATCH')
  const segments = mxDetail.observations.segments as {index:number;distanceMeters:number;idealMinutes:number}[]
  if (!segments.length || segments.some((s,i) => s.index !== i || !Number.isFinite(s.distanceMeters) || !Number.isFinite(s.idealMinutes) || s.distanceMeters < 0 || s.idealMinutes < 0)) throw new Error('DRIVING_STAGE_SEGMENT_INTEGRITY_MISMATCH')
  const summedKm = segments.reduce((sum,s) => sum+s.distanceMeters,0)/1000
  const summedMinutes = segments.reduce((sum,s) => sum+s.idealMinutes,0)
  if (Math.abs(summedKm-mxDetail.observations.detailTotals.distanceKm) > 1e-7 ||
      Math.abs(summedMinutes-mxDetail.observations.detailTotals.idealMinutes) > 1e-7) throw new Error('DRIVING_STAGE_TOTAL_MISMATCH')
  const mxDrivingStageContrasts = (drivingStage.scenarios as Record<string,unknown>[]).map(s =>
    calculateMxDrivingStageReference({...s,nominalDrivingMinutes:summedMinutes}))
  const boxProjection=documents.sharedBoxProjection
  const boxCapacity=boxProjection.capacityScenario
  const historicalMxCapacity=exposure.sources.find((s:{id:string})=>s.id===boxCapacity.sourceId)
  if (boxProjection.artifact!=='FCM_B2_SHARED_BOX_CAPITAL_EXPOSURE_SENSITIVITY' ||
      boxProjection.physicalScope!=='OWN_MX_US_RELAY_SAME_TRAILER' || boxProjection.physicalBoxCount!==1 ||
      boxProjection.quoteReady!==false || boxProjection.adoptedValues!==0 ||
      boxCapacity.actualProductiveBoxCapacityConfirmed!==false ||
      !historicalMxCapacity || historicalMxCapacity.annualDistance.unit!=='km/vehicle-year' ||
      historicalMxCapacity.annualDistance.value!==boxCapacity.annualKm ||
      historicalMxCapacity.annualOperatingDays.value!==boxCapacity.annualOperatingDays ||
      boxCapacity.monthsPerYear!==exposure.method.monthsPerYear ||
      boxProjection.capitalScenario.unknownAcquisitionDisposalFinanceCorrectionsSetToZero!==false ||
      boxProjection.phasePolicy.noUnknownPhaseSetToZero!==true || boxProjection.phasePolicy.prefixAmountsMayBeAdded!==false) {
    throw new Error('SHARED_BOX_PROJECTION_SCOPE_MISMATCH')
  }
  const boxMovementSensitivities=mxDrivingStageContrasts.flatMap(movement=>trailerTaxContrasts.map(c=>({
    movementScenarioId:movement.scenarioId,
    ...projectSharedTrailerReference({resourceId:'SHARED_TRAILER',physicalBoxCount:boxProjection.physicalBoxCount,
      physicalScope:boxProjection.physicalScope,currency:'MXN',capacityBasis:boxCapacity.basis,
      capacitySourceId:boxCapacity.sourceId,monthlyKm:boxCapacity.annualKm/boxCapacity.monthsPerYear,
      monthlyAssetDays:boxCapacity.annualOperatingDays/boxCapacity.monthsPerYear,
      scope:boxProjection.phasePolicy.scope,mxDistanceKm:summedKm,
      mxMovementElapsedHours:movement.conditionalMovementOnlyElapsedHours,
      usDistanceKm:boxProjection.phasePolicy.usDistanceKm,
      usMovementElapsedHours:boxProjection.phasePolicy.usMovementElapsedHours,
      borderDetachedHours:boxProjection.phasePolicy.borderDetachedHours},c.input),
  })))
  const googleReceipt = documents.googleUsReceipt
  if (googleReceipt.routeContentPersisted !== false || googleReceipt.handoff.loadedKm !== null ||
      googleReceipt.handoff.cycleDays !== null) throw new Error('US_RECEIPT_SCOPE_CHANGED_REVIEW_REQUIRED')
  for (const pin of documents.variableComponents.reusedPins as {id:string;file:string;sha256:string}[]) {
    if (!REFERENCE_BUDGET_PINS.some(p=>p.id === pin.id && p.file === pin.file && p.sha256 === pin.sha256)) {
      throw new Error('VARIABLE_COMPONENT_REUSED_PIN_MISMATCH')
    }
  }
  const variableReferenceFileChecks = {
    fuel:verifyFuelFiles(documents.fuelReference,file=>Buffer.from(readBinarySource(file))),
    maintenance:verifyMaintenanceFiles(documents.maintenanceReference,file=>Buffer.from(readBinarySource(file))),
  }
  const supportingVariableEconomics = calculateVariableComponentReferences(documents.variableComponents,
    documents.fuelReference,documents.maintenanceReference,
    {country:'MX',distanceKm:summedKm,basis:'SAKBE_CANDIDATE_DISTANCE_NOT_TRUCK_APPROVED'})
  for (const pin of documents.driverComponents.reusedPins as {id:string;file:string;sha256:string}[]) {
    if (!REFERENCE_BUDGET_PINS.some(p=>p.id===pin.id && p.file===pin.file && p.sha256===pin.sha256)) {
      throw new Error('DRIVER_COMPONENT_REUSED_PIN_MISMATCH')
    }
  }
  const driverArchive=documents.driverComponents.usSource.archive
  if (createHash('sha256').update(readBinarySource(driverArchive.file)).digest('hex')!==driverArchive.sha256) {
    throw new Error('DRIVER_COMPONENT_ARCHIVE_HASH_MISMATCH')
  }
  const supportingDriverEconomics=calculateDriverComponentReferences(documents.driverComponents,
    documents.pilotAssetLabor,documents.laborBridge,
    {country:'MX',distanceKm:summedKm,basis:'SAKBE_CANDIDATE_DISTANCE_NOT_TRUCK_APPROVED'})
  const capacity = documents.dryVanCapacity
  type CapacityObservation = { id: string; sourceId: string; start: string; end: string; months: number;
    reportedThousandTotalMiles: number; reportedEmptyMilesPercent: number;
    averageCompanyDriverTrucks: number; averageOwnerOperatorTrucks: number }
  const capacityObservations = (capacity.observations as CapacityObservation[]).map(o => ({
    ...o,
    reportedFleetTotalKm: o.reportedThousandTotalMiles * 1000 * capacity.calculationPolicy.mileToKm,
    reportedFleetMeanMonthKm: o.reportedThousandTotalMiles * 1000 * capacity.calculationPolicy.mileToKm / o.months,
    distanceUnit: 'km/reported-mileage-population-average-month' as const,
    monthlyKmPerTractor: null, monthlyProductiveDays: null,
    physicalEmptyDefinitionConfirmed: false,
    conditionalTotalKmPerLoadedKm: 1 / (1 - o.reportedEmptyMilesPercent / 100),
    conditionalFactorBasis: 'IF_REPORTED_EMPTY_FACTOR_EQUALS_ALL_PHYSICAL_EMPTY_SHARE_NOT_CONFIRMED' as const,
    appliedToPilot: false, eligibleForResourceExposure: false,
  }))
  const denominator = documents.dryVanDenominator
  // A conditional quotient is useful for a public-model hypothesis, not evidence
  // that all miles belong to the denominator or that calendar days are productive.
  const capacityCandidates = capacityObservations.map(o => {
    const combinedAverageTrucks = o.averageCompanyDriverTrucks + o.averageOwnerOperatorTrucks
    const tenQAverage = (denominator.averageTrucksInService as { observationId: string; value: number }[])
      .find(row => row.observationId === o.id)
    if (tenQAverage && tenQAverage.value !== combinedAverageTrucks) throw new Error('DRYVAN_AVERAGE_COUNT_MISMATCH')
    return {
      observationId: o.id, start: o.start, end: o.end, months: o.months,
      sourceRefs: [`dryVanCapacity#/observations/${capacityObservations.indexOf(o)}`, 'dryVanDenominator'],
      combinedAverageTrucks,
      tenQAverageTrucksInService: tenQAverage?.value ?? null,
      averageCountCorroborated: tenQAverage !== undefined,
      conditionalKmPerCombinedAverageTruckMonth: o.reportedFleetMeanMonthKm / combinedAverageTrucks,
      companyOnlyDivisorContrastKmPerMonth: o.reportedFleetMeanMonthKm / o.averageCompanyDriverTrucks,
      companyOnlyContrastIsOwnedProductivity: false,
      unit: 'km/(combined-average-truck*period-average-month)' as const,
      classification: 'CONDITIONAL_PUBLIC_MODEL_PROXY_NOT_OBSERVED_OWNED_CAPACITY' as const,
      monthlyProductiveAssetDays: null,
      appliedToPilot: false, eligibleForResourceExposure: false,
    }
  })
  type ProductivityStatement = { previousObservationId: string; currentObservationId: string;
    releasePercent: number | null; tenQPercent: number; publishedMetric: string }
  const productivityComparisons = (denominator.productivityStatements as ProductivityStatement[]).map(statement => {
    const previous = capacityCandidates.find(c => c.observationId === statement.previousObservationId)
    const current = capacityCandidates.find(c => c.observationId === statement.currentObservationId)
    if (!previous || !current || previous.months !== current.months) throw new Error('DRYVAN_COMPARISON_PERIOD_MISMATCH')
    const conditionalQuotientChangePercent = 100 * (current.conditionalKmPerCombinedAverageTruckMonth /
      previous.conditionalKmPerCombinedAverageTruckMonth - 1)
    return { ...statement, conditionalQuotientChangePercent,
      quotientMinusTenQPercentagePoints: conditionalQuotientChangePercent - statement.tenQPercent,
      releaseMinusTenQPercentagePoints: statement.releasePercent === null ? null : statement.releasePercent - statement.tenQPercent,
      quotientMetric: 'KM_PER_COMBINED_AVERAGE_TRUCK_PERIOD_AVERAGE_MONTH',
      quotientIsPublishedDayMetric: false, sourceConflictResolved: false, numericalMatchProvesPopulationJoin: false }
  })
  const us = (exposure.sources as ExposureSource[]).find(s => s.id === 'ATRI_2025_NATIONAL_2024')!
  const mx = (exposure.sources as ExposureSource[]).find(s => s.id === 'IMT_PT260_CASE')!
  const months = exposure.method.monthsPerYear as number
  const mileToKm = exposure.method.mileToKm as number
  const usMonthDays = us.annualOperatingDays.value / months
  const monthlyInsurance = ci.usInsurance.transportMonthlyPerPowerUnit as number
  const conditionalUs = (ci.usConditionalValueLoss.scenarios as LossScenario[]).map(s => {
    const monthKm = s.annualMiles * mileToKm / months
    const referenceSum = s.askingValueLossMonthlyUsd + monthlyInsurance
    return {
      id: s.id, useMultiplier: s.useMultiplier,
      grossAskingValueLossMonthlyUsd: s.askingValueLossMonthlyUsd,
      publishedNationalInsuranceMonthlyUsd: monthlyInsurance,
      conditionalComponentSumUsdPerMonth: referenceSum,
      monthlyKmReference: monthKm, monthlyOperatingDaysReference: usMonthDays,
      distanceAllocationReferenceUsdPerKm: referenceSum / monthKm,
      timeAllocationReferenceUsdPerDay: referenceSum / usMonthDays,
      classification: 'CROSS_COHORT_COUNTERFACTUAL_NOT_OBSERVED_BUDGET' as const,
      isMinimumCost: false, eligibleForBudget: false, selected: false,
    }
  })
  const budgetRows = audit.lineage.expenses.map(e => ({
    economicExpenseId: e.economicExpenseId, family: e.family,
    resources: e.allocations.map(a => a.resourceId), ...structuredClone(rowEvidence[e.economicExpenseId]),
    completeAmountUsdPerMonth: e.amount?.value ?? null,
    status: e.amount===null ? 'INCOMPLETE_NOT_FILLED_WITH_REFERENCE_COMPONENTS' : 'DOCUMENTED_PUBLIC_MODEL_NOT_CALIBRATED',
  }))
  budgetRows.find(row => row.economicExpenseId === 'US_TRACTOR_PERMITS')!.refs.push('irpUsBatch#/rules', 'irpUsBatch#/excludedDependentRules')
  const reviewedUsInsuranceRow=budgetRows.find(row=>row.economicExpenseId==='US_TRACTOR_INSURANCE')!
  reviewedUsInsuranceRow.refs.push('usInsurancePublicModel#/sources','usInsurancePublicModel#/modelAssumptions')
  reviewedUsInsuranceRow.missing=['Actual matched policy, box overlap and invoice terms remain unverified; modeled premium scope is explicit, not operational or calibration acceptance.']
  budgetRows.find(row => row.economicExpenseId === 'US_TRACTOR_PERMITS')!.refs.push('irpUsWeightRules#/rules', 'irpUsWeightRules#/excludedOrDependentRules')
  budgetRows.find(row => row.economicExpenseId === 'US_TRACTOR_PERMITS')!.refs.push('irpCurrencyValue#/registrationRules', 'irpCurrencyValue#/valueTestRules')
  budgetRows.find(row => row.economicExpenseId === 'US_TRACTOR_PERMITS')!.refs.push('irpAssetValue#/maine', 'irpAssetValue#/purchaseSensitivities')
  budgetRows.find(row => row.economicExpenseId === 'US_TRACTOR_PERMITS')!.refs.push('irpSeparableRegistration#/rules')
  budgetRows.find(row => row.economicExpenseId === 'US_TRACTOR_PERMITS')!.refs.push('irpStateReferences#/rules', 'irpStateReferences#/retainedBlocks')
  for(const id of ['MX_TRACTOR_INSURANCE','US_TRACTOR_INSURANCE','SHARED_TRAILER_INSURANCE']) {
    budgetRows.find(row => row.economicExpenseId === id)!.refs.push('insuranceEmployer#/insurancePolicy')
  }
  budgetRows.find(row=>row.economicExpenseId==='SHARED_TRAILER_INSURANCE')!.refs.push('sharedBoxInsurance#/source','sharedBoxInsurance#/publishedMonthlyRangeUsd','sharedBoxInsurance#/annualValueRate')
  budgetRows.find(row=>row.economicExpenseId==='SHARED_TRAILER_PERMITS')!.refs.push('sharedBoxTxCompliance#/fees','sharedBoxTxCompliance#/sources','sharedBoxTxCompliance#/limitations')
  budgetRows.find(row=>row.economicExpenseId==='SHARED_TRAILER_PERMITS')!.refs.push('sharedBoxMxInspection#/publishedPriceGrossMxn','sharedBoxMxInspection#/sources','sharedBoxMxInspection#/limitations')
  budgetRows.find(row => row.economicExpenseId === 'GROUP_ADMIN_COMPANY_SINGLE_POOL')!.refs.push('insuranceEmployer#/usEmployerScenario','insuranceEmployer#/mxEmployer')
  budgetRows.find(row => row.economicExpenseId === 'GROUP_ADMIN_COMPANY_SINGLE_POOL')!.refs.push('mxEmployerScenario#/scenario','mxEmployerRules#/normativeRulePack')
  budgetRows.find(row => row.economicExpenseId === 'GROUP_ADMIN_COMPANY_SINGLE_POOL')!.refs.push('nlPayrollTax#/scenario','nlPayrollTax#/rateEvidence')
  budgetRows.find(row => row.economicExpenseId === 'GROUP_ADMIN_COMPANY_SINGLE_POOL')!.refs.push('mxWorkRisk#/scenario','mxWorkRisk#/ruleEvidence')
  budgetRows.find(row => row.economicExpenseId === 'GROUP_ADMIN_COMPANY_SINGLE_POOL')!.refs.push('monitoringCoverage#/scenario','monitoringCoverage#/integration')
  if (budgetRows.length !== 10 || budgetRows.some(r => !r.refs || !r.missing)) throw new Error('BUDGET_ROW_COVERAGE_MISMATCH')
  const profiles = documents.economicProfiles
  const use = profiles.usHistoricalUse as { [key: string]: unknown;
    sourceArchive: { file: string; sha256: string }; records: { date: string; odometerMiles: number }[];
    normalizationDaysPerYear: number; normalizationMonthsPerYear: number }
  const historyArchive = readSource(use.sourceArchive.file)
  if (createHash('sha256').update(historyArchive).digest('hex') !== use.sourceArchive.sha256) throw new Error('SOURCE_ARCHIVE_HASH_MISMATCH:US_ASSET_HISTORY')
  const methodPin = profiles.jointUsCapitalExposure.capitalMethodPin
  const methodBytes = readSource(methodPin.file)
  if (createHash('sha256').update(methodBytes).digest('hex') !== methodPin.sha256) throw new Error('SOURCE_HASH_MISMATCH:US_CAPITAL_METHOD')
  const method = JSON.parse(methodBytes)
  const coefficients = method.sources.find((s: { id: string }) => s.id === 'ANL_ESD_21_4')
  const holdingMonths = profiles.jointUsCapitalExposure.planningHoldingMonths as number
  if (holdingMonths !== method.method.horizonMonths || holdingMonths !== ci.usConditionalValueLoss.windowMonths ||
    coefficients.annualAgeRetention !== ci.usConditionalValueLoss.ageRetentionPerYear ||
    coefficients.retentionPerThousandAdditionalMiles !== ci.usConditionalValueLoss.retentionPerThousandAdditionalMiles) throw new Error('US_CAPITAL_METHOD_MISMATCH')
  type OdometerRow = { date: string; odometerMiles: number }
  const odometerRecords = use.records as OdometerRow[]
  const elapsedUse = (previous: OdometerRow, current: OdometerRow) => {
    const elapsedCalendarDays = (Date.parse(`${current.date}T00:00:00Z`) - Date.parse(`${previous.date}T00:00:00Z`)) / 86400000
    const additionalMiles = current.odometerMiles - previous.odometerMiles
    if (!Number.isInteger(elapsedCalendarDays) || elapsedCalendarDays <= 0 || !Number.isSafeInteger(additionalMiles) || additionalMiles < 0) throw new Error('US_ODOMETER_CHRONOLOGY_MISMATCH')
    return { start: previous.date, end: current.date, elapsedCalendarDays, additionalMiles,
      additionalKm: additionalMiles * mileToKm,
      meanKmPerElapsedCalendarDay: additionalMiles * mileToKm / elapsedCalendarDays,
      annualizedMeanMonthKm: additionalMiles * mileToKm / elapsedCalendarDays * use.normalizationDaysPerYear / use.normalizationMonthsPerYear,
      operatingDays: null, productiveAssetDays: null, forwardForecast: false }
  }
  const odometerIntervals = odometerRecords.slice(1).map((current, i) => elapsedUse(odometerRecords[i], current))
  const fullHistoryUse = elapsedUse(odometerRecords[0], odometerRecords[odometerRecords.length - 1])
  const latestIntervalUse = odometerIntervals[odometerIntervals.length - 1]
  const jointExposure = [
    ...(profiles.jointUsCapitalExposure.periodObservationIds as string[]).map(id => {
      const c = capacityCandidates.find(c => c.observationId === id)
      if (!c) throw new Error('US_CAPITAL_EXPOSURE_REFERENCE_MISSING')
      return { id, monthlyKm: c.conditionalKmPerCombinedAverageTruckMonth, basis: 'CONDITIONAL_PAMT_COMBINED_AVERAGE_PROXY',
        sourceRef: `dryVanCapacity#/observations/${capacityObservations.findIndex(o => o.id === id)}` }
    }),
    { id: 'FULL_PUBLISHED_HISTORY', monthlyKm: fullHistoryUse.annualizedMeanMonthKm, basis: 'ONE_VIN_ELAPSED_CALENDAR_RATE_NOT_FORECAST', sourceRef: 'economicProfiles#/usHistoricalUse/records' },
    { id: 'LATEST_PUBLISHED_INTERVAL', monthlyKm: latestIntervalUse.annualizedMeanMonthKm, basis: 'ONE_VIN_ELAPSED_CALENDAR_RATE_NOT_FORECAST', sourceRef: 'economicProfiles#/usHistoricalUse/records' },
  ].map(s => {
    // Incremental miles, not current odometer + future miles. C and q both change
    // with this same scenario's use; the result remains one capital piece only.
    const additionalMiles = s.monthlyKm / mileToKm * holdingMonths
    const retention = coefficients.annualAgeRetention ** (holdingMonths / months) *
      coefficients.retentionPerThousandAdditionalMiles ** (additionalMiles / 1000)
    const grossEndpointUsd = usAsking * retention
    const askingValueLossMonthlyUsd = (usAsking - grossEndpointUsd) / holdingMonths
    return { ...s, holdingMonths, additionalMiles, retention, grossEndpointUsd, askingValueLossMonthlyUsd,
      askingValueLossPerScenarioKmUsd: askingValueLossMonthlyUsd / s.monthlyKm,
      completeCapitalUsd: null, completeFixedBudgetUsd: null, productiveAssetDays: null,
      sameMileageInCapitalAndDistanceDivisor: true, crossSourceJointObservation: false,
      appliedToPilot: false, eligibleForResourceExposure: false, priceOrCfuFloor: false }
  })
  const usCapitalReview = documents.usCapitalComparison
  if (usCapitalReview.scenario.holdingMonths !== holdingMonths ||
    usCapitalReview.scenario.downPaymentFraction !== finance.usPublishedOffer.downPaymentFraction ||
    usCapitalReview.scenario.loanMonths !== finance.usPublishedOffer.maximumTermMonths ||
    usCapitalReview.eligibleForBudget !== false || usCapitalReview.calibrated !== false) {
    throw new Error('US_CAPITAL_COMPARISON_REFERENCE_MISMATCH')
  }
  const usCapitalScenarios = jointExposure.map(exposure => ({
    exposureId:exposure.id, exposureSourceRef:exposure.sourceRef,
    ...calculateUsCapitalComparison({...usCapitalReview.scenario, askingUsd:usAsking,
      monthlyKm:exposure.monthlyKm, annualAgeRetention:coefficients.annualAgeRetention,
      retentionPerThousandAdditionalMiles:coefficients.retentionPerThousandAdditionalMiles,
      listingFeeUsd:usCapitalReview.source.listingFeeUsd}),
  }))
  budgetRows.find(row=>row.economicExpenseId==='US_TRACTOR_CAPITAL')!.refs.push(
    'usCapitalComparison#/source','usCapitalComparison#/scenario')
  const prospectiveReference=usCapitalScenarios.find(s=>s.exposureId===documents.usProspectiveCapital.exposureId)
  if(!prospectiveReference) throw new Error('US_PROSPECTIVE_CAPITAL_REFERENCE_MISSING')
  const prospectiveCash=applyUsProspectiveCapitalPublicModel(reviewedInsurance.budget,documents.usProspectiveCapital,prospectiveReference,'CASH')
  const prospectiveFinanced=applyUsProspectiveCapitalPublicModel(reviewedInsurance.budget,documents.usProspectiveCapital,prospectiveReference,'FINANCED')
  const boxCashScenarios=(['NET_PLUS_VAT','GROSS_INCLUDES_VAT'] as const).map(id=>{
    const applied=applyBoxProspectiveCashScenario(prospectiveCash.budget,documents.boxProspective,market,datedFx,id)
    const reconciled=reconcileBinationalFixedBudget(applied.budget)
    return {id,scenario:applied.scenario,model:applied.model,budget:reconciled.lineage,status:reconciled.status,
      issues:reconciled.issues,modeledExpenseRows:reconciled.lineage.expenses.filter(e=>e.amount!==null).length,
      completeGroupMonthlyUsd:reconciled.monthlyGroupTotalUsd,cfuUsd:reconciled.cfuUsd,cvuUsd:reconciled.cvuUsd}
  })
  const rodalReference=market.offers.find((o:{sourceId:string})=>o.sourceId==='RODAL_2021')
  const boxFinancePlanning=calculateSharedBoxFinancePlanning({netAssetValueMxn:630000,mxnPerUsd:datedFx.mxnPerUsd,
    cashScenarios:boxCashScenarios.map(s=>({id:s.id,monthlyCapitalMxn:s.scenario.monthlyCapitalMxn}))})
  const mxCapitalScenarios=(['CASH','FINANCED_LOW','FINANCED_HIGH'] as const).map(id=>{
    const base=id==='CASH'?prospectiveCash.budget:prospectiveFinanced.budget
    const applied=applyMxProspectiveCapitalScenario(base,documents.mxProspective,rodalReference,datedFx,fxHtml,id)
    const reconciled=reconcileBinationalFixedBudget(applied.budget)
    return {id,scenario:applied.scenario,model:applied.model,budget:reconciled.lineage,status:reconciled.status,
      issues:reconciled.issues,modeledExpenseRows:reconciled.lineage.expenses.filter(e=>e.amount!==null).length,
      completeGroupMonthlyUsd:reconciled.monthlyGroupTotalUsd,cfuUsd:reconciled.cfuUsd,cvuUsd:reconciled.cvuUsd}
  })
  const allCapitalCashScenarios=boxCashScenarios.map(box=>{
    const applied=applyMxProspectiveCapitalScenario(box.budget,documents.mxProspective,rodalReference,datedFx,fxHtml,'CASH')
    const reconciled=reconcileBinationalFixedBudget(applied.budget)
    return {boxTaxScenario:box.id,budget:reconciled.lineage,status:reconciled.status,issues:reconciled.issues,
      modeledExpenseRows:reconciled.lineage.expenses.filter(e=>e.amount!==null).length,
      completeGroupMonthlyUsd:reconciled.monthlyGroupTotalUsd,cfuUsd:reconciled.cfuUsd,cvuUsd:reconciled.cvuUsd}
  })
  const mxCapitalRow=budgetRows.find(row=>row.economicExpenseId==='MX_TRACTOR_CAPITAL')!
  const mxInsuranceScenarios=[...mxCapitalScenarios.map(s=>({id:s.id,budget:s.budget})),
    ...allCapitalCashScenarios.map(s=>({id:`ALL_CAPITAL_CASH_${s.boxTaxScenario}`,budget:s.budget}))].map(s=>{
    const applied=applyMxTractorInsurancePublicModel(s.budget,documents.mxInsuranceModel,mxInsuranceHtml,datedFx,fxHtml)
    const reconciled=reconcileBinationalFixedBudget(applied.budget)
    return {id:s.id,model:applied.model,budget:reconciled.lineage,status:'INCOMPLETE' as const,budgetAuditStatus:reconciled.status,
      issues:[...reconciled.issues,...applied.model.unresolvedCoverage.map(code=>({field:'D2D_INSURANCE_SCOPE',code}))],
      modeledExpenseRows:reconciled.lineage.expenses.filter(e=>e.amount!==null).length,
      completeGroupMonthlyUsd:null,cfuUsd:null,cvuUsd:null,completeD2DInsurance:false}
  })
  const mxInsuranceRow=budgetRows.find(row=>row.economicExpenseId==='MX_TRACTOR_INSURANCE')!
  const partialFixedReferenceScenarios=mxInsuranceScenarios.filter(s=>s.id.startsWith('ALL_CAPITAL_CASH_')).map(s=>{
    const budgetExpenseLines=s.budget.expenses.filter(e=>e.amount!==null).map(e=>({id:e.economicExpenseId,
      resourceId:e.allocations[0].resourceId,monthlyUsd:e.amount!.value,kind:'REVIEWED_MODEL_EXPENSE' as const}))
    if(budgetExpenseLines.some(e=>e.id.includes('PERMITS'))) throw new Error('PARTIAL_FIXED_PERMIT_DOUBLE_COUNT')
    const permitLines=recurringPermitComponents.lines.map(l=>({id:l.id,resourceId:l.resourceId,
      monthlyUsd:l.monthlyExactUsd,kind:'PARTIAL_PERMIT_COMPONENT_NOT_COMPLETE_FAMILY' as const}))
    const lines=[...budgetExpenseLines,...permitLines]
    const knownMonthlyModelComponentSumUsd=lines.reduce((sum,l)=>sum+l.monthlyUsd,0)
    return {id:s.id,lines,knownMonthlyModelComponentSumUsd,displayUsd:Math.round(knownMonthlyModelComponentSumUsd*100)/100,
      knownResourceMonthlyComponents:Object.fromEntries(BINATIONAL_RESOURCES.map(id=>[id,lines.filter(l=>l.resourceId===id).reduce((sum,l)=>sum+l.monthlyUsd,0)])),
      completeFixedBudgetUsd:null,completeD2DCostUsd:null,isLowerBound:false,isCarrierObservedCost:false,
      adminPoolAdded:false,oneSharedBox:true,missingAmountsDefaultedToZero:false,calibrated:false,quoteReady:false}
  })
  for(const source of documents.adminPool.sources as {id:string;archive:{file:string;sha256:string}}[]) {
    if(createHash('sha256').update(readBinarySource(source.archive.file)).digest('hex')!==source.archive.sha256) throw new Error(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
  }
  const adminReadoutSource=documents.adminPool.sources.find((s:{id:string})=>s.id==='BLS_ECEC_ADMIN_READOUT')
  if(!adminReadoutSource) throw new Error('ADMIN_ECEC_SOURCE_MISSING')
  const centralAdminPool=calculateCentralAdminPoolScenarios(documents.adminPool,
    JSON.parse(readSource(adminReadoutSource.archive.file)),documents.trailerOverhead)
  const adminScaleReference=calculateAdminScaleReference(documents.adminScale,centralAdminPool,partialFixedReferenceScenarios)
  // Existing direct-resource components assume one US registrant/power unit/cargo policy.
  // A larger administrative denominator alone cannot rebase those entity-level costs.
  const unjoinedAdminScaleScenarios=centralAdminPool.fleetScenarios.filter(fleet=>fleet.pairs!==1).map(fleet=>({
    fleetScenarioId:fleet.id,modeledFleetPairs:fleet.pairs,
    adminComponentFirstPairUsd:fleet.representativeFirstPairMonthlyComponentUsd,
    status:'ADMIN_SCALE_ONLY_RESOURCE_BUDGET_NOT_REBASED' as const,
    unresolved:['UCR_REGISTRANT_FLEET_BRACKET','CARGO_POLICY_ENTITY_SCOPE','MATCHED_FLEET_RESOURCE_COHORT'],
    combinedFixedComponentUsd:null,completeD2DCostUsd:null,resourceBudgetJoined:false,quoteReady:false,
  }))
  const partialFixedWithSharedAdminScenarios=partialFixedReferenceScenarios.flatMap(s=>centralAdminPool.fleetScenarios.filter(fleet=>fleet.pairs===1).map(fleet=>{
    const pair=fleet.pairAllocations[0]
    const sharedLines=pair.lines.flatMap(line=>(['MX_TRACTOR','US_TRACTOR'] as const).map(resourceId=>({
      id:`${line.id}:${resourceId}`,resourceId,monthlyUsd:line.resources[resourceId],kind:'ALLOCATED_PARTIAL_GROUP_ADMIN_COMPONENT' as const})))
    if(s.lines.some(line=>line.id.includes('ADMIN')||line.id.includes('TMS'))) throw new Error('PARTIAL_FIXED_ADMIN_DOUBLE_COUNT')
    const lines=[...s.lines,...sharedLines]
    const knownMonthlyModelComponentSumUsd=lines.reduce((sum,line)=>sum+line.monthlyUsd,0)
    return {id:`${s.id}_${fleet.id}`,baseScenarioId:s.id,fleetScenarioId:fleet.id,
      modeledFleetPairs:fleet.pairs,representativePairIndex:pair.pairIndex,
      groupAdminComponentAllocatedToThisPairUsd:pair.monthlyComponentUsd,
      completeFleetAdminComponentUsd:fleet.fleetMonthlyComponentUsd,lines,knownMonthlyModelComponentSumUsd,
      displayUsd:Math.round(knownMonthlyModelComponentSumUsd*100)/100,
      knownResourceMonthlyComponents:Object.fromEntries(BINATIONAL_RESOURCES.map(id=>[id,lines.filter(l=>l.resourceId===id).reduce((sum,l)=>sum+l.monthlyUsd,0)])),
      adminPoolAddedOnce:true,oneSharedBox:true,completeAdminCompanyFamily:false,
      completeFixedBudgetUsd:null,completeD2DCostUsd:null,isLowerBound:false,isCarrierObservedCost:false,
      missingAmountsDefaultedToZero:false,calibrated:false,quoteReady:false}
  }))
  for(const source of documents.companyPool.sources as {id:string;archive?:{file:string;sha256:string}}[]) {
    if(source.archive&&createHash('sha256').update(readBinarySource(source.archive.file)).digest('hex')!==source.archive.sha256) throw new Error(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
  }
  const companyServicePool=calculateCompanyServicePool(documents.companyPool,documents.overhead.companyPairs,centralAdminPool.roleLines.length)
  const partialFixedWithCompanyScenarios=partialFixedWithSharedAdminScenarios.map(s=>{
    const pair=companyServicePool.fleetScenarios.find(f=>f.pairs===s.modeledFleetPairs)!.pairAllocations[0]
    const companyLines=pair.lines.flatMap(line=>(['MX_TRACTOR','US_TRACTOR'] as const)
      .filter(resourceId=>line.resources[resourceId]>0).map(resourceId=>({id:`${line.id}:${resourceId}`,resourceId,
        monthlyUsd:line.resources[resourceId],kind:'ALLOCATED_PARTIAL_COMPANY_SERVICE_COMPONENT' as const})))
    const lines=[...s.lines,...companyLines]
    if(new Set(lines.map(l=>l.id)).size!==lines.length) throw new Error('PARTIAL_COMPANY_DUPLICATE_EXPENSE')
    const knownMonthlyModelComponentSumUsd=lines.reduce((sum,line)=>sum+line.monthlyUsd,0)
    return {...s,id:`${s.id}_COMPANY_SERVICES`,baseAdminScenarioId:s.id,lines,knownMonthlyModelComponentSumUsd,
      displayUsd:Math.round(knownMonthlyModelComponentSumUsd*100)/100,
      knownResourceMonthlyComponents:Object.fromEntries(BINATIONAL_RESOURCES.map(id=>[id,lines.filter(l=>l.resourceId===id).reduce((sum,l)=>sum+l.monthlyUsd,0)])),
      companyComponentAllocatedToThisPairUsd:pair.monthlyComponentUsd,companyPoolAddedOnce:true,
      fullCompanyBudgetUsd:null,providerServicesActivated:false}
  })
  for(const source of documents.pilotCycle.sources as {id:string;archive?:{file:string;sha256:string}}[]) {
    if(source.archive&&createHash('sha256').update(readBinarySource(source.archive.file)).digest('hex')!==source.archive.sha256) throw new Error(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
  }
  const postalArchive=documents.pilotUsPostalRoad.evidenceArchive
  if(createHash('sha256').update(readBinarySource(postalArchive.file)).digest('hex')!==postalArchive.sha256)throw new Error('SOURCE_ARCHIVE_HASH_MISMATCH:US_POSTAL_ROUTE_OBSERVATION')
  const linkPlanning=readBorderLinkPlanning(documents.borderLinkPlanning)
  if(createHash('sha256').update(readBinarySource(linkPlanning.priorEvidence.file)).digest('hex')!==linkPlanning.priorEvidence.sha256)throw new Error('SOURCE_ARCHIVE_HASH_MISMATCH:BORDER_LINK_PRIOR_EVIDENCE')
  const pilotCycleExposure=calculatePilotCycleExposureScenarios(documents.pilotCycle,documents.sakbeMxDetail,documents.dryVanCapacity,
    partialFixedWithCompanyScenarios,usRoadBasis==='POSTAL_REFERENCE'?documents.pilotUsPostalRoad:undefined,
    borderLinkBasis==='PUBLIC_LINK_FORECAST'?linkPlanning:undefined)
  const pilotVariableEconomics=calculatePilotVariableScenarios(documents.pilotVariables,pilotCycleExposure,documents.variableComponents,
    documents.fuelReference,documents.maintenanceReference,supportingDriverEconomics,documents.datedFx)
  for(const source of documents.mxTollFollowup.sources as {id:string;file:string|null;sha256:string|null}[]) {
    if(source.file&&createHash('sha256').update(readBinarySource(source.file)).digest('hex')!==source.sha256) throw new Error(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
  }
  for(const source of documents.borderTariffResearch.sources as {id:string;archive:{file:string;sha256:string}|null}[]) {
    if(source.archive&&createHash('sha256').update(readBinarySource(source.archive.file)).digest('hex')!==source.archive.sha256) throw new Error(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
  }
  const casePin=REFERENCE_BUDGET_PINS.find(p=>p.id==='case')!
  if(documents.borderTariffResearch.casePin.file!==casePin.file||documents.borderTariffResearch.casePin.sha256!==casePin.sha256) throw new Error('PILOT_BORDER_CASE_PIN_MISMATCH')
  const roadLinkPin=documents.mxTollFollowup.routeLinkPin
  if(createHash('sha256').update(readBinarySource(roadLinkPin.file)).digest('hex')!==roadLinkPin.sha256) throw new Error('SOURCE_ARCHIVE_HASH_MISMATCH:PILOT_ROAD_LINK')
  const roadLink=JSON.parse(readSource(roadLinkPin.file)),detailPin=REFERENCE_BUDGET_PINS.find(p=>p.id==='sakbeMxDetail')!
  if(roadLink.detailPin.file!==detailPin.file||roadLink.detailPin.sha256!==detailPin.sha256||roadLink.casePin.file!==casePin.file||roadLink.casePin.sha256!==casePin.sha256) throw new Error('PILOT_ROAD_CASE_DETAIL_PIN_MISMATCH')
  const roadRequestBytes=readBinarySource(roadLink.requestPin.file)
  if(createHash('sha256').update(roadRequestBytes).digest('hex')!==roadLink.requestPin.sha256) throw new Error('SOURCE_ARCHIVE_HASH_MISMATCH:PILOT_ROAD_REQUEST')
  if(JSON.parse(readSource(roadLink.requestPin.file)).axles!==5) throw new Error('PILOT_ROAD_REQUEST_CLASS_MISMATCH')
  const pilotRoadBorderEconomics=calculatePilotRoadBorderScenarios(documents.pilotRoadBorder,documents.mxTollFollowup,
    documents.borderTariffResearch,documents.sakbeMxDetail,pilotVariableEconomics,documents.datedFx)
  const pilotPhysicalCycle=calculatePilotPhysicalCycle(documents.pilotPhysicalCycle,pilotCycleExposure,pilotRoadBorderEconomics,adminScaleReference.scenarios)
  for(const source of documents.mxVariableDriver.sources as {id:string;archive:{file:string;sha256:string}|null}[]){
    if(source.archive&&createHash('sha256').update(readBinarySource(source.archive.file)).digest('hex')!==source.archive.sha256)throw new Error(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
  }
  const mxVariableDriver=calculateMxDriverRestAlternatives(documents.mxVariableDriver,pilotVariableEconomics,documents.datedFx)
  const mxDriverForecast=calculateMxDriverPublicForecast(documents.mxDriverForecast,pilotCycleExposure,pilotPhysicalCycle,mxVariableDriver,pilotVariableEconomics,documents.datedFx)
  const pilotPayrollComponents=joinPilotDriverForecastComponents(mxDriverForecast,pilotPhysicalCycle,pilotRoadBorderEconomics)
  const pilotFinancedCfu=calculatePilotFinancedCfu(documents.pilotFinancedCfu,adminScaleReference.scenarios,pilotPhysicalCycle,
    pilotPayrollComponents,prospectiveCash.model,mxCapitalScenarios.map(s=>s.scenario),boxFinancePlanning,datedFx)
  const pilotOrdinaryDuty=calculatePilotOrdinaryDuty(documents.pilotOrdinaryDuty,{cycles:pilotCycleExposure,physical:pilotPhysicalCycle,
    base:adminScaleReference.scenarios,driverPolicy:documents.mxDriverForecast,wages:mxVariableDriver,variables:pilotVariableEconomics,
    fx:datedFx,road:pilotRoadBorderEconomics,financePolicy:documents.pilotFinancedCfu,usCapital:prospectiveCash.model,
    mxCapital:mxCapitalScenarios.map(s=>s.scenario),boxFinance:boxFinancePlanning,mxDrivingMinutes:documents.sakbeMxDetail.observations.detailTotals.idealMinutes})
  for(const source of documents.boxInsuranceCfu.sources as {id:string;archive:{file:string;sha256:string}|null}[]){
    if(source.archive&&createHash('sha256').update(readBinarySource(source.archive.file)).digest('hex')!==source.archive.sha256)throw new Error(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
  }
  const boxInsuranceCfu=calculateBoxInsuranceCfu(documents.boxInsuranceCfu,documents.sharedBoxInsurance,pilotOrdinaryDuty,adminScaleReference.scenarios)
  const companyServicesCfu=calculateCompanyServicesCfu(documents.companyServicesCfu,adminScaleReference,pilotOrdinaryDuty,boxInsuranceCfu)
  for(const source of companyServicesCfu.sources){
    if(source.archive&&createHash('sha256').update(readBinarySource(source.archive.file)).digest('hex')!==source.archive.sha256)throw new Error(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
  }
  const cargoTripInsurance=calculateCargoTripInsuranceReference(documents.cargoTripInsurance,datedFx,rawCargoSelection)
  const driverConnectivity=calculateDriverConnectivity(documents.driverConnectivity,companyServicesCfu,datedFx)
  const boxVisibility=calculateBoxVisibility(documents.boxVisibility,documents.driverConnectivity,companyServicesCfu,datedFx)
  const tripSupplements=calculatePilotTripSupplements(documents.tripSupplements,boxVisibility,companyServicesCfu,pilotOrdinaryDuty,documents.driverComponents,datedFx)
  const operatingFluids=calculateOperatingFluids(documents.operatingFluids,tripSupplements,pilotVariableEconomics,pilotOrdinaryDuty,datedFx)
  const mxReservedYard=calculateMxReservedYard(documents.mxReservedYard,operatingFluids,companyServicesCfu,pilotOrdinaryDuty,datedFx)
  const mxBobtailWear=calculateMxBobtailWearReference(documents.mxBobtailWear,mxReservedYard,pilotVariableEconomics,datedFx,bobtailWearBasis)
  if(createHash('sha256').update(readBinarySource(mxBobtailWear.source.archive.file)).digest('hex')!==mxBobtailWear.source.archive.sha256)throw new Error(`SOURCE_ARCHIVE_HASH_MISMATCH:${mxBobtailWear.source.id}`)
  const mxTollCoverage=reviewMxTollCoverage(documents.mxTollCoverage,documents.sakbeMxDetail,pilotRoadBorderEconomics)
  const crossborderInsuranceExposure=calculateCrossborderInsuranceExposure(documents.crossborderInsuranceExposure,pilotOrdinaryDuty,pilotCycleExposure)
  const crossborderLiabilityForecast=calculateCrossborderLiabilityForecast(documents.crossborderLiabilityForecast,mxBobtailWear,crossborderInsuranceExposure,crossborderLiabilityBasis)
  const pilotCargoInsurance=calculatePilotCargoInsuranceProjection(crossborderLiabilityForecast,documents.cargoTripInsurance,datedFx,rawCargoSelection)
  for(const source of mxTollCoverage.sources){
    if(createHash('sha256').update(readBinarySource(source.archive.file)).digest('hex')!==source.archive.sha256)throw new Error(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
  }
  if(createHash('sha256').update(readBinarySource(mxReservedYard.source.archive.file)).digest('hex')!==mxReservedYard.source.archive.sha256)throw new Error(`SOURCE_ARCHIVE_HASH_MISMATCH:${mxReservedYard.source.id}`)
  for(const source of operatingFluids.sources){
    if(source.archive&&createHash('sha256').update(readBinarySource(source.archive.file)).digest('hex')!==source.archive.sha256)throw new Error(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
  }
  for(const source of tripSupplements.sources){
    if(source.archive&&createHash('sha256').update(readBinarySource(source.archive.file)).digest('hex')!==source.archive.sha256)throw new Error(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
  }
  for(const source of boxVisibility.sources){
    if(createHash('sha256').update(readBinarySource(source.archive.file)).digest('hex')!==source.archive.sha256)throw new Error(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
  }
  for(const source of driverConnectivity.sources){
    if(source.archive&&createHash('sha256').update(readBinarySource(source.archive.file)).digest('hex')!==source.archive.sha256)throw new Error(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
  }
  for(const source of cargoTripInsurance.sources){
    if(createHash('sha256').update(readBinarySource(source.archive.file)).digest('hex')!==source.archive.sha256)throw new Error(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
  }
  mxInsuranceRow.refs.push('mxInsuranceModel#/source','mxInsuranceModel#/modelAssumptions')
  mxInsuranceRow.missing=['Domestic Cascadia2021 Amplia gross premium is modeled in separate sensitivity copies; baseline not selected. Exact insured version/value, VAT credit, MX cargo and border/interchange terms are not observed or silently zero.']
  mxCapitalRow.refs.push('mxProspective#/offers','mxProspective#/finance','mxProspective#/modelAssumptions','mxProspective#/sources')
  mxCapitalRow.missing=['Conditional CASH/FINANCED_LOW/FINANCED_HIGH budgets now exist; no scenario is selected into this baseline. Older local-ad MXN currency, future market/condition and remaining debt are explicit planning hypotheses, not confirmed observations.']
  audit=reconcileBinationalFixedBudget(prospectiveCash.budget)
  const financedAudit=reconcileBinationalFixedBudget(prospectiveFinanced.budget)
  resourceBudgetExposure=reconcileReferenceBudgetExposure(prospectiveCash.budget,documents.resourceExposure.exposurePlan)
  const usCapitalRow=budgetRows.find(row=>row.economicExpenseId==='US_TRACTOR_CAPITAL')!
  usCapitalRow.completeAmountUsdPerMonth=prospectiveCash.model.modes.CASH.monthlyBudgetUsd
  usCapitalRow.status='DOCUMENTED_PUBLIC_MODEL_NOT_CALIBRATED'
  usCapitalRow.refs.push('usProspectiveCapital#/sources','usProspectiveCapital#/modelAssumptions')
  usCapitalRow.missing=['Actual asset/debt, all-in transaction invoices and survival are not verified; approved prospective model excludes purchase/sale/refinance events, not unknown actual charges set to zero.']
  const irp = documents.irpModel
  const irpRules = documents.irpRules
  const irpUsBatch = documents.irpUsBatch
  const irpUsWeightRules = documents.irpUsWeightRules
  const irpCurrencyValue = documents.irpCurrencyValue
  const irpAssetValue = documents.irpAssetValue
  const usValueAsset=ci.assetReferences.find((a:{resourceId:string}) => a.resourceId === 'US_TRACTOR')
  if (irpAssetValue.asset.sourceId !== usValueAsset.sourceId || irpAssetValue.asset.vin !== usValueAsset.vin ||
      irpAssetValue.asset.askingUsd !== usValueAsset.asking.value ||
      irpAssetValue.scenario.hypotheticalPurchaseUsd !== usValueAsset.asking.value ||
      irpAssetValue.ruleArchive.sha256 !== irpCurrencyValue.sourceArchive.sha256 ||
      irpAssetValue.ruleArchive.file !== irpCurrencyValue.sourceArchive.file ||
      irpAssetValue.askingArchive.sha256 !== use.sourceArchive.sha256 || irpAssetValue.askingArchive.file !== use.sourceArchive.file ||
      irpAssetValue.asset.modelYear > irpAssetValue.maine.modelYearUpperInclusive ||
      irpAssetValue.maine.registrationBaseUsd !== irpAssetValue.maine.grossWeightBaseUsd-irpAssetValue.maine.tractorTrailerCreditUsd) {
    throw new Error('IRP_ASSET_VALUE_PROFILE_MISMATCH')
  }
  type CadRule = { id:string; nativeAnnualBaseCad:number; valueChargeUnresolved:boolean; locator:string }
  const cadRules = irpCurrencyValue.registrationRules as CadRule[]
  const cadIds = ['AB','BC','MB','NB','NL','NS','ON','PE','QC','SK']
  if (irpCurrencyValue.sourceArchive.file !== irpRules.sources[1].archive.file ||
      irpCurrencyValue.sourceArchive.sha256 !== irpRules.sources[1].archive.sha256 ||
      irpCurrencyValue.fx.cadToUsd !== irpRules.officialTestContrast.cadToUsdReference ||
      irpCurrencyValue.fx.usdToCad !== irpRules.officialTestContrast.usdToCadReference ||
      cadRules.length !== 10 || new Set(cadRules.map(r => r.id)).size !== 10 ||
      cadRules.some(r => !cadIds.includes(r.id) || !Number.isFinite(r.nativeAnnualBaseCad) || r.nativeAnnualBaseCad <= 0)) {
    throw new Error('IRP_CURRENCY_REFERENCE_MISMATCH')
  }
  type ValueRule = { id:string; currency:string; value:number; factor:number; share:number; timeFactor:number;
    valueMultiplier?:number; alternativeChartValue?:number; annualRounding:string; publishedTestCharge:number }
  const valueTestContrasts = (irpCurrencyValue.valueTestRules as ValueRule[]).map(rule => {
    const valueBasis = rule.alternativeChartValue === undefined ? rule.value : Math.max(rule.value,rule.alternativeChartValue)
    const annualRaw = valueBasis * rule.factor * (rule.valueMultiplier ?? 1)
    const annualAfterSourceRounding = rule.annualRounding === 'NEAREST_DOLLAR' ? Math.round(annualRaw) :
      rule.annualRounding === 'NEAREST_CENT' ? Math.round(annualRaw*100)/100 : annualRaw
    const apportionedTestNative = annualAfterSourceRounding*rule.share*rule.timeFactor
    return { ...rule, valueBasis, annualRaw, annualAfterSourceRounding, apportionedTestNative,
      roundedTestNativeCents:Math.round(apportionedTestNative*100)/100,
      testNativeAmountUnit:`${rule.currency}/exercise-value-charge`,
      historicalUnroundedUsdContrast:rule.currency === 'CAD' ? apportionedTestNative*irpCurrencyValue.fx.cadToUsd : apportionedTestNative,
      pilotValueChargeUsd:null, appliedToPilot:false, eligibleForBudget:false, referenceAskingPriceSubstituted:false }
  })
  const roundingTestContrasts = ['AB','ON','QC'].map(id => {
    const rule=cadRules.find(r => r.id === id)!
    const rawCad=rule.nativeAnnualBaseCad*irpRules.officialTestContrast.publishedPercentPerJurisdiction/100
    const roundedCad=id === 'AB' ? Math.round(rawCad) : id === 'ON' ? Math.ceil(rawCad) : Math.round(rawCad*4)/4
    const beforeUsdRounding=id === 'QC' ? roundedCad/irpCurrencyValue.fx.usdToCad : roundedCad*irpCurrencyValue.fx.cadToUsd
    const sourcePathUsd=id === 'AB' ? Math.round(beforeUsdRounding) : id === 'ON' ? Math.round(beforeUsdRounding*100)/100 : beforeUsdRounding
    return {id,rawCad,roundedCad,sourcePathUsd,sourceMethod:id === 'QC' ? 'CAD_QUARTER_THEN_DIVIDE_USD_TO_CAD' :
      id === 'AB' ? 'CAD_NEAREST_DOLLAR_THEN_FX_THEN_USD_NEAREST_DOLLAR' : 'CAD_CEIL_THEN_FX_THEN_USD_CENTS',
      exerciseOnly:true,appliedToApvdInvoice:false,appliedToPilot:false}
  })
  type IrpRule = { id: string; operation: string; termMonths: number; gvwLb: number; currency: string;
    baseRegistrationUsd: number; additionalApportionableComponentUsd: number; locator: string;
    effectiveDateOfReference: string; invoiceRoundingConfirmedForApvd: boolean }
  // Same original workbook is already hash-checked above; no second fetch/parse.
  if (irpUsBatch.sourceArchive.file !== irpRules.sources[1].archive.file ||
      irpUsBatch.sourceArchive.sha256 !== irpRules.sources[1].archive.sha256) throw new Error('IRP_BATCH_ARCHIVE_MISMATCH')
  if (irpUsWeightRules.sourceArchive.file !== irpRules.sources[1].archive.file ||
      irpUsWeightRules.sourceArchive.sha256 !== irpRules.sources[1].archive.sha256) throw new Error('IRP_WEIGHT_RULES_ARCHIVE_MISMATCH')
  const batchRules = (irpUsBatch.rules as IrpRule[]).map(row => ({ ...irpUsBatch.profile, ...row })) as IrpRule[]
  const weightRules = (irpUsWeightRules.rules as IrpRule[]).map(row => ({ ...irpUsWeightRules.profile, ...row })) as IrpRule[]
  const supportedIrpRules = [...irpRules.supportedAnalyticalRules as IrpRule[], ...batchRules, ...weightRules]
  const separableRegistration = documents.irpSeparableRegistration
  type RegistrationOnlyRule = { id: string; locator: string; baseRegistrationUsd: number;
    separatePublishedCharges: { cell: string; label: string; annualUsd: number }[]; unresolved: string;
    effectiveDateOfReference?: string | null }
  const registrationOnlyRules = separableRegistration.rules as RegistrationOnlyRule[]
  const registrationOnlyIds = ['CA','CO','KY','MS','NV','SC','WV','WY']
  if (separableRegistration.sourceArchive.file !== irpRules.sources[1].archive.file ||
      separableRegistration.sourceArchive.sha256 !== irpRules.sources[1].archive.sha256 ||
      registrationOnlyRules.length !== 8 || new Set(registrationOnlyRules.map(r => r.id)).size !== 8 ||
      registrationOnlyRules.some(r => !registrationOnlyIds.includes(r.id) ||
        supportedIrpRules.some(old => old.id === r.id) || !Number.isFinite(r.baseRegistrationUsd) || r.baseRegistrationUsd <= 0)) {
    throw new Error('IRP_SEPARABLE_REGISTRATION_MISMATCH')
  }
  const stateReferences = documents.irpStateReferences
  const stateRegistrationRules = stateReferences.rules as RegistrationOnlyRule[]
  for (const source of stateReferences.sources as {id:string;archive:{file:string;sha256:string}|null}[]) {
    if (source.archive && createHash('sha256').update(readSource(source.archive.file)).digest('hex') !== source.archive.sha256) {
      throw new Error(`SOURCE_ARCHIVE_HASH_MISMATCH:${source.id}`)
    }
  }
  const neRule = stateReferences.rules.find((r:{id:string}) => r.id === 'NE')
  if (stateRegistrationRules.length !== 2 || new Set(stateRegistrationRules.map(r => r.id)).size !== 2 ||
      stateRegistrationRules.some(r => !['FL','NE'].includes(r.id) || !Number.isFinite(r.baseRegistrationUsd) || r.baseRegistrationUsd <= 0) ||
      neRule.baseRegistrationUsd !== neRule.gvwLb / neRule.assumedUsShortTonLb * neRule.ratePerTonUsd) {
    throw new Error('IRP_STATE_REGISTRATION_MISMATCH')
  }
  const supportedRuleIds = ['AR', 'OK', 'AL', 'AZ', 'CT', 'DE', 'GA', 'IL', 'IN', 'IA', 'KS', 'LA', 'MO', 'OH', 'TN',
    'DC', 'MD', 'MA', 'MI', 'MN', 'MT', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OR', 'PA', 'RI', 'SD', 'VA', 'WA', 'WI']
  const testRows = irpRules.officialTestContrast.rows as { id: string; row: number; texasInvoiceUsd: number }[]
  const irpDistances = irp.distanceBasis.jurisdictions as { id: string; distance: number }[]
  const irpDistanceTotal = irpDistances.reduce((sum, row) => sum + row.distance, 0)
  if (irpDistances.length !== 59 || new Set(irpDistances.map(row => row.id)).size !== 59 ||
      irpDistanceTotal !== irp.distanceBasis.publishedTotalDistance || irpDistanceTotal <= 0 ||
      irpDistances.some(row => !Number.isInteger(row.distance) || row.distance < 0)) throw new Error('IRP_DISTANCE_TABLE_MISMATCH')
  type PurchaseSensitivity={id:string;pricePath:string;currency:string;factor:number;valueMultiplier:number;
    factorApplicableToModel2021ConfirmedInDatedChart:boolean}
  const purchaseSensitivities=(irpAssetValue.purchaseSensitivities as PurchaseSensitivity[]).map(rule => {
    const p=irpAssetValue.scenario.hypotheticalPurchaseUsd as number
    const priceBasisNative=rule.pricePath === 'USD_TO_CAD_HYPOTHESIS' ? p*irpCurrencyValue.fx.usdToCad :
      rule.pricePath === 'USD_TO_CAD_TO_USD_HYPOTHESIS' ? p*irpCurrencyValue.fx.usdToCad*irpCurrencyValue.fx.cadToUsd : p
    const annualChargeNative=priceBasisNative*rule.factor*rule.valueMultiplier
    const distanceShare=irpDistances.find(r => r.id === rule.id)!.distance/irpDistanceTotal
    const historicalAnnualUsdContrast=rule.currency === 'CAD' ? annualChargeNative*irpCurrencyValue.fx.cadToUsd : annualChargeNative
    return {...rule,priceBasisNative,annualChargeNative,distanceShare,
      unroundedApvdNativeContrast:annualChargeNative*distanceShare,historicalAnnualUsdContrast,
      unroundedApvdUsdContrast:historicalAnnualUsdContrast*distanceShare,
      askingEqualsPurchaseIsExplicitHypothesis:true,actualPurchaseUsd:null,actualTaxableValue:null,
      actualValueChargeUsd:null,invoiceRoundingApplied:false,eligibleForBudget:false,appliedToPilot:false}
  })
  if (testRows.length !== 59 || new Set(testRows.map(row => row.id)).size !== 59 ||
      testRows.some(row => !irpDistances.some(d => d.id === row.id) || !Number.isFinite(row.texasInvoiceUsd) || row.texasInvoiceUsd < 0) ||
      supportedIrpRules.length !== 34 || new Set(supportedIrpRules.map(row => row.id)).size !== 34 ||
      supportedIrpRules.some(row => !supportedRuleIds.includes(row.id) || row.operation !== 'HAUL_FOR_HIRE' ||
        row.termMonths !== 12 || row.gvwLb !== 80000 || row.currency !== 'USD' ||
        !Number.isFinite(row.baseRegistrationUsd) || row.baseRegistrationUsd <= 0 ||
        !Number.isFinite(row.additionalApportionableComponentUsd) || row.additionalApportionableComponentUsd < 0)) {
    throw new Error('IRP_CONSOLIDATED_REFERENCE_MISMATCH')
  }
  const irpJurisdictions = irpDistances.map(row => {
    const share = row.distance / irpDistanceTotal
    const rule = supportedIrpRules.find(r => r.id === row.id)
    const stateRegistration = stateRegistrationRules.find(r => r.id === row.id)
    const registrationOnly = registrationOnlyRules.find(r => r.id === row.id) ?? stateRegistration
    const cad = cadRules.find(r => r.id === row.id)
    // Dated underlying rules, never reverse-engineered rounded test invoices.
    const baseAnnualUsd = row.id === 'TX' ? irp.texasFeeComponent.annualUnapportionedBaseUsd as number :
      cad ? cad.nativeAnnualBaseCad*irpCurrencyValue.fx.cadToUsd as number : row.id === 'ME' ? irpAssetValue.maine.registrationBaseUsd as number : registrationOnly?.baseRegistrationUsd ?? rule?.baseRegistrationUsd ?? null
    const apportionedBaseUsd = baseAnnualUsd === null ? null : baseAnnualUsd * share
    const conditionalTerpUsd: number | null = row.id !== 'TX' ? null : apportionedBaseUsd! * irp.texasFeeComponent.terpFraction
    const additionalAnalyticalComponentUsd = rule ? rule.additionalApportionableComponentUsd * share : null
    return { ...row, distanceShare: share, fullAnnualBaseUsd: baseAnnualUsd,
      nativeAnnualBaseCad:cad?.nativeAnnualBaseCad ?? null,
      historicalCadToUsdReference:cad ? irpCurrencyValue.fx.cadToUsd as number : null,
      currencyConversionIsCurrent:false, valueChargeUnresolved:row.id === 'ME' ? true : cad?.valueChargeUnresolved ?? null,
      apportionedAnnualBaseUsd: apportionedBaseUsd, conditionalAnnualTerpUsd: conditionalTerpUsd as number | null,
      additionalAnalyticalComponentUsd,
      registrationOnlyReference: registrationOnly !== undefined,
      registrationOnlyDependencies: registrationOnly?.unresolved ?? null,
      separatePublishedCharges: registrationOnly?.separatePublishedCharges ?? [],
      registrationOnlyCompatibleWithPilotConfirmed: false,
      ruleSourceRef: stateRegistration ? 'irpStateReferences#/rules' : registrationOnly ? 'irpSeparableRegistration#/rules' : row.id === 'ME' ? 'irpAssetValue#/maine' : cad ? 'irpCurrencyValue#/registrationRules' : rule ? weightRules.some(r => r.id === row.id) ? 'irpUsWeightRules#/rules' :
        batchRules.some(r => r.id === row.id) ? 'irpUsBatch#/rules' : 'irpRules#/supportedAnalyticalRules' : row.id === 'TX' ? 'irpModel#/texasFeeComponent' : null,
      ruleLocator: registrationOnly?.locator ?? (row.id === 'ME' ? irpAssetValue.maine.registrationLocator as string : cad?.locator ?? rule?.locator ?? null),
      effectiveDateOfReference: stateRegistration ? stateRegistration.effectiveDateOfReference ?? null : registrationOnly ? separableRegistration.profile.effectiveDateOfReference as string : cad || row.id === 'ME' ? irpCurrencyValue.profile.effectiveDateOfReference as string : rule?.effectiveDateOfReference ?? null,
      invoiceRoundingConfirmedForApvd: false,
      completeJurisdictionFee: false, currentFeeConfirmed: false, unknownOtherFeesAssumedZero: false,
      conditionalAnnualComponentUsd: registrationOnly || row.id === 'ME' ? null : cad ? cad.valueChargeUnresolved ? null : apportionedBaseUsd : apportionedBaseUsd === null ? null : apportionedBaseUsd +
        (row.id === 'TX' ? conditionalTerpUsd! : additionalAnalyticalComponentUsd!),
      feeCurrencyOrConversionConfirmed: baseAnnualUsd !== null, selected: false, appliedToPilot: false }
  })
  const texasIrp = irpJurisdictions.find(row => row.id === 'TX')!
  return {
    artifact: 'FCM_B2_BINATIONAL_REFERENCE_BUDGET_EXPOSURE_SUMMARY', cutDate: '2026-10-02',
    // A caller scenario is never silently promoted to the79-pin pilot or to a
    // benchmark calibrated from these files. Default economic outputs unchanged.
    publicCostProjection:rawCostProjection===undefined?null:calculateBinationalBudgetCostProjection(rawCostProjection),
    publicCostProjectionInputBasis:rawCostProjection===undefined?'NOT_SUPPLIED':'EXPLICIT_CALLER_SCENARIO_NOT_THE_PINNED_PILOT',
    status: 'PARTIAL_REFERENCE_ONLY_NOT_QUOTE_READY', sourcePins: REFERENCE_BUDGET_PINS,
    refreshedExternallyThisCut: false, evidenceRefreshScope: 'CLI_READS_DATED_ARCHIVES_AND_REVIEWED_POLICIES_ONLY; PUBLIC_WERNER_2025_STOCK_MANUALLY_REVIEWED_2026-10-02_NOT_ORIGINAL_HTTP_ARCHIVE',
    calibrated: false, quoteReady: false, adoptedValues: 0,
    physicalScope: 'OWN_MX_US_RELAY_SAME_TRAILER',
    estimationMandate:{result:'COMPLETE_PUBLIC_MODEL_D2D_COST_ESTIMATE',
      evidenceKinds:['PUBLIC_OBSERVATION','DOCUMENTED_PUBLIC_MODEL'],
      reviewedBenchmarkSupportedHypothesesAllowed:true,
      actualCarrierIdentityRequired:false,actualCarrierFleetSizeRequired:false,
      actualLoanContractRequired:false,privateXbfRecordsRequired:false,
      actualInsurerQuoteRequiredForReferenceEstimate:false,
      sourceCountryEquipmentScopeAndUnitsRequired:true,
      monetaryAmountsAndCapacityNeedSupport:true,unknownTermsMayBecomeZero:false,
      automaticProxyAdoptionAllowed:false,operationalAcceptanceProvenByModel:false,
      costEstimateIsPurchaseOrSalePrice:false,completePilotStillRequired:true},
    budgetRows,
    reviewedUsInsurancePublicModel:{...reviewedInsurance.model,sourceRef:'usInsurancePublicModel',
      archivedSourcesChecked:true,budgetFamilyModeled:true,allOtherExpenseAmountsPreserved:true,
      completeBinationalInsuranceUsd:null},
    originalBudgetBaseline:{status:baselineAudit.status,completeRows:baselineAudit.lineage.expenses.filter(e=>e.amount!==null).length,
      originalWorksheetModified:false},
    reviewedPublicModelBudget:audit.lineage,
    reviewedProspectiveUsCapital:prospectiveCash.model,
    reviewedPublicModelBudgets:{CASH:audit.lineage,FINANCED:financedAudit.lineage},
    reviewedSharedBoxCashSensitivity:{sourceRef:'boxProspective',fx:datedFx,scenarios:boxCashScenarios,
      selectedScenario:null,alternativesNotAdded:true,baselineChanged:false,
      financedBoxCostUsd:null,ageEffectIdentified:false,conditionalPlanningOnly:true,
      completePilotCostUsd:null,calibrated:false,quoteReady:false,adoptedValues:0},
    reviewedMxCapitalSensitivity:{sourceRef:'mxProspective',scenarios:mxCapitalScenarios,
      selectedScenario:null,alternativesNotAdded:true,conditionalPlanningOnly:true,baselineChanged:false,
      publicOfferCurrent:false,providerNominalBasisConfirmed:false,wholePilotCostUsd:null,
      calibrated:false,quoteReady:false,adoptedValues:0},
    reviewedBinationalCapitalCashScenarios:{scenarios:allCapitalCashScenarios,
      selectedBoxTaxScenario:null,alternativesNotAdded:true,oneSharedBox:true,
      allThreeCapitalResourcesModeledWithinConditionalCashScenario:true,
      completeFixedBudgetUsd:null,completePilotCostUsd:null,calibrated:false,quoteReady:false,adoptedValues:0},
    reviewedMxInsuranceSensitivity:{sourceRef:'mxInsuranceModel',scenarios:mxInsuranceScenarios,
      selectedScenario:null,baselineChanged:false,completeD2DInsurance:false,
      completeFixedBudgetUsd:null,completePilotCostUsd:null,calibrated:false,quoteReady:false,adoptedValues:0},
    recurringPermitComponents:{sourceRef:'permitComponentScenario',...recurringPermitComponents},
    partialFixedReferenceScenarios,
    budgetPaymentModeComparisons:{CASH:{status:audit.status,issues:audit.issues},FINANCED:{status:financedAudit.status,issues:financedAudit.issues}},
    authoritativeBudgetDisplayMode:'CASH_REFERENCE_BASELINE_NOT_SELECTED_ACTUAL_FINANCING',
    supportingSharedBoxCapitalExposure:{sourceRef:'sharedBoxProjection',capacityScenario:boxCapacity,
      capitalScenario:boxProjection.capitalScenario,phasePolicy:boxProjection.phasePolicy,
      scenarios:boxMovementSensitivities,onePhysicalBox:true,scenarioResultsAreAlternativesNotSum:true,
      completeBoxCapitalMxn:null,completeBoxCfuMxn:null,adoptedValues:0,eligibleForBudget:false,quoteReady:false,
      remaining:boxProjection.remaining},
    publicModelResourceProfiles: {
      sourceRef: 'economicProfiles', status: profiles.status,
      resources: (profiles.resources as { resourceId: typeof BINATIONAL_RESOURCES[number]; askingSourceId: string }[]).map(p => {
        const asset = ci.assetReferences.find((a: { resourceId: string }) => a.resourceId === p.resourceId)
        if (!asset || asset.sourceId !== p.askingSourceId) throw new Error('ECONOMIC_PROFILE_ASSET_MISMATCH')
        return { ...p, asset, normalizationAssetCount: 1, normalizationIsGroupFleetCount: false,
          paymentModes: profiles.paymentModes, completeMonthlyCapital: null, completeMonthlyFixedBudget: null,
          budgetFamilies: budgetRows.filter(r => r.resources.includes(p.resourceId)),
          monthlyProductiveAssetDays: null, appliedToPilot: false, eligibleForBudget: false }
      }),
      groupAllocation: profiles.groupAllocation, groupFleetQuantities: null,
      groupMonthlyBudgetUsd: null, selectedReferenceMonth: null, serviceDate: null,
      publicObservationsCombinedAsSameCarrier: false, unknownExpensesSetToZero: false,
    },
    supportingJointUsCapitalExposure: {
      sourceRef: 'economicProfiles#/jointUsCapitalExposure', methodPin, sourceUrl: profiles.jointUsCapitalExposure.capitalMethodSourceUrl,
      holdingMonths, holdingIsRemainingLife: false, scenarios: jointExposure,
      historicalUse: { ...use, intervals: odometerIntervals, fullHistory: fullHistoryUse,
        fullHistoryRateIsUnweightedIntervalAverage: false, currentOdometerCertified: false },
      completeCapitalBridge: `askingValueLossMonthlyUsd + (capitalizableAcquisitionUsd - ${usAsking} + disposalCostUsd)/${holdingMonths} + scenarioInterestUsd + separatelySupportedFeeAllocationUsd`,
      appliesToMxOrTrailer: false, insuranceAddedToCapital: false, currentOdometerAddedToIncrementalExponent: false,
      priceOrCfuFloor: false, appliedToPilot: false, eligibleForBudget: false,
    },
    supportingUsCapitalComparison: {
      sourceRef:'usCapitalComparison', source:usCapitalReview.source, assumptions:usCapitalReview.assumptions,
      scenarios:usCapitalScenarios, selectedScenario:null, alternativesNotAdded:true,
      completeBudgetRowsAdded:0, equityOpportunityCostResolved:false,
      acquisitionCorrectionsOrUnknownFeesSetToZero:false, completeCapitalFamilyUsd:null,
    },
    capitalPaymentModeComparison: {
      sourceRef: 'cashFinanced', userSelectedModes: finance.userSelection.scenarios,
      sameUnderlyingAssetAndDepreciation: true, actualCarrierPaymentModeKnown: false,
      resources: (ci.assetReferences as { resourceId: string; asking: { value: number; currency: string } }[]).map(asset => ({
        resourceId: asset.resourceId, currency: asset.asking.currency,
        publishedAskingReference: asset.asking.value,
        cash: { debtInterest: finance.cashPolicy.debtInterest, basis: 'USER_SELECTED_DEBT_FREE_SCENARIO_NOT_CARRIER_FACT',
          acquisitionCashFlowReference: asset.asking.value, capitalizableAcquisition: null, completeMonthlyCapital: null },
        financed: { actualMonthlyInterest: null, completeMonthlyCapital: null,
          evidenceStatus: asset.resourceId === 'MX_TRACTOR' ? 'EXPIRED_OFFER_WITH_UNRESOLVED_RATE_AND_CONTRACT_BASIS'
            : asset.resourceId === 'US_TRACTOR' ? 'APR_PUBLISHED_NOMINAL_RATE_UNKNOWN' : 'NO_MATCHED_TRAILER_FINANCE_TERMS',
        },
        eligibleForBudget: false, selectedActualFinancing: false,
      })),
      mxHistoricalStress: { classification: plan.classification, providerOfferExpired: finance.mxHistoricalOffer.expiredAtObservation,
        providerRateBasisConfirmed: false, assumptions: plan.assumptions,
        askingReferenceMxn: mxAsking, downPaymentReferenceMxn: mxDown, borrowedPrincipalReferenceMxn: mxPrincipal,
        schedules: mxStress, appliesToUsOrTrailer: false, actualContractSchedule: null },
      usFinancedReference: { publishedAprAsLowAs: finance.usPublishedOffer.aprAsLowAs,
        askingReferenceUsd: usAsking, downPaymentReferenceUsd: usAsking * finance.usPublishedOffer.downPaymentFraction,
        borrowedPrincipalBeforeUnknownTaxesFeesUsd: usAsking * (1 - finance.usPublishedOffer.downPaymentFraction),
        providerCommercialLoanMaximumUsd: finance.usPublishedOffer.commercialLoanMaximumUsd,
        nominalRate: null, monthlyPayment: null, averageInterest: null, membershipAndEligibilityConfirmed: false },
      feeAllocationResolved: false, equityOpportunityCostResolved: false,
      monthlyPaymentAddedToDepreciation: false, fxConversionPerformed: false,
      completeCapitalCostFormula: 'Same asset depreciation + scenario debt interest + separately supported fee allocation; never full debt payment',
    },
    supportingMxUsedCapital: {
      evidenceObservedAt: market.observedAt,
      sourceRef: 'mxUsedMarket#/trailerMarketContrast', samePublishedSpecs: specsMatch,
      trailer: {
        newerPublishedAskingMxn: newerBox.askingMxn, olderPublishedAskingMxn: olderBox.askingMxn,
        publishedPriceGapMxn: publishedGap, olderToNewerAskingRatio: olderBox.askingMxn / newerBox.askingMxn,
        modelYearGap, monthlyEquivalentOfPublishedGapMxn: publishedGap / (modelYearGap * months),
        classification: 'CROSS_SECTION_ARITHMETIC_NOT_OBSERVED_DEPRECIATION',
        economicTaxBasisCompatible: market.trailerMarketContrast.economicTaxBasisCompatible,
        selectedPlannedHoldingMonths: null, remainingLifeMonths: null,
        netResidualMxn: null, monthlyCompleteCapitalMxn: null, monthlyCompleteCapitalUsd: null,
        completeCapitalBridge: market.trailerMarketContrast.completeCapitalBridge,
        taxSensitivity: { assumptions: tax.assumptions, actualOlderQuoteBasis: null, actualCreditEligibility: null,
          actualApplicableVatRate: null, contrasts: trailerTaxContrasts, holdingPeriodSelected: false,
          basis: tax.analogyBasis, prior3750ArithmeticalContrastStillNotCapitalCost: true },
        sameAssetLongitudinalObservation: false, eligibleForBudget: false, selected: false,
      },
      tractor: market.mxTractorReview,
      limitations: market.trailerMarketContrast.limitations,
      engineInvoked: false, fxConversionPerformed: false,
    },
    supportingOverheadUnits: {
      sourceRef: 'trailerOverhead#/overheadUnitComponents', companyRows,
      unitComponents: trailerOverhead.overheadUnitComponents,
      uniqueExpenseIds: trailerOverhead.overheadUnitComponents.map((c: { economicExpenseId: string }) => c.economicExpenseId),
      canonicalFieldsWithUnitComponents: companyRows.filter(r => r.componentIds.length).length,
      companyInventoryFields: companyRows.length, completeMonthlyExpenses: 0,
      twoCurrenciesNotAdded: true, poolChargedOnceBeforeResourceAllocation: true,
      monthlyGroupEconomicAmountUsd: null, quantityDefaultsInvented: false, payrollCovered: false,
      allocationShares: null, fxConversionPerformed: false, eligibleForBudget: false,
    },
    supportingFacilityStaffing: {
      sourceRef: 'facilityStaffing', facilityContrasts, staffingContrasts,
      monitoringCoverageSourceRef: 'monitoringCoverage', monitoringCoverageContrast,
      monitoringPlanningPayrollContrasts, currentMonitoringRemaining: coverageDocument.remaining,
      observations: facilityStaffing.facilityObservations, policy: facilityStaffing.policy,
      canonicalAdminRoles: ADMIN_ROLES, actualFleetSize: null, actualStaffingAndSiteKnown: false,
      facilityAndSalaryComponentsCombined: false, monthlyCompleteGroupPoolUsd: null,
      excludesSearchOnlyMxBillingFromCalculation: true, eligibleForBudget: false,
      pending: ['MX yard periodicity, full services and capacity', 'Office location/terms and required seats versus shift occupancy',
        'All role FTE workload and compatible worker/payroll basis; employer benefits',
        'Post-promotion yard rates, tax/fees, physical fit and custody/service applicability',
        'Same-scope fleet exposure and conserved group resource allocation'],
    },
    supportingCaseCycle: {
      sourceRef:'mxDrivingStage', routeDetailRef:'sakbeMxDetail', usReceiptRef:'googleUsReceipt',
      candidateMxDistanceKm:summedKm, candidateMxIdealMinutes:summedMinutes,
      mxDrivingStageContrasts, candidateIsApprovedTruckRoute:false,
      usDistanceKm:null,usDrivingMinutes:null,usStage:null,
      usRouteContentRetained:false,usMissingReason:'STORED_RECEIPT_HAS_NO_ROUTE_CONTENT',
      tractorCycles:null,sharedTrailerCycleDays:null,resourceExposureAdopted:false,
      adminAllocationShares:null,adminTripComponentMxn:null,eligibleForResourceExposure:false,
      remaining:drivingStage.remaining,adoptedValues:0,quoteReady:false,
    },
    supportingVariableEconomics:{...supportingVariableEconomics,sourceFileChecks:variableReferenceFileChecks,
      fuelSourceRef:'fuelReference',maintenanceSourceRef:'maintenanceReference',routeDetailRef:'sakbeMxDetail'},
    supportingDriverEconomics:{...supportingDriverEconomics,laborBridgeRef:'laborBridge',
      historicalSourceRef:'pilotAssetLabor',routeDetailRef:'sakbeMxDetail',usOriginalArchiveChecked:true},
    supportingSharedBoxInsurance:{...sharedBoxInsurance,sourceRef:'sharedBoxInsurance',
      selectedUsedMxAssetReplaced:false,insuredValueInferredFromAskingPrice:false,
      unknownMxnUsdFxInvented:false,completeBoxCfuUsd:null,quoteReady:false},
    supportingSharedBoxTexasCompliance:{...sharedBoxTxCompliance,sourceRef:'sharedBoxTxCompliance',
      archivedSourcesChecked:true,actualPilotJurisdictionSelected:false,completeBoxCfuUsd:null},
    supportingSharedBoxMexicoInspection:{...sharedBoxMxInspection,sourceRef:'sharedBoxMxInspection',
      originalPagesArchived:false,actualPilotJurisdictionSelected:false,completeBoxCfuUsd:null},
    insuranceEmployerReferences:{sourceRef:'insuranceEmployer',sources:insuranceEmployer.sources,
      normalizationImplementedInResearchOnly:true,activePublishedEngineChanged:false,
      usInsuranceNormalized:normalizeInsuranceReference({amount:ci.usInsurance.transportMonthlyPerPowerUnit,
        currency:'USD',basis:'MONTHLY_AVERAGE',termMonths:null}),
      insurancePolicy:insuranceEmployer.insurancePolicy,usEmployerScenario:employerScenario,usEmployerContrast,
      mxEmployer:insuranceEmployer.mxEmployer,mxEmployerContrasts,
      nlPayrollTaxSourceRef:'nlPayrollTax',nlPayrollTaxContrasts,nlPayrollTaxRemaining:documents.nlPayrollTax.remaining,
      mxWorkRiskSourceRef:'mxWorkRisk',mxEmployerRiskContrasts,currentMxEmployerMissing:documents.mxWorkRisk.remaining,
      mxEmployerScenarioRef:'mxEmployerScenario',mxEmployerRuleRef:'mxEmployerRules',
      mxEmployerMissing:documents.mxEmployerScenario.missing,driverEmployerCvu:null,
      completeMonthlyInsuranceUsd:null,completeMonthlyEmployerCostUsd:null,
      remaining:insuranceEmployer.remaining,adoptedValues:0,eligibleForBudget:false},
    mxInsuranceAlternatives: (ci.mxInsurance.packages as MxPackage[]).map(p => {
      const normalization=normalizeInsuranceReference({amount:p.annualGrossMxn,currency:'MXN',basis:'ANNUAL_AMOUNT',termMonths:null})
      return {packageId: p.id, annualGrossMxn: p.annualGrossMxn, monthlyGrossEquivalentMxn: normalization.monthlyMoneyReference,
      normalization,
      sourceRef: 'capitalInsurance#/mxInsurance/packages', selected: false, eligibleForBudget: false,
      scope: 'BROKER_EXAMPLE_2022_INSURED_VALUE_2018000_MXN_DOMESTIC_NOT_2021_ASSET',
      includesVatFeeAndDiscount: true, packageAlternativesNotSum: true,
    }}),
    conditionalUs: {
      sourceRefs: ['capitalInsurance#/usConditionalValueLoss', 'capitalInsurance#/usInsurance', 'exposure#/sources/1'],
      scenarios: conditionalUs,
      missingCapitalAdjustment: '(capitalizableAcquisitionUsd - 40495 + disposalCostUsd)/36 + monthlyInterestUsd',
      missingOtherTerms: ['Matched insurance correction', 'Full permits/compliance', 'Allocated group administration/company'],
      limitations: [
        '2019 ANL model, 2024 national exposure, 2025 national insurance and 2026 asking observation are not one observed cohort/period.',
        '36 months is unvalidated planning, not remaining life. Insurance is held constant counterfactually, not empirically linked to use.',
        'Only mileage changes in these stress cases; annual operating days stay 268. Days are not certified productive cycle-days.',
        'Capital/insurance corrections can be negative: the sum is not a lower bound. No matched full monthly subtotal.',
        'Allocation reference per km is a fixed-cost allocation, never marginal CVU or a freight rate.',
      ],
    },
    registrationReferences: {
      irpPublicModel: {
        sourceRef: 'irpModel', ruleSourceRef: 'irpRules', sources: [...irp.sources, ...irpRules.sources], status: irp.status,
        officialFeeTestContrast: { ...irpRules.officialTestContrast,
          registrationOnlyTestSubtotalUsd: testRows.reduce((sum, row) => sum + row.texasInvoiceUsd, 0),
          usdColumnAlreadyConverted: true, additionalCurrencyConversionApplied: false,
          isCurrentPilotEstimate: false, isApvdSubtotal: false },
        californiaValueDependency: irpRules.californiaValueDependency,
        usRuleBatch: { sourceRef: 'irpUsBatch', profile: irpUsBatch.profile, rules: batchRules,
          excludedDependentRules: irpUsBatch.excludedDependentRules,
          knownJurisdictionComponentCount: supportedIrpRules.length + 1,
          adoptedValues: 0, quoteReady: false },
        usWeightRuleBatch: { sourceRef: 'irpUsWeightRules', profile: irpUsWeightRules.profile, rules: weightRules,
          excludedOrDependentRules: irpUsWeightRules.excludedOrDependentRules,
          knownJurisdictionComponentCount: supportedIrpRules.length + 1,
          adoptedValues: 0, quoteReady: false },
        currencyValueReferences: { sourceRef:'irpCurrencyValue',profile:irpCurrencyValue.profile,
          fx:irpCurrencyValue.fx,registrationRules:cadRules,valueTestContrasts,roundingTestContrasts,
          knownRegistrationBaseJurisdictionCount:irpJurisdictions.filter(r => r.fullAnnualBaseUsd !== null).length,
          unresolvedCadValueIds:cadRules.filter(r => r.valueChargeUnresolved).map(r => r.id),
          invoiceRoundingGeneralized:false,completeCadFeesUsd:null,pilotValueChargesUsd:null,
          adoptedValues:0,quoteReady:false },
        assetValueProfile:{sourceRef:'irpAssetValue',asset:irpAssetValue.asset,scenario:irpAssetValue.scenario,
          maine:irpAssetValue.maine,purchaseSensitivities,blockedBases:irpAssetValue.blockedBases,
          askingIsMsrp:false,askingIsConfirmedTaxableValue:false,completeValueChargesUsd:null,
          adoptedValues:0,quoteReady:false},
        separableRegistration:{sourceRef:'irpSeparableRegistration',profile:separableRegistration.profile,
          rules:registrationOnlyRules,excludedIds:separableRegistration.excludedIds,
          completePermitUsd:null,adoptedValues:0,quoteReady:false},
        stateReferenceReconciliation:{sourceRef:'irpStateReferences',profile:stateReferences.profile,sources:stateReferences.sources,
          rules:stateRegistrationRules,exerciseContrasts:stateReferences.exerciseContrasts,
          retainedBlocks:stateReferences.retainedBlocks,actualFeeUsd:null,completeIrpUsd:null,adoptedValues:0,quoteReady:false},
        distanceBasis: irp.distanceBasis, texasFeeAssumptions: irp.texasFeeComponent,
        jurisdictionCount: irpJurisdictions.length, publishedDistanceTotal: irpDistanceTotal,
        jurisdictions: irpJurisdictions,
        missingFeeJurisdictionIds: irpJurisdictions.filter(row => row.fullAnnualBaseUsd === null).map(row => row.id),
        conditionalTexasAnnualComponentUsd: texasIrp.conditionalAnnualComponentUsd,
        conditionalTexasMeanMonthComponentUsd: texasIrp.conditionalAnnualComponentUsd! / irp.texasFeeComponent.analyticalTermMonths as number,
        fullIrpAnnualUsd: null, fullMonthlyPermitUsd: null, actualInvoiceUsd: null,
        actualBaseJurisdiction: null, eligibilityConfirmed: false, appliedToPilot: false,
        knownComponentIsTotalOrMinimum: false, distanceTableIsCapacity: false,
        newFleetAssumedFromUsedAssetPurchase: false, weightSelectedForHvut: false,
        chargedToSharedTrailer: false, chargedPerNationalLeg: false,
        remaining: stateReferences.remaining,
      },
      hvut: {
        ...documents.recurringCompliance.hvut,
        sourceRef: 'recurringCompliance', sources: documents.recurringCompliance.sources,
        recurringAnnualReferenceUsd: documents.recurringCompliance.hvut.categories.find((c: { category: string }) => c.category === 'V').annualNonLoggingUsd as number,
        recurringAverageMonthReferenceUsd: documents.recurringCompliance.hvut.categories.find((c: { category: string }) => c.category === 'V').annualNonLoggingUsd / documents.recurringCompliance.hvut.referenceTaxPeriod.months as number,
        partialPeriodAlternatives: (documents.recurringCompliance.hvut.partialNonLoggingTableV as { firstUseMonth: string; coveredMonths: number; publishedCashTaxUsd: number }[])
          .map(row => ({ ...row, expensePerCoveredMonthUsd: row.publishedCashTaxUsd / row.coveredMonths,
            cashUnit: 'USD/vehicle-remaining-tax-period', expenseUnit: 'USD/vehicle-covered-month',
            selected: false, appliedToPilot: false })),
        actualSelectedTaxUsd: null, completeMonthlyComplianceUsd: null,
        mixedWithUcrCalendarYear: false, chargedPerNationalLeg: false,
        openingAuthorityAddedToRecurringExpense: false,
      },
      ucrAlternatives: (reg.ucr.schedules as UCRSchedule[]).flatMap(s => s.rows.map(r => ({
        registrationYear: s.registrationYear, ...r, monthlyEntityReferenceUsd: r.annualUsd / months,
        unit: 'USD/entity-average-month', selected: false, eligibleForResourceBudget: false,
      }))),
      trailerTokenBase: { annualUsd: reg.tokenTrailer.annualBaseUsd, monthlyBaseUsd: reg.tokenTrailer.annualBaseUsd / months,
        fullMonthlyPermitUsd: null, eligibleProfile: null, chargedPerLeg: false },
      authorityOpeningEventUsd: reg.authority.feePerIndividualAuthorityUsd,
      authorityMonthlyRecurringUsd: null, ucrAllocatedMonthlyUsd: null,
    },
    exposureAndAllocation: {
      mxHistoricalContrast: { monthlyKm: mx.annualDistance.value / months, monthlyOperatingDays: mx.annualOperatingDays.value / months,
        isCurrentDryVanBenchmark: false, selected: false },
      usHistoricalContrast: { monthlyKm: us.annualDistance.value * mileToKm / months, monthlyOperatingDays: usMonthDays,
        isCurrentDryVanBenchmark: false, selected: false },
      sharedTrailer: { monthlyKm: null, monthlyProductiveDays: null, shares: null, rule: 'ONE_BOX_WHOLE_CYCLE_THEN_ALLOCATE_NOT_MAX_PER_LEG' },
      cfuFormula: 'SUM_resources C_resource * max(resourceCycleKm / resourceMonthlyKm, resourceCycleDays / resourceMonthlyProductiveDays)',
      cvuFormula: 'Fuel + labor + variable maintenance/tires + applicable trip tolls and incremental services; retain existing family formulas',
      requires: ['Resource-specific budget and exposure with compatible period/profile', 'Supported loaded/empty cycle per tractor and whole box',
        'Map operating days to productive-day definitions explicitly; do not default to calendar/DRIVE days'],
      diagnosticOnly: true, routeCycleInvented: false,
    },
    supportingDryVanCapacity: {
      sourceRef: 'dryVanCapacity', observedAt: capacity.observedAt, captureKind: capacity.captureKind,
      rawHttpArchiveObtained: capacity.rawHttpArchiveObtained, sources: capacity.sources,
      cohort: capacity.cohort, observations: capacityObservations, pointInTimeContext: capacity.pointInTimeContext,
      inventoryLinks: capacity.inventoryLinks, calculationPolicy: capacity.calculationPolicy,
      closingTrailersPerOperatedTruck: capacity.pointInTimeContext.trailers / capacity.pointInTimeContext.operatedTrucks,
      closingNonDriverEmployees: capacity.pointInTimeContext.employees - capacity.pointInTimeContext.employeeDrivers,
      closingRatioIsAverageCapacity: false, closingEmployeesUsedAsAdminFte: false,
      overlappingPeriodsAdded: false, joinedToForeignBudgetOrAtRiDays: false,
      appliedToPilot: false, eligibleForResourceExposure: false,
      pending: capacity.remainingForCapacity,
      denominatorReview: {
        sourceRef: 'dryVanDenominator', source: denominator.source,
        captureKind: denominator.captureKind, rawHttpArchiveObtained: denominator.rawHttpArchiveObtained,
        candidates: capacityCandidates, productivityComparisons,
        interpretation: denominator.interpretation, recommendation: denominator.recommendation,
        closingCountsUsedAsAverage: false, publishedPercentUsedToInferProductiveDays: false,
        completeBudgetJoined: false, statisticalConfidenceInterval: false,
        appliedToPilot: false, eligibleForResourceExposure: false,
      },
    },
    resourceBudgetExposure: {
      sourceRef: 'resourceExposure', ...resourceBudgetExposure,
      physicalCase: documents.resourceExposure.physicalCase,
      completionPackages: documents.resourceExposure.completionPackages,
      referencePiecesTransferredToBudget: true,transferIsExplicitReviewedModel:true,
      historicalAnnualExposureRelabelledCalendarMonth: false,
    },
    authoritativeBudget: { status: audit.status, conditions: audit.issues, completeRows: budgetRows.filter(r => r.completeAmountUsdPerMonth !== null).length,
      completeRowsArePublicModelExpenseRows:true,calibratedRows:0,matchedPolicyInvoiceRows:0,
      monthlyFixedUsdByResource: audit.monthlyFixedUsdByResource, monthlyGroupTotalUsd: audit.monthlyGroupTotalUsd },
    supportingCentralAdminPool: {sourceRef:'adminPool',...centralAdminPool},
    supportingAdminScaleReference: {sourceRef:'adminScale',...adminScaleReference},
    supportingSharedBoxFinancePlanning:boxFinancePlanning,
    supportingCompanyServicePool: {sourceRef:'companyPool',...companyServicePool},
    partialFixedWithCompanyScenarios,
    supportingPilotCycleExposure: {sourceRef:'pilotCycle',...pilotCycleExposure},
    supportingPilotVariableEconomics: pilotVariableEconomics,
    supportingPilotRoadBorderEconomics: pilotRoadBorderEconomics,
    supportingPilotPhysicalCycle: {sourceRef:'pilotPhysicalCycle',...pilotPhysicalCycle},
    supportingMxVariableDriver:mxVariableDriver,
    supportingMxDriverForecast:mxDriverForecast,
    supportingPilotPayrollComponents:pilotPayrollComponents,
    supportingPilotFinancedCfu:pilotFinancedCfu,
    supportingPilotOrdinaryDuty:pilotOrdinaryDuty,
    supportingBoxInsuranceCfu:boxInsuranceCfu,
    supportingCargoTripInsurance:cargoTripInsurance,
    supportingPilotCargoInsurance:pilotCargoInsurance,
    supportingCompanyServicesCfu:companyServicesCfu,
    supportingDriverConnectivity:driverConnectivity,
    supportingBoxVisibility:boxVisibility,
    supportingPilotTripSupplements:tripSupplements,
    supportingOperatingFluids:operatingFluids,
    supportingMxReservedYard:mxReservedYard,
    supportingMxBobtailWearReference:mxBobtailWear,bobtailWearBasis,
    supportingMxTollCoverage:mxTollCoverage,
    supportingCrossborderInsuranceExposure:crossborderInsuranceExposure,
    supportingCrossborderLiabilityForecast:crossborderLiabilityForecast,crossborderLiabilityBasis,
    borderLinkBasis,borderLinkPlanningAvailable:linkPlanning,
    partialFixedWithSharedAdminScenarios,
    unjoinedAdminScaleScenarios,
    outputs: { matchedMonthlySubtotalUsd: null, cfuUsd: null, cvuUsd: null, productiveCostUsd: null, purchaseUsd: null, sellUsd: null },
    next: 'Complete explicit public-model capital/box/overhead terms, then compatible cycle/variable costs and one end-to-end pilot; no new generic FX/Auth/offer round',
    externalChanges: { database: false, auth: false, users: false, infrastructure: false, deployment: false, businessOperations: false, applicationAi: false },
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) throw new Error('Usage: tsx apps/api/scripts/consolidate-binational-reference-budget.ts (no arguments)')
    console.log(JSON.stringify(consolidateBinationalReferenceBudget(), null, 2))
    process.exitCode = 2 // Deliberately incomplete economics, not an execution failure.
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Reference consolidation failed')
    process.exitCode = 1
  }
}
