import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { authenticate } from '../../middleware/authenticate.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { prisma } from '../../config/prisma.js'
import { getActiveSet, buildParamMap, type ParamMap } from '../assumptions/assumptions.service.js'
import { calculate } from '../engine/engine.calculator.js'
import { defaultService } from '../engine/engine.factors.js'
import { usdToMxn, round2 } from '../../utils/currency.js'
import type { EngineInput, EquipmentSpec, MarketCondition } from '../engine/engine.types.js'

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
const CreateQuoteSchema = z.object({
  label: z.string().optional(),
  laneId: z.string().min(1).optional(),
  assumptionSetId: z.string().min(1).optional(),
  overrides: z.record(z.number()).optional(),
  operation: z.string(),
  service: z.string().optional(), // omitted → defaultService(operation); carrier can override
  equipment: EquipmentSchema.default({}),
  fxRate: z.number().positive().optional(),
  mex: MexSchema.optional(),
  usa: UsaSchema.optional(),
})

export async function quotesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.post('/quotes', async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const body = CreateQuoteSchema.parse(request.body)
    if (!body.mex && !body.usa) {
      return reply.status(422).send({ error: 'Provide at least one of mex or usa leg facts.' })
    }

    // Carrier's choice: explicit service, else the prevailing per-operation default.
    const service = body.service ?? defaultService(body.operation)

    let params: ParamMap = {}
    const set = body.assumptionSetId
      ? await prisma.assumptionSet.findFirst({ where: { id: body.assumptionSetId, orgId }, include: { params: true } })
      : await getActiveSet(orgId)
    if (set) params = buildParamMap(set.params)

    const equipment: EquipmentSpec = body.equipment
    const input: EngineInput = {
      operation: body.operation,
      service,
      equipment,
      params,
      fxRate: body.fxRate,
      overrides: body.overrides,
      mexLeg: body.mex ? { ...body.mex, operation: body.operation, service, equipment } : undefined,
      usaLeg: body.usa
        ? {
            ...body.usa,
            originCondition: body.usa.originCondition as MarketCondition,
            destCondition: body.usa.destCondition as MarketCondition,
            operation: body.operation, service, equipment,
          }
        : undefined,
    }

    const r = calculate(input)
    const quote = await prisma.quote.create({
      data: {
        orgId,
        laneId: body.laneId ?? undefined,
        assumptionSetId: set?.id ?? undefined,
        label: body.label,
        operation: r.operation,
        service,
        freightBaselineUsd: r.freightBaselineUsd,
        requiredTariffUsd: r.requiredTariffUsd,
        requiredTariffMxn: round2(usdToMxn(r.requiredTariffUsd, r.fxRateUsed)),
        fxRateUsed: r.fxRateUsed,
        mexLeg: (r.mexLeg ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
        usaLeg: (r.usaLeg ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
        commercial: (r.commercial ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
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
