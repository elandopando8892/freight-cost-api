import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { buildParamMap, type ParamMap } from '../assumptions/assumptions.service.js'
import { calculate } from './engine.calculator.js'
import { resolveRoute } from './lane-resolver.service.js'
import { defaultService } from './engine.factors.js'
import type { EngineInput, EquipmentSpec, MarketCondition } from './engine.types.js'
import { resolveCalculationContext } from '../cost-bases/cost-bases.service.js'

const MarketConditionEnum = z.enum([
  'Very Tight', 'Moderately Tight', 'Balanced', 'Slightly Loose', 'Very Loose',
  'Slightly Tight', 'Neutral', 'Moderately Loose',
])

const EquipmentSchema = z.object({
  truckType: z.string().default('Truck Trailer'),
  trailer: z.string().default('Dry Van'),
  config: z.string().default('Single'),
  driver: z.string().default('B1'),
})

const EnginePolicySchema = z.enum(['OPERATIONAL_V3', 'WORKBOOK_V3'])

const MexSchema = z.object({
  baseKm: z.number().nonnegative(),
  routeExpensesMxn: z.number().nonnegative().default(0),
  baseHours: z.number().nonnegative().default(0),
  route: z.string().default('Straight & Danger'),
  // Roundtrip second leg (only used when service === 'Roundtrip'); all optional.
  returnKm: z.number().nonnegative().optional(),
  returnLoaded: z.boolean().optional(),
  returnRouteExpensesMxn: z.number().nonnegative().optional(),
  returnBaseHours: z.number().nonnegative().optional(),
})

const UsaSchema = z.object({
  loadedMiles: z.number().nonnegative(),
  transitDaysRaw: z.number().nonnegative().default(0),
  driverExpenses: z.number().nonnegative().default(0),
  outState: z.string().default('TX'),
  dieselUsdGal: z.number().nonnegative().default(0),
  fscUsdMile: z.number().nonnegative().default(0),
  originCondition: MarketConditionEnum.default('Balanced'),
  destCondition: MarketConditionEnum.default('Balanced'),
})

const DrayageSchema = z.object({
  loadedMiles: z.number().nonnegative(),
  portPickupMiles: z.number().nonnegative().optional(),
  emptyReturnMiles: z.number().nonnegative().optional(),
  finalRepositionMiles: z.number().nonnegative().optional(),
  portDwellHours: z.number().nonnegative().optional(),
  deliveryServiceHours: z.number().nonnegative().optional(),
  transitDaysRaw: z.number().nonnegative().default(0),
  emptyReturnRequired: z.boolean().optional(),
  dropOff: z.boolean().optional(),
  chassisReturnRequired: z.boolean().optional(),
  dieselUsdGal: z.number().nonnegative().default(0),
  fscUsdMile: z.number().nonnegative().default(0),
  outState: z.string().default('TX'),
  returnTollUsd: z.number().nonnegative().optional(),
  driverExpenses: z.number().nonnegative().optional(),
  marketRpm: z.number().nonnegative().optional(),
})

const CalculateSchema = z.object({
  policy: EnginePolicySchema.optional(),
  costBaseId: z.string().min(1).optional(),
  assumptionSetId: z.string().min(1).optional(),
  overrides: z.record(z.number()).optional(),
  operation: z.string(),
  service: z.string().optional(), // omitted → defaultService(operation); carrier can override
  equipment: EquipmentSchema.default({}),
  fxRate: z.number().positive().optional(),
  mex: MexSchema.optional(),
  usa: UsaSchema.optional(),
  drayage: DrayageSchema.optional(),
})

export async function engineRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.post('/engine/calculate', async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const body = CalculateSchema.parse(request.body)

    if (!body.mex && !body.usa && !body.drayage) {
      return reply.status(422).send({ error: 'Provide at least one of mex, usa, or drayage leg facts.' })
    }

    // Carrier's choice: explicit service, else the prevailing per-operation default.
    const service = body.service ?? defaultService(body.operation)

    let params: ParamMap = {}
    const { costBase, set, defaultPolicy } = await resolveCalculationContext(orgId, body)
    if (set) params = buildParamMap(set.params)

    const equipment: EquipmentSpec = body.equipment
    const input: EngineInput = {
      policy: body.policy ?? defaultPolicy,
      operation: body.operation,
      service,
      equipment,
      params,
      fxRate: body.fxRate,
      overrides: body.overrides,
      mexLeg: body.mex
        ? { ...body.mex, operation: body.operation, service, equipment }
        : undefined,
      usaLeg: body.usa
        ? {
            ...body.usa,
            originCondition: body.usa.originCondition as MarketCondition,
            destCondition: body.usa.destCondition as MarketCondition,
            operation: body.operation,
            service,
            equipment,
          }
        : undefined,
      drayageLeg: body.drayage
        ? { ...body.drayage, operation: body.operation, service, equipment }
        : undefined,
    }

    const result = calculate(input)
    return reply.send({ ...result, costBaseId: costBase?.id ?? null, assumptionSetId: set?.id ?? null })
  })

  // ── Quote by route name — resolves leg facts from V3.0 reference tables ───
  const ByRouteSchema = z.object({
    policy: EnginePolicySchema.optional(),
    costBaseId: z.string().min(1).optional(),
    assumptionSetId: z.string().min(1).optional(),
    overrides: z.record(z.number()).optional(),
    outboundLocation: z.string().min(1),
    inboundLocation: z.string().min(1),
    mexBorder: z.string().default('Nuevo Laredo, Tamaulipas'),
    usBorder: z.string().default('Laredo, TX'),
    operation: z.string(),
    service: z.string().optional(), // omitted → defaultService(operation); carrier can override
    route: z.string().default('Straight & Danger'),
    equipment: EquipmentSchema.default({}),
    fxRate: z.number().positive().optional(),
  })

  app.post('/engine/quote-by-route', async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const body = ByRouteSchema.parse(request.body)
    const service = body.service ?? defaultService(body.operation)

    const resolved = await resolveRoute({
      orgId,
      outboundLocation: body.outboundLocation,
      inboundLocation: body.inboundLocation,
      mexBorder: body.mexBorder,
      usBorder: body.usBorder,
      equipment: body.equipment,
      operation: body.operation,
      service,
      route: body.route,
    })

    if (!resolved.mexLeg && !resolved.usaLeg) {
      return reply.status(422).send({ error: 'Could not resolve any leg for this route.', warnings: resolved.warnings })
    }

    let params: ParamMap = {}
    const { costBase, set, defaultPolicy } = await resolveCalculationContext(orgId, body)
    if (set) params = buildParamMap(set.params)

    const result = calculate({
      policy: body.policy ?? defaultPolicy,
      operation: body.operation,
      service,
      equipment: body.equipment,
      params,
      fxRate: body.fxRate,
      overrides: body.overrides,
      mexLeg: resolved.mexLeg,
      usaLeg: resolved.usaLeg,
    })

    return reply.send({
      ...result,
      resolved: { mexLeg: resolved.mexLeg ?? null, usaLeg: resolved.usaLeg ?? null },
      warnings: resolved.warnings,
      costBaseId: costBase?.id ?? null,
      assumptionSetId: set?.id ?? null,
    })
  })
}
