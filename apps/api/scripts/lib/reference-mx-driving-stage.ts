import { z } from 'zod'

const schema = z.object({
  scenarioId: z.string().trim().min(1),
  country: z.literal('MX'),
  nominalDrivingMinutes: z.number().finite().positive().max(60000),
  drivingTimeBasis: z.literal('SAKBE_IDEAL_TIME_ASSUMED_AS_DRIVING_SENSITIVITY_NOT_TRUCK_OBSERVATION'),
  drivingHoursPer24HourBlock: z.union([z.literal(10), z.literal(14)]),
  blockHours: z.literal(24), breakAfterDrivingHours: z.literal(5), breakHours: z.literal(.5),
  freshDriverAtStartHypothesis: z.literal(true),
  excludesHandlingBorderReturnAndOtherDuty: z.literal(true),
}).strict()

/** Explicit driving-only planning contrast, not an HOS approval or cycle-days
 * source. Complete driving blocks repeat at 24h, not after just 8h rest.
 * Terminal arrival needs no fictitious break or next overnight reset. */
export function calculateMxDrivingStageReference(raw: unknown) {
  const p = schema.parse(raw)
  let remaining = p.nominalDrivingMinutes / 60
  const timeline: {kind:'DRIVING'|'BREAK'|'OFF_DUTY'; startHour:number; endHour:number}[] = []
  let clock = 0, breakHoursTotal = 0, offDutyHoursTotal = 0
  let blockCount = 0
  const add = (kind:typeof timeline[number]['kind'], hours:number) => {
    timeline.push({kind,startHour:clock,endHour:clock+hours})
    clock += hours
  }
  while (remaining > 0) {
    const blockStart = clock
    const drive = Math.min(remaining,p.drivingHoursPer24HourBlock)
    remaining = Math.max(0,remaining-drive)
    let blockDriving = drive
    blockCount++
    while (blockDriving > 0) {
      const interval = Math.min(blockDriving,p.breakAfterDrivingHours)
      add('DRIVING',interval)
      blockDriving = Math.max(0,blockDriving-interval)
      if (blockDriving > 0) {add('BREAK',p.breakHours);breakHoursTotal += p.breakHours}
    }
    if (remaining > 0) {
      const rest = p.blockHours-(clock-blockStart)
      if (rest < 8) throw new Error('MX_PLANNING_REST_BELOW_RULE')
      add('OFF_DUTY',rest);offDutyHoursTotal += rest
    }
  }
  return {...p, nominalDrivingHours:p.nominalDrivingMinutes/60, blockCount, timeline,
    breakHoursTotal, offDutyHoursTotal, conditionalMovementOnlyElapsedHours:clock,
    conditionalMovementOnlyElapsedDays:clock/24,
    classification:'DRIVING_ONLY_CLOCK_SENSITIVITY_NOT_COMPLETE_ASSET_CYCLE' as const,
    routeTruckValidated:false, measuredTruckTravelTime:false,
    weeklyAndLaborComplianceEstablished:false, driverPriorDutyKnown:false,
    actualCycleDays:null, loadedOrEmptyTripSelected:false,
    handlingHours:null, borderHours:null, returnKm:null,
    sharedTrailerCycleDays:null, adminAllocationAmount:null,
    eligibleForResourceExposure:false, quoteReady:false, adoptedValues:0,
  }
}
