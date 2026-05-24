import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { getActiveSet, buildParamMap, type ParamMap } from '../assumptions/assumptions.service.js'
import { prisma } from '../../config/prisma.js'
import { calculate } from './engine.calculator.js'
import { resolveRoute } from './lane-resolver.service.js'
import type { EngineInput, MarketCondition } from './engine.types.js'

const MarketConditionEnum = z.enum([
  'Very Tight', 'Moderately Tight', 'Slightly Tight', 'Neutral',
  'Slightly Loose', 'Moderately Loose', 'Very Loose',
])

const EquipmentSchema = z.object({
  truckType: z.string().default('Truck Trailer'),
  trailerType: z.string().default('Dry Van'),
  config: z.string().default('Single'),
  driverType: z.string().default('B1'),
})

const MexLaneSchema = z.object({
  km: z.number().nonnegative(),
  transitHrs: z.number().nonnegative(),
  driverExpenses: z.number().nonnegative().default(0),
  routeType: z.string().default('Straight & Danger'),
})

const UsaLaneSchema = z.object({
  miles: z.number().nonnegative(),
  routeExpenses: z.number().nonnegative().default(0),
  marketRpm: z.number().nonnegative().default(0),
  outboundCondition: MarketConditionEnum.default('Neutral'),
  fscOriginUsdMile: z.number().nonnegative().default(0),
  fscDestUsdMile: z.number().nonnegative().default(0),
})

const MarketSchema = z.object({
  fxRate: z.number().positive().default(1),
  dieselUsUsdL: z.number().nonnegative().default(0.95),
})

const CalculateSchema = z.object({
  assumptionSetId: z.string().min(1).optional(),
  overrides: z.record(z.number()).optional(),
  operationType: z.string(),
  serviceType: z.string().default('One Way'),
  equipment: EquipmentSchema.default({}),
  market: MarketSchema.default({}),
  mexLane: MexLaneSchema.optional(),
  usaLane: UsaLaneSchema.optional(),
  borderCrossing: z.boolean().default(true),
})

export async function engineRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.post('/engine/calculate', async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const body = CalculateSchema.parse(request.body)

    if (!body.mexLane && !body.usaLane) {
      return reply.status(422).send({ error: 'Provide at least one of mexLane or usaLane.' })
    }

    // Load assumption params (specified set or active set; empty map → engine uses verified defaults)
    let params: ParamMap = {}
    const set = body.assumptionSetId
      ? await prisma.assumptionSet.findFirst({ where: { id: body.assumptionSetId, orgId }, include: { params: true } })
      : await getActiveSet(orgId)
    if (set) params = buildParamMap(set.params)

    const input: EngineInput = {
      operationType: body.operationType,
      serviceType: body.serviceType,
      equipment: body.equipment,
      params,
      market: body.market,
      mexLane: body.mexLane,
      usaLane: body.usaLane
        ? { ...body.usaLane, outboundCondition: body.usaLane.outboundCondition as MarketCondition }
        : undefined,
      borderCrossing: body.borderCrossing,
      overrides: body.overrides,
    }

    const result = calculate(input)
    return reply.send({ ...result, assumptionSetId: set?.id ?? null })
  })

  // ── Quote by route name — resolves lane data from reference tables ────────
  const ByRouteSchema = z.object({
    assumptionSetId: z.string().min(1).optional(),
    overrides: z.record(z.number()).optional(),
    outboundLocation: z.string().min(1),
    inboundLocation: z.string().min(1),
    mexBorder: z.string().default('Nuevo Laredo, Tamaulipas'),
    usBorder: z.string().default('Laredo, TX'),
    operationType: z.string(),
    serviceType: z.string().default('One Way'),
    equipment: EquipmentSchema.default({}),
    market: MarketSchema.default({}),
    borderCrossing: z.boolean().default(true),
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
      operationType: body.operationType,
      serviceType: body.serviceType,
    })

    if (!resolved.mexLane && !resolved.usaLane) {
      return reply.status(422).send({
        error: 'Could not resolve any leg for this route.',
        warnings: resolved.warnings,
      })
    }

    let params: ParamMap = {}
    const set = body.assumptionSetId
      ? await prisma.assumptionSet.findFirst({ where: { id: body.assumptionSetId, orgId }, include: { params: true } })
      : await getActiveSet(orgId)
    if (set) params = buildParamMap(set.params)

    const input: EngineInput = {
      operationType: body.operationType,
      serviceType: body.serviceType,
      equipment: body.equipment,
      params,
      market: body.market,
      mexLane: resolved.mexLane,
      usaLane: resolved.usaLane,
      borderCrossing: body.borderCrossing,
      overrides: body.overrides,
    }

    const result = calculate(input)
    return reply.send({
      ...result,
      resolved: { mexLane: resolved.mexLane ?? null, usaLane: resolved.usaLane ?? null },
      warnings: resolved.warnings,
      assumptionSetId: set?.id ?? null,
    })
  })
}
