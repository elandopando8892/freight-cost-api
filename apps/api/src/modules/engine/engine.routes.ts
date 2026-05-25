import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { getActiveSet, buildParamMap, type ParamMap } from '../assumptions/assumptions.service.js'
import { prisma } from '../../config/prisma.js'
import { calculate } from './engine.calculator.js'
import { resolveRoute } from './lane-resolver.service.js'
import type { EngineInput, EquipmentSpec, MarketCondition } from './engine.types.js'

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

const MexSchema = z.object({
  baseKm: z.number().nonnegative(),
  routeExpensesMxn: z.number().nonnegative().default(0),
  baseHours: z.number().nonnegative().default(0),
  route: z.string().default('Straight & Danger'),
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

const CalculateSchema = z.object({
  assumptionSetId: z.string().min(1).optional(),
  overrides: z.record(z.number()).optional(),
  operation: z.string(),
  service: z.string().default('One Way'),
  equipment: EquipmentSchema.default({}),
  fxRate: z.number().positive().optional(),
  mex: MexSchema.optional(),
  usa: UsaSchema.optional(),
})

export async function engineRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.post('/engine/calculate', async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const body = CalculateSchema.parse(request.body)

    if (!body.mex && !body.usa) {
      return reply.status(422).send({ error: 'Provide at least one of mex or usa leg facts.' })
    }

    let params: ParamMap = {}
    const set = body.assumptionSetId
      ? await prisma.assumptionSet.findFirst({ where: { id: body.assumptionSetId, orgId }, include: { params: true } })
      : await getActiveSet(orgId)
    if (set) params = buildParamMap(set.params)

    const equipment: EquipmentSpec = body.equipment
    const input: EngineInput = {
      operation: body.operation,
      service: body.service,
      equipment,
      params,
      fxRate: body.fxRate,
      overrides: body.overrides,
      mexLeg: body.mex
        ? { ...body.mex, operation: body.operation, service: body.service, equipment }
        : undefined,
      usaLeg: body.usa
        ? {
            ...body.usa,
            originCondition: body.usa.originCondition as MarketCondition,
            destCondition: body.usa.destCondition as MarketCondition,
            operation: body.operation,
            service: body.service,
            equipment,
          }
        : undefined,
    }

    const result = calculate(input)
    return reply.send({ ...result, assumptionSetId: set?.id ?? null })
  })

  // ── Quote by route name — resolves leg facts from V3.0 reference tables ───
  const ByRouteSchema = z.object({
    assumptionSetId: z.string().min(1).optional(),
    overrides: z.record(z.number()).optional(),
    outboundLocation: z.string().min(1),
    inboundLocation: z.string().min(1),
    mexBorder: z.string().default('Nuevo Laredo, Tamaulipas'),
    usBorder: z.string().default('Laredo, TX'),
    operation: z.string(),
    service: z.string().default('One Way'),
    route: z.string().default('Straight & Danger'),
    equipment: EquipmentSchema.default({}),
    fxRate: z.number().positive().optional(),
  })

  app.post('/engine/quote-by-route', async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const body = ByRouteSchema.parse(request.body)

    const resolved = await resolveRoute({
      outboundLocation: body.outboundLocation,
      inboundLocation: body.inboundLocation,
      mexBorder: body.mexBorder,
      usBorder: body.usBorder,
      equipment: body.equipment,
      operation: body.operation,
      service: body.service,
      route: body.route,
    })

    if (!resolved.mexLeg && !resolved.usaLeg) {
      return reply.status(422).send({ error: 'Could not resolve any leg for this route.', warnings: resolved.warnings })
    }

    let params: ParamMap = {}
    const set = body.assumptionSetId
      ? await prisma.assumptionSet.findFirst({ where: { id: body.assumptionSetId, orgId }, include: { params: true } })
      : await getActiveSet(orgId)
    if (set) params = buildParamMap(set.params)

    const result = calculate({
      operation: body.operation,
      service: body.service,
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
      assumptionSetId: set?.id ?? null,
    })
  })
}
