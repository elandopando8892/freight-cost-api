import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { prisma } from '../../config/prisma.js'
import { getActiveSet, buildParamMap } from '../assumptions/assumptions.service.js'
import { calculate } from '../engine/engine.calculator.js'

const CreateQuoteSchema = z.object({
  laneId: z.string().min(1),
  assumptionSetId: z.string().min(1).optional(),
  label: z.string().optional(),
})

export async function quotesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.post('/quotes', async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const input = CreateQuoteSchema.parse(request.body)

    const lane = await prisma.lane.findFirstOrThrow({ where: { id: input.laneId, orgId } })

    const assumptionSet = input.assumptionSetId
      ? await prisma.assumptionSet.findFirstOrThrow({ where: { id: input.assumptionSetId, orgId }, include: { params: true } })
      : await getActiveSet(orgId)

    if (!assumptionSet) return reply.status(422).send({ error: 'No active assumption set found.' })

    const equipment = lane.equipmentId
      ? await prisma.equipmentConfig.findUniqueOrThrow({ where: { id: lane.equipmentId } })
      : await prisma.equipmentConfig.findFirstOrThrow()

    const [dieselMxEntry, dieselUsEntry, fxEntry] = await Promise.all([
      prisma.marketData.findFirst({ where: { orgId, type: 'DIESEL_MX' }, orderBy: { date: 'desc' } }),
      prisma.marketData.findFirst({ where: { orgId, type: 'DIESEL_US' }, orderBy: { date: 'desc' } }),
      prisma.marketData.findFirst({ where: { orgId, type: 'FX_RATE' }, orderBy: { date: 'desc' } }),
    ])

    const params = buildParamMap(assumptionSet.params)
    const market = {
      dieselMxMxnL: dieselMxEntry?.value ?? 28,
      dieselUsUsdL: dieselUsEntry?.value ?? 1.49,
      fxRate: fxEntry?.value ?? 17.5,
    }

    const result = calculate({ lane, params, equipment, market })

    const quote = await prisma.quote.create({
      data: {
        orgId,
        laneId: lane.id,
        assumptionSetId: assumptionSet.id,
        label: input.label,
        // CVU
        fuelUsd: result.cvu.fuelUsd,
        maintTiresUsd: result.cvu.maintTiresUsd,
        driverUsd: result.cvu.driverUsd,
        borderUsd: result.cvu.borderUsd,
        routeBufferUsd: result.cvu.routeBufferUsd,
        totalCvuUsd: result.cvu.totalCvuUsd,
        // CFU
        fixedCostPerKm: result.cfu.fixedCostPerKm,
        cfuByDistance: result.cfu.cfuByDistance,
        cfuByTime: result.cfu.cfuByTime,
        totalCfuUsd: result.cfu.totalCfuUsd,
        // Tariffs
        productionCostUsd: result.productionCostUsd,
        utMargin: result.utMargin,
        technicalTariffUsd: result.technicalTariffUsd,
        // Risk
        routeRiskUsd: result.risk.routeRiskUsd,
        securityRiskUsd: result.risk.securityRiskUsd,
        operationRiskUsd: result.risk.operationRiskUsd,
        flatbedComplexityUsd: result.risk.flatbedComplexityUsd,
        tandemRiskUsd: result.risk.tandemRiskUsd,
        weatherBufferUsd: result.risk.weatherBufferUsd,
        totalRiskAdjUsd: result.risk.totalRiskAdjUsd,
        // Final
        requiredTariffUsd: result.requiredTariffUsd,
        requiredTariffMxn: result.requiredTariffMxn,
        tariffPerLoadedMile: result.tariffPerLoadedMile,
        carrierMargin: result.carrierMargin,
        fxRateUsed: result.fxRateUsed,
        // Distances
        loadedKm: result.loadedKm,
        emptyKm: result.emptyKm,
        totalKm: result.totalKm,
        loadedMiles: result.loadedMiles,
        cycleDays: result.cycleDays,
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

  app.post('/quotes/:id/recalculate', async (request) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const quote = await prisma.quote.findFirstOrThrow({ where: { id, orgId } })

    // Re-run engine using the same lane but active set + latest market
    const lane = await prisma.lane.findFirstOrThrow({ where: { id: quote.laneId } })
    const assumptionSet = await getActiveSet(orgId)
    if (!assumptionSet) throw Object.assign(new Error('No active assumption set'), { statusCode: 422 })

    const equipment = lane.equipmentId
      ? await prisma.equipmentConfig.findUniqueOrThrow({ where: { id: lane.equipmentId } })
      : await prisma.equipmentConfig.findFirstOrThrow()

    const [dieselMxEntry, dieselUsEntry, fxEntry] = await Promise.all([
      prisma.marketData.findFirst({ where: { orgId, type: 'DIESEL_MX' }, orderBy: { date: 'desc' } }),
      prisma.marketData.findFirst({ where: { orgId, type: 'DIESEL_US' }, orderBy: { date: 'desc' } }),
      prisma.marketData.findFirst({ where: { orgId, type: 'FX_RATE' }, orderBy: { date: 'desc' } }),
    ])

    const params = buildParamMap(assumptionSet.params)
    const market = {
      dieselMxMxnL: dieselMxEntry?.value ?? 28,
      dieselUsUsdL: dieselUsEntry?.value ?? 1.49,
      fxRate: fxEntry?.value ?? 17.5,
    }

    const result = calculate({ lane, params, equipment, market })
    return { original: quote, recalculated: result }
  })
}
