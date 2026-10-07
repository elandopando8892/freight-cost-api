import {z} from 'zod'
const n=z.number().finite().nonnegative().max(1e6),p=n.refine(v=>v>0)
const id=z.enum(['NETWORK_EXPECTED_EMPTY_PROXY','DEDICATED_EMPTY_SAME_BOX_RETURN'])
const policy=z.object({model:z.literal('FCM_MX_CROSSBORDER_INSURANCE_EXPOSURE_V1'),reviewedAt:z.string().datetime(),legalContentAsOf:z.literal('2026-10-01'),
 resourceId:z.literal('MX_TRACTOR'),minimumTemporaryCoverageHours:z.literal(24),generalNonhazardousLiabilityLimitUsd:z.literal(750000),
 operationHypothesis:z.literal('MEXICO_DOMICILED_PART368_COMMERCIAL_ZONE_ONLY_NONHAZARDOUS'),
 temporaryPriceBasis:z.literal('HYPOTHETICAL_LINEAR_PRICE_PER24H_BLOCK_NOT_PUBLISHED_PRODUCT_TARIFF'),annualPriceBasis:z.literal('ANNUAL_COMMERCIAL_AUTO_LIABILITY_ONLY_NO_DUPLICATE_PHYSICAL_DAMAGE'),
 temporaryPremiumPer24hUsd:z.null(),annualPremiumUsd:z.null(),actualEligibilityVerified:z.literal(false),
 sources:z.array(z.object({id:z.string(),url:z.string().url(),locator:z.string().min(30),capture:z.literal('PRIMARY_WEB_READER_NOT_ARCHIVED')}).strict()).length(4),
 assumptions:z.array(z.string()).min(9),quoteReady:z.literal(false),adoptedValues:z.literal(0)}).strict()
const duty=z.object({scenarios:z.array(z.object({id,knownMxElapsedClockDays:p,
 timeline:z.array(z.object({kind:z.enum(['TASK','COUNTED_BREAK','RELEASED_INTERVAL']),id:z.string(),startHour:n,endHour:n,hours:p}).passthrough()).min(1)}).passthrough()).length(2)}).passthrough()
const cycles=z.object({scenarios:z.array(z.object({id,allocationResources:z.array(z.object({resourceId:z.enum(['MX_TRACTOR','US_TRACTOR','SHARED_TRAILER']),totalCycleKm:p,monthlyKmCapacity:p}).passthrough()).length(3)}).passthrough()).length(2)}).passthrough()

