import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../../config/prisma.js'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import { ThirdPartyCostSchema } from './third-party-cost.js'
import { frozenPartnerCost, partnerHash, reviewedPartnerCost } from './partner-cost-snapshot.js'

const saveSchema = z.object({ input: ThirdPartyCostSchema, reviewChecksum: z.string().regex(/^[a-f0-9]{64}$/), previousId: z.string().uuid().optional() }).strict()
const publicSelect = { id: true, previousId: true, version: true, actorId: true, createdAt: true, snapshot: true } as const
const failure = (statusCode: number, message: string) => Object.assign(new Error(message), { statusCode })

export async function partnerCostRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', async request => {
    if (!request.user?.orgId || !request.user?.sub) throw failure(403, 'Se requiere una identidad y organización válidas.')
  })
  app.addHook('onSend', async (_request, reply) => { reply.header('Cache-Control', 'no-store') })

  app.post('/partner-cost-estimates', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
    const orgId = request.user.orgId
    const body = saveSchema.parse(request.body)
    const saveKey = z.string().uuid().parse(request.headers['idempotency-key'])
    const intentHash = partnerHash(body)
    const existing = async () => {
      const row = await prisma.partnerCostEstimate.findUnique({ where: { orgId_saveKey: { orgId, saveKey } } })
      if (!row) return null
      if (row.intentHash !== intentHash) throw failure(409, 'La clave de guardado ya corresponde a otra captura.')
      return { id: row.id, version: row.version }
    }
    const retry = await existing()
    if (retry) return reply.send(retry)
    const snapshot = reviewedPartnerCost(body.input)
    if (snapshot.reviewChecksum !== body.reviewChecksum) throw failure(409, 'El cálculo revisado cambió. Vuelve a calcular antes de guardar.')
    if (snapshot.status !== 'ESTIMATE' || snapshot.purchaseCostUsd === null) throw failure(422, 'Completa los conceptos pendientes antes de guardar.')
    const parent = body.previousId ? await prisma.partnerCostEstimate.findFirst({ where: { id: body.previousId, orgId }, select: { version: true, snapshot: true } }) : null
    if (body.previousId && !parent) throw failure(404, 'Estimación no disponible.')
    if (parent && 'baseLineage' in frozenPartnerCost(parent.snapshot)) {
      throw failure(409, 'Este cálculo procede de una base publicada. Recalcula desde la base para conservar su procedencia.')
    }
    try {
      // One atomic insert; DB unique constraints arbitrate retries and competing revisions.
      const row = await prisma.partnerCostEstimate.create({ data: {
        orgId, actorId: request.user.sub, saveKey, intentHash,
        previousId: body.previousId, version: parent ? parent.version + 1 : 1,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
      }, select: { id: true, version: true } })
      return reply.status(201).send(row)
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error
      const reconciled = await existing()
      if (reconciled) return reply.send(reconciled)
      throw failure(409, 'Esta versión ya tiene una sucesora. Abre la versión guardada y consulta la siguiente.')
    }
  })

  app.get('/partner-cost-estimates', async request => {
    const orgId = request.user.orgId
    const { cursor } = z.object({ cursor: z.string().uuid().optional() }).strict().parse(request.query)
    if (cursor && !await prisma.partnerCostEstimate.findFirst({ where: { id: cursor, orgId }, select: { id: true } })) throw failure(404, 'Página no disponible.')
    const rows = await prisma.partnerCostEstimate.findMany({ where: { orgId }, select: publicSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 21, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) })
    const items = rows.slice(0, 20).map(({ snapshot, ...row }) => {
      const report = frozenPartnerCost(snapshot)
      return { ...row, origin: report.input.origin, destination: report.input.destination, serviceDate: report.input.serviceDate, purchaseCostUsd: report.purchaseCostUsd }
    })
    return { items, nextCursor: rows.length > 20 ? items[19].id : null }
  })

  app.get('/partner-cost-estimates/:id', async request => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
    const orgId = request.user.orgId
    const row = await prisma.partnerCostEstimate.findFirst({ where: { id, orgId }, select: publicSelect })
    if (!row) throw failure(404, 'Estimación no disponible.')
    const next = await prisma.partnerCostEstimate.findFirst({ where: { orgId, previousId: id }, select: { id: true } })
    return { ...row, snapshot: frozenPartnerCost(row.snapshot), nextId: next?.id ?? null }
  })
}
