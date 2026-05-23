import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { CreateMarketDataSchema } from './market.schema.js'
import { prisma } from '../../config/prisma.js'
import { MarketDataType } from '@prisma/client'

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
}