/** Coverage quantities only. No insurer price, eligibility or new coverage is invented. */
export function calculateCrossborderInsuranceExposure(raw:unknown,rawDuty:unknown,rawCycles:unknown){
 const s=policy.parse(raw),d=duty.parse(rawDuty),c=cycles.parse(rawCycles)
 const urls=['https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-387/subpart-A/section-387.7',
  'https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-387/subpart-A/section-387.9',
  'https://www.qualitaspremier.com/Home/Products?lang=en',
  'https://www.progressivecommercial.com/commercial-auto-insurance/truck-insurance/commercial-truck-insurance-cost/']
 if(JSON.stringify(s.sources.map(x=>x.id))!==JSON.stringify(['CFR387_7','CFR387_9','QPI_CROSSBORDER','PROGRESSIVE_PACKAGE_SCOPE'])||s.sources.some((x,i)=>x.url!==urls[i]))throw new Error('CROSSBORDER_INSURANCE_SOURCE_SCOPE')
 if(new Set(d.scenarios.map(x=>x.id)).size!==2||new Set(c.scenarios.map(x=>x.id)).size!==2)throw new Error('CROSSBORDER_INSURANCE_DUPLICATE_SCENARIO')
 const scenarios=d.scenarios.map(x=>{
  for(let i=0;i<x.timeline.length;i++){
   const t=x.timeline[i]
   if(Math.abs(t.endHour-t.startHour-t.hours)>1e-8||Math.abs(t.startHour-(i?x.timeline[i-1].endHour:0))>1e-8)throw new Error('CROSSBORDER_INSURANCE_TIMELINE')
  }
  if(Math.abs(x.timeline.at(-1)!.endHour/24-x.knownMxElapsedClockDays)>1e-8)throw new Error('CROSSBORDER_INSURANCE_CLOCK_BINDING')
  const dedicated=x.id==='DEDICATED_EMPTY_SAME_BOX_RETURN'
  const pairs=dedicated?[['MX_LOADED_NORTH','MX_BOBTAIL_SOUTH'],['MX_BOBTAIL_NORTH','MX_ATTACHED_EMPTY_SOUTH']]:[['MX_LOADED_NORTH','MX_BOBTAIL_SOUTH']]
  const relevant=x.timeline.filter(t=>t.kind==='TASK'&&t.id.match(/^MX_.*_(NORTH|SOUTH)$/))
  // Collapsed split tasks must conserve the ordered physical movement topology.
  const order=relevant.filter((t,i)=>!i||t.id!==relevant[i-1].id).map(t=>t.id)
  if(JSON.stringify(order)!==JSON.stringify(pairs.flat()))throw new Error('CROSSBORDER_INSURANCE_MOVEMENT_TOPOLOGY')
  const windows=pairs.map(([north,south],i)=>{
   const first=relevant.find(t=>t.id===north)!,last=relevant.filter(t=>t.id===south).at(-1)!
   const elapsedHours=last.endHour-first.startHour
   if(elapsedHours<=0)throw new Error('CROSSBORDER_INSURANCE_WINDOW')
   return {id:`MX_US_INCURSION_${i+1}`,northMovement:north,southMovement:south,startHour:first.startHour,endHour:last.endHour,elapsedHours,
    conditional24hEquivalentBlocks:Math.ceil(elapsedHours/24),observedUsPresence:false,approachScopeComplete:false}
  })
  if(windows.some((w,i)=>i>0&&w.startHour<windows[i-1].endHour))throw new Error('CROSSBORDER_INSURANCE_WINDOW_OVERLAP')
  const resources=c.scenarios.find(v=>v.id===x.id)!.allocationResources
  if(new Set(resources.map(v=>v.resourceId)).size!==3)throw new Error('CROSSBORDER_INSURANCE_DUPLICATE_RESOURCE')
  const mx=resources.find(v=>v.resourceId==='MX_TRACTOR')!,conditionalMonthlyResourceShare=Math.max(mx.totalCycleKm/mx.monthlyKmCapacity,x.knownMxElapsedClockDays/24)
  const conditionalAnnualPremiumShare=conditionalMonthlyResourceShare/12,conditional24hPremiumMultiplier=windows.reduce((sum,w)=>sum+w.conditional24hEquivalentBlocks,0)
  return {cycleScenarioId:x.id,resourceId:'MX_TRACTOR' as const,windows,conditional24hPremiumMultiplier,conditionalMonthlyResourceShare,conditionalAnnualPremiumShare,
   temporaryAlternative:{classification:'CVU' as const,formula:'premiumPer24hUsd * conditional24hPremiumMultiplier',costUsd:null},
   annualAlternative:{classification:'CFU' as const,formula:'annualPremiumUsd * conditionalAnnualPremiumShare',costUsd:null},
   conditionalEqualCost24hPriceAsFractionOfAnnual:conditionalAnnualPremiumShare/conditional24hPremiumMultiplier,
   mutuallyExclusiveAlternatives:true,sameBoxChargedAgain:false,usTractorChargedAgain:false,certificatePricePublished:false,actualEligibilityVerified:false,
   fullPhysicalExposureVerified:false,completeCfuUsd:null,completeCvuUsd:null,completeD2DCostUsd:null,quoteReady:false}
 })
 return {...s,sourceRef:'crossborderInsuranceExposure',scenarios,missingPremiumDefaultedToZero:false,existingKnownTotalsChanged:false,
  purchaseBreakEvenForActualFleet:null,completeD2DCostUsd:null,externalWrites:false}
}
