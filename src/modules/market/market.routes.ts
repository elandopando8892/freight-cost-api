import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { CreateMarketDataSchema } from './market.schema.js'
import { prisma } from '../../config/prisma.js'
import { MarketDataType } from '@prisma/client'
import { getFuelStatus, refreshFuelSurcharge, syncSetDieselUsBorder, fetchEiaCurrentDiesel } from './fuel.service.js'

export async function marketRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // GET latest value of each type
  app.get('/market', async (request) => {
    const { orgId } = request.user as JwtPayload

    const types: MarketDataType[] = ['DIESEL_MX', 'DIESEL_US', 'FX_RATE', 'FSC']
    const results = await Promise.all(
      types.map((type) =>
        prisma.marketData.findFirst({
          where: { orgId, type },
          orderBy: { date: 'desc' },
        }),
      ),
    )

    return Object.fromEntries(types.map((t, i) => [t, results[i]]))
  })

  app.post('/market', async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const input = CreateMarketDataSchema.parse(request.body)
    const entry = await prisma.marketData.create({
      data: {
        orgId,
        type: input.type as MarketDataType,
        region: input.region,
        state: input.state,
        value: input.value,
        unit: input.unit,
        date: new Date(input.date),
        source: input.source,
      },
    })
    return reply.status(201).send(entry)
  })

  app.get('/market/history', async (request) => {
    const { orgId } = request.user as JwtPayload
    const query = request.query as { type?: string; days?: string }
    const days = parseInt(query.days ?? '30')
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const where: Record<string, unknown> = { orgId, date: { gte: since } }
    if (query.type) where.type = query.type

    return prisma.marketData.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 200,
    })
  })

  // ── Fuel surcharge pipeline (region diesel → FSC index → state FSC) ───────
  // Current region diesel + FSC index summary + sample derived state.
  app.get('/market/fuel', async () => getFuelStatus())

  // Update one or more region diesel prices (e.g. weekly EIA refresh).
  const UpdateRegionsSchema = z.object({
    regions: z.array(z.object({ region: z.string().min(1), dieselUsdGal: z.number().nonnegative() })).min(1),
  })
  app.put('/market/fuel/regions', async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const body = UpdateRegionsSchema.parse(request.body)
    for (const r of body.regions) {
      await prisma.regionDiesel.upsert({
        where: { region: r.region },
        create: { region: r.region, dieselUsdGal: r.dieselUsdGal },
        update: { dieselUsdGal: r.dieselUsdGal },
      })
    }
    const refresh = await refreshFuelSurcharge()
    const dieselSync = await syncSetDieselUsBorder(orgId) // MX leg tracks US diesel too
    return reply.send({ updatedRegions: body.regions.length, ...refresh, dieselSync })
  })

  // One refresh recomputes USA FSC (all states) AND syncs the MX leg's Diesel US Border.
  app.post('/market/fuel/refresh', async (request) => {
    const { orgId } = request.user as JwtPayload
    const refresh = await refreshFuelSurcharge()
    const dieselSync = await syncSetDieselUsBorder(orgId)
    return { ...refresh, dieselSync }
  })

  // Live EIA pull: fetch diesel-by-region (EIA RSS) → update RegionDiesel →
  // refresh USA FSC → sync MX Diesel US Border. One call = current fuel everywhere.
  app.post('/market/fuel/fetch-eia', async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    try {
      const eia = await fetchEiaCurrentDiesel()
      const refresh = await refreshFuelSurcharge()
      const dieselSync = await syncSetDieselUsBorder(orgId)
      return reply.send({ eia, ...refresh, dieselSync })
    } catch (err) {
      return reply.status(502).send({ error: 'EIA fetch failed', detail: (err as Error).message })
    }
  })
}
