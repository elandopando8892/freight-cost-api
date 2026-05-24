import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { getActiveSet, buildParamMap, type ParamMap } from '../assumptions/assumptions.service.js'
import { calculate } from '../engine/engine.calculator.js'
import type { EngineInput, MarketCondition } from '../engine/engine.types.js'

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

const CreateQuoteSchema = z.object({
  label: z.string().optional(),
  laneId: z.string().min(1).optional(),
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

export async function quotesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.post('/quotes', async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const body = CreateQuoteSchema.parse(request.body)

    if (!body.mexLane && !body.usaLane) {
      return reply.status(422).send({ error: 'Provide at least one of mexLane or usaLane.' })
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
      mexLane: body.mexLane,
      usaLane: body.usaLane
        ? { ...body.usaLane, outboundCondition: body.usaLane.outboundCondition as MarketCondition }
        : undefined,
      borderCrossing: body.borderCrossing,
      overrides: body.overrides,
    }

    const r = calculate(input)

    const quote = await prisma.quote.create({
      data: {
        orgId,
        laneId: body.laneId ?? undefined,
        assumptionSetId: set?.id ?? undefined,
        label: body.label,
        operationType: r.operationType,
        serviceType: body.serviceType,
        freightPrice: r.freightPrice,
        borderFee: r.borderFee,
        crossborderRate: r.crossborderRate,
        cogs: r.cogs,
        grossProfit: r.grossProfit,
        grossMargin: r.grossMargin,
        marketRefPrice: r.marketRefPrice,
        totalMiles: r.totalMiles,
        requiredTariffUsd: r.requiredTariffUsd,
        requiredTariffMxn: r.requiredTariffMxn,
        productionCostUsd: r.productionCostUsd,
        fxRateUsed: r.fxRateUsed,
        mexLeg: (r.mexLeg ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
        usaLeg: (r.usaLeg ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
      },
    })

    return reply.status(201).send(quote)
  })

  app.get('/quotes', async (request) => {
    const { orgId } = request.user as JwtPayload
    return prisma.quote.findMany({
      where: { orgId },
      include: { lane: true, set: { select: { id: true, name: true, version: true } } },
      orderBy: { createdAt: 'desc' },
    })
  })

  app.get('/quotes/:id', async (request) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    return prisma.quote.findFirstOrThrow({
      where: { id, orgId },
      include: { lane: { include: { equipment: true } }, set: true },
    })
  })

  app.delete('/quotes/:id', async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    await prisma.quote.findFirstOrThrow({ where: { id, orgId } })
    await prisma.quote.delete({ where: { id } })
    return reply.status(204).send()
  })
}
