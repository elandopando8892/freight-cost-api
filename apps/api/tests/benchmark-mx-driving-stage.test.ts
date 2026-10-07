import { describe, expect, it } from 'vitest'
import { calculateMxDrivingStageReference as calculate } from '../scripts/lib/reference-mx-driving-stage.js'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'

const source=JSON.parse(readLocalDocument('docs/research/B2_MX_DRIVING_STAGE_REFERENCE_2026-10-01.json'))
const detail=JSON.parse(readLocalDocument('docs/research/B2_SAKBE_MX_LIVE_DETAIL_2026-09-30.json'))
const minutes=detail.observations.detailTotals.idealMinutes
const base={...source.scenarios[0],nominalDrivingMinutes:minutes}

describe('MX driving-stage clock, never a complete pilot cycle',()=>{
  it('adds between-day rest under the explicit ten-hour hypothesis',()=>{
    const r=calculate(base)
    expect(r.nominalDrivingHours).toBeCloseTo(11.831383208206257,10)
    expect(r.breakHoursTotal).toBe(.5)
    expect(r.offDutyHoursTotal).toBe(13.5)
    expect(r.blockCount).toBe(2)
    expect(r.conditionalMovementOnlyElapsedHours).toBeCloseTo(25.83138320820626,10)
  })
  it('adds two pauses under the14h cap without a fictional terminal overnight',()=>{
    const r=calculate({...base,drivingHoursPer24HourBlock:14})
    expect(r.breakHoursTotal).toBe(1)
    expect(r.offDutyHoursTotal).toBe(0)
    expect(r.blockCount).toBe(1)
    expect(r.conditionalMovementOnlyElapsedHours).toBeCloseTo(12.831383208206257,10)
  })
  it.each([5,10,14,20,28,40,100])('conserves %sh driving and every rolling24h cap',hours=>{
    const r=calculate({...base,nominalDrivingMinutes:hours*60,drivingHoursPer24HourBlock:14})
    const drive=r.timeline.filter(t=>t.kind==='DRIVING')
    expect(drive.reduce((sum,t)=>sum+t.endHour-t.startHour,0)).toBeCloseTo(hours,10)
    for(const t of drive) expect(t.endHour-t.startHour).toBeLessThanOrEqual(5)
    const points=[0,...r.timeline.flatMap(t=>[t.startHour,t.endHour,t.startHour-24,t.endHour-24])]
    for(const start of points){
      const total=drive.reduce((sum,t)=>sum+Math.max(0,Math.min(t.endHour,start+24)-Math.max(t.startHour,start)),0)
      expect(total).toBeLessThanOrEqual(14+1e-9)
    }
    for(const t of r.timeline.filter(t=>t.kind==='OFF_DUTY')) expect(t.endHour-t.startHour).toBeGreaterThanOrEqual(8)
    expect(r).toMatchObject({actualCycleDays:null,sharedTrailerCycleDays:null,adminAllocationAmount:null,
      driverPriorDutyKnown:false,weeklyAndLaborComplianceEstablished:false,measuredTruckTravelTime:false,
      routeTruckValidated:false,eligibleForResourceExposure:false,quoteReady:false,adoptedValues:0})
  })
  it.each([[300,5],[600,10.5],[840,15],[1200,30.5]])('handles exact %s-minute boundary without extra arrival pause', (m,h)=>{
    expect(calculate({...base,nominalDrivingMinutes:m,drivingHoursPer24HourBlock:14}).conditionalMovementOnlyElapsedHours).toBe(h)
  })
  it.each([{country:'US'},{nominalDrivingMinutes:0},{nominalDrivingMinutes:NaN},
    {nominalDrivingMinutes:-1},{drivingHoursPer24HourBlock:15},{blockHours:22},
    {freshDriverAtStartHypothesis:false},{excludesHandlingBorderReturnAndOtherDuty:false},
    {drivingTimeBasis:'OBSERVED_TRUCK_CYCLE'},{breakHours:0},{breakAfterDrivingHours:8},{cycleDays:1},
  ])('rejects unsupported/default-free policy %j',changes=>expect(()=>calculate({...base,...changes})).toThrow())
})
