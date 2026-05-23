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
      dieselUsUsdL: dieselUsEntry?.value ?? 0.95,
      fxRate: fxEntry?.value ?? 17.5,
    }

    const r = calculate({ lane, params, equipment, market })

    const quote = await prisma.quote.create({
      data: {
        orgId,
        laneId: lane.id,
        assumptionSetId: assumptionSet.id,
        label: input.label,
        // Distances & timing
        totalKms: r.totalKms,
        loadedMiles: r.loadedMiles,
        litros: r.litros,
        transitHrs: r.transitHrs,
        fracTransit: r.fracTransit,
        fracWait: r.fracWait,
        fracViaje: r.fracViaje,
        // CBTT base cost
        cbfa: r.cbfa,
        cbvr: r.cbvr,
        ut: r.ut,
        cbtt: r.cbtt,
        // ITA trip additions
        cagr: r.cagr,
        cagv: r.cagv,
        ita: r.ita,
        // Production cost
        cit: r.cit,
        // Margin & base tariff
        margenPct: r.margenPct,
        margenContrib: r.margenContrib,
        tbt: r.tbt,
        // Market effects (ICEM)
        trailerFactor: r.trailerFactor,
        emtr: r.emtr,
        operationFactor: r.operationFactor,
        emto: r.emto,
        configFactor: r.configFactor,
        eact: r.eact,
        driverFactor: r.driverFactor,
        eaeo: r.eaeo,
        icem: r.icem,
        serviceFactor: r.serviceFactor,
        // Fuel
        icc: r.icc,
        // Final price
        pvt: r.pvt,
        ubt: r.ubt,
        mct: r.mct,
        // Legacy / derived
        requiredTariffUsd: r.requiredTariffUsd,
        requiredTariffMxn: r.requiredTariffMxn,
        productionCostUsd: r.productionCostUsd,
        tariffPerLoadedMile: r.tariffPerLoadedMile,
        fxRateUsed: r.fxRateUsed,
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
      dieselUsUsdL: dieselUsEntry?.value ?? 0.95,
      fxRate: fxEntry?.value ?? 17.5,
    }

    const result = calculate({ lane, params, equipment, market })
    return { original: quote, recalculated: result }
  })
}
