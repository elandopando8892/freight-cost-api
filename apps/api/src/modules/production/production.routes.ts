/**
 * Carrier production matrix — the org's OWN lanes (MEX + USA). The lane resolver
 * checks these before the global reference tables, so a carrier can quote any
 * route in their network even if it's not in the seeded V3.0 data.
 */
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { prisma } from '../../config/prisma.js'

const norm = (origin: string, destination: string) => `${origin.trim()} - ${destination.trim()}`.toUpperCase()

const MexLaneSchema = z.object({
  origin: z.string().min(2),
  destination: z.string().min(2),
  km: z.number().positive(),
  tolls: z.number().nonnegative().default(0),
  horasRuta: z.number().nonnegative().default(0),
})
const UsaLaneSchema = z.object({
  origin: z.string().min(2),
  destination: z.string().min(2),
  outState: z.string().min(2),
  miles: z.number().positive(),
  truckDays: z.number().nonnegative().default(0),
  routeExpenses: z.number().nonnegative().default(0),
})

export async function productionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // ── MEX matrix ─────────────────────────────────────────────────────────
  app.get('/production/mex-lanes', async (request) => {
    const { orgId } = request.user as JwtPayload
    return prisma.carrierMexLane.findMany({ where: { orgId }, orderBy: [{ origin: 'asc' }, { destination: 'asc' }] })
  })

  app.post('/production/mex-lanes', async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const input = MexLaneSchema.parse(request.body)
    const laneKeyNorm = norm(input.origin, input.destination)
    const lane = await prisma.carrierMexLane.upsert({
      where: { orgId_laneKeyNorm: { orgId, laneKeyNorm } },
      create: { orgId, laneKeyNorm, ...input },
      update: { ...input },
    })
    return reply.status(201).send(lane)
  })

  app.put('/production/mex-lanes/:id', async (request) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const input = MexLaneSchema.parse(request.body)
    await prisma.carrierMexLane.findFirstOrThrow({ where: { id, orgId } })
    return prisma.carrierMexLane.update({ where: { id }, data: { ...input, laneKeyNorm: norm(input.origin, input.destination) } })
  })

  app.delete('/production/mex-lanes/:id', async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    await prisma.carrierMexLane.findFirstOrThrow({ where: { id, orgId } })
    await prisma.carrierMexLane.delete({ where: { id } })
    return reply.status(204).send()
  })

  // ── USA matrix ─────────────────────────────────────────────────────────
  app.get('/production/usa-lanes', async (request) => {
    const { orgId } = request.user as JwtPayload
    return prisma.carrierUsaLane.findMany({ where: { orgId }, orderBy: [{ origin: 'asc' }, { destination: 'asc' }] })
  })

  app.post('/production/usa-lanes', async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const input = UsaLaneSchema.parse(request.body)
    const laneKeyNorm = norm(input.origin, input.destination)
    const lane = await prisma.carrierUsaLane.upsert({
      where: { orgId_laneKeyNorm: { orgId, laneKeyNorm } },
      create: { orgId, laneKeyNorm, ...input },
      update: { ...input },
    })
    return reply.status(201).send(lane)
  })

  app.put('/production/usa-lanes/:id', async (request) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const input = UsaLaneSchema.parse(request.body)
    await prisma.carrierUsaLane.findFirstOrThrow({ where: { id, orgId } })
    return prisma.carrierUsaLane.update({ where: { id }, data: { ...input, laneKeyNorm: norm(input.origin, input.destination) } })
  })

  app.delete('/production/usa-lanes/:id', async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    await prisma.carrierUsaLane.findFirstOrThrow({ where: { id, orgId } })
    await prisma.carrierUsaLane.delete({ where: { id } })
    return reply.status(204).send()
  })
}
