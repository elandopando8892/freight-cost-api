import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { prisma } from '../../config/prisma.js'
import { getActiveSet, buildParamMap } from '../assumptions/assumptions.service.js'
import { calculate } from './engine.calculator.js'

const CalculateSchema = z.object({
  laneId: z.string().min(1),
  assumptionSetId: z.string().min(1).optional(),
  overrides: z.record(z.number()).optional(),
})

export async function engineRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.post('/engine/calculate', async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const input = CalculateSchema.parse(request.body)

    const lane = await prisma.lane.findFirstOrThrow({ where: { id: input.laneId, orgId } })

    const assumptionSet = input.assumptionSetId
      ? await prisma.assumptionSet.findFirstOrThrow({
          where: { id: input.assumptionSetId, orgId },
          include: { params: true },
        })
      : await getActiveSet(orgId)

    if (!assumptionSet) {
      return reply.status(422).send({ error: 'No active assumption set found. Create and activate one first.' })
    }

    const equipment = lane.equipmentId
      ? await prisma.equipmentConfig.findUniqueOrThrow({ where: { id: lane.equipmentId } })
      : await prisma.equipmentConfig.findFirstOrThrow()  // default to first

    // Latest market data for this org
    const [dieselMxEntry, dieselUsEntry, fxEntry] = await Promise.all([
      prisma.marketData.findFirst({ where: { orgId, type: 'DIESEL_MX' }, orderBy: { date: 'desc' } }),
      prisma.marketData.findFirst({ where: { orgId, type: 'DIESEL_US' }, orderBy: { date: 'desc' } }),
      prisma.marketData.findFirst({ where: { orgId, type: 'FX_RATE' }, orderBy: { date: 'desc' } }),
    ])

    const params = buildParamMap(assumptionSet.params)

    const market = {
      dieselMxMxnL: dieselMxEntry?.value ?? 28,   // fallback to assumption default
      dieselUsUsdL: dieselUsEntry?.value ?? 1.49,
      fxRate: fxEntry?.value ?? 17.5,
    }

    const result = calculate({
      lane,
      params,
      equipment,
      market,
      overrides: input.overrides,
    })

    return reply.send({ ...result, assumptionSetId: assumptionSet.id })
  })
}
