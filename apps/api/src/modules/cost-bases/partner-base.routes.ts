import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../../config/prisma.js'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import { errorHandler } from '../../middleware/error-handler.js'
import { PartnerBaseTermsSchema, PartnerBaseTripSchema, calculatePublishedPartnerBase } from './partner-base-contract.js'
import { calculateThirdPartyCost } from '../engine/third-party-cost.js'
import { partnerHash } from '../engine/partner-cost-snapshot.js'

const fail = (statusCode: number, message: string) => Object.assign(new Error(message), { statusCode })
const params = z.object({ baseId: z.string().uuid(), versionId: z.string().uuid().optional() }).strict()
const createSchema = z.object({ code: z.string().trim().regex(/^[A-Z0-9_-]{2,32}$/),
  name: z.string().trim().min(2).max(120), terms: PartnerBaseTermsSchema }).strict()
const reviseSchema = z.object({ expectedLatestVersionId: z.string().uuid(), terms: PartnerBaseTermsSchema }).strict()
const publishSchema = z.object({ expectedActiveVersionId: z.string().uuid().nullable(),
  note: z.string().trim().min(10).max(500) }).strict()
const saveSchema = z.object({ trip: PartnerBaseTripSchema, reviewChecksum: z.string().regex(/^[a-f0-9]{64}$/) }).strict()
const lifecycleSchema = z.object({ archived: z.boolean(), expectedRevision: z.number().int().nonnegative(),
  expectedActiveVersionId: z.string().uuid().nullable(), note: z.string().trim().min(10).max(500) }).strict()
const lifecycleSelect = { id: true, revision: true, archived: true, actorId: true, note: true, createdAt: true } as const
function available(base: { archived: boolean }) {
  if (base.archived) throw fail(409, 'Base retirada. Consulta su historial o solicita reactivación a un administrador.')
}
const json = (value: unknown) => value as Prisma.InputJsonValue
const versionSelect = { id: true, version: true, status: true, terms: true, termsChecksum: true, actorId: true,
  publishedById: true, publishedAt: true, publicationNote: true, createdAt: true } as const

async function lockedBase(tx: Prisma.TransactionClient, orgId: string, baseId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "PartnerTariffBase" WHERE "id" = ${baseId} AND "orgId" = ${orgId} FOR UPDATE`
  if (!rows.length) throw fail(404, 'Base no disponible.')
  return tx.partnerTariffBase.findUniqueOrThrow({ where: { id: baseId } })
}

async function reviewed(tx: Prisma.TransactionClient, orgId: string, baseId: string, versionId: string, trip: unknown) {
  const base = await lockedBase(tx, orgId, baseId)
  available(base)
  const version = await tx.partnerTariffVersion.findFirst({ where: { id: versionId, orgId, baseId } })
  if (!version) throw fail(404, 'Versión no disponible.')
  if (base.activeVersionId !== versionId || version.status !== 'PUBLISHED') throw fail(409, 'Selecciona la versión publicada activa de esta base.')
  if (partnerHash(version.terms) !== version.termsChecksum) throw new Error('Tariff terms integrity mismatch')
  const report = calculatePublishedPartnerBase(orgId, {
    orgId, costBaseId: baseId, versionId, version: version.version, terms: version.terms,
    model: 'FCM_THIRD_PARTY_FLAT_V1', baseStatus: 'ACTIVE', status: 'PUBLISHED', isActive: true,
  }, trip)
  return { ...report, reviewChecksum: partnerHash(report) }
}

export async function partnerBaseRoutes(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return reply.status(409).send({ error: 'La clave o versión ya está en uso. Recarga antes de reintentar.' })
    }
    return errorHandler(error instanceof Error ? error : new Error('Unknown partner base error'), request, reply)
  })
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', async request => {
    if (!request.user?.orgId || !request.user?.sub) throw fail(403, 'Se requiere identidad y organización.')
  })
  app.addHook('onSend', async (_request, reply) => { reply.header('Cache-Control', 'no-store') })

  app.get('/partner-bases', async request => {
    const { cursor } = z.object({ cursor: z.string().uuid().optional() }).strict().parse(request.query)
    const orgId = request.user.orgId
    if (cursor && !await prisma.partnerTariffBase.findFirst({ where: { id: cursor, orgId } })) throw fail(404, 'Página no disponible.')
    const rows = await prisma.partnerTariffBase.findMany({ where: { orgId },
      select: { id: true, code: true, name: true, activeVersionId: true, archived: true, lifecycleRevision: true, createdAt: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 21,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) })
    return { items: rows.slice(0, 20), nextCursor: rows.length > 20 ? rows[19].id : null }
  })

  app.get('/partner-bases/:baseId', async request => {
    const { baseId } = params.parse(request.params)
    const base = await prisma.partnerTariffBase.findFirst({ where: { id: baseId, orgId: request.user.orgId },
      select: { id: true, code: true, name: true, activeVersionId: true, archived: true, lifecycleRevision: true, createdAt: true,
        lifecycleEvents: { select: lifecycleSelect, orderBy: { revision: 'desc' }, take: 20 },
        _count: { select: { versions: true } },
        versions: { orderBy: { version: 'desc' }, take: 20, select: versionSelect } } })
    if (!base) throw fail(404, 'Base no disponible.')
    return base
  })

  app.get('/partner-bases/:baseId/versions', async request => {
    const { baseId } = params.parse(request.params)
    const { before } = z.object({ before: z.coerce.number().int().positive().optional() }).strict().parse(request.query)
    const orgId = request.user.orgId
    if (!await prisma.partnerTariffBase.findFirst({ where: { id: baseId, orgId }, select: { id: true } })) throw fail(404, 'Base no disponible.')
    const rows = await prisma.partnerTariffVersion.findMany({ where: { orgId, baseId, ...(before ? { version: { lt: before } } : {}) },
      select: versionSelect, orderBy: { version: 'desc' }, take: 21 })
    return { items: rows.slice(0, 20), nextBefore: rows.length > 20 ? rows[19].version : null }
  })

  app.post('/partner-bases', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const body = createSchema.parse(request.body)
    const saveKey = z.string().uuid().parse(request.headers['idempotency-key'])
    const { orgId, sub: actorId } = request.user
    const intentHash = partnerHash(body)
    const existing = async () => {
      const row = await prisma.partnerTariffBase.findUnique({ where: { orgId_saveKey: { orgId, saveKey } } })
      if (row && row.intentHash !== intentHash) throw fail(409, 'La clave ya corresponde a otra base.')
      return row ? { id: row.id } : null
    }
    const retry = await existing(); if (retry) return retry
    try {
      const row = await prisma.partnerTariffBase.create({ data: { orgId, code: body.code, name: body.name, actorId, saveKey, intentHash,
        versions: { create: { version: 1, terms: json(body.terms), termsChecksum: partnerHash(body.terms), actorId, saveKey, intentHash } } },
        select: { id: true } })
      return reply.status(201).send(row)
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error
      const retry = await existing(); if (retry) return retry
      throw fail(409, 'El código o la clave ya están en uso.')
    }
  })

  app.post('/partner-bases/:baseId/versions', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const { baseId } = params.parse(request.params)
    const body = reviseSchema.parse(request.body)
    const saveKey = z.string().uuid().parse(request.headers['idempotency-key'])
    const { orgId, sub: actorId } = request.user
    const intentHash = partnerHash({ baseId, ...body })
    const row = await prisma.$transaction(async tx => {
      const base = await lockedBase(tx, orgId, baseId)
      const retry = await tx.partnerTariffVersion.findUnique({ where: { orgId_saveKey: { orgId, saveKey } } })
      if (retry) {
        if (retry.intentHash !== intentHash || retry.baseId !== baseId) throw fail(409, 'La clave ya corresponde a otra revisión.')
        return { id: retry.id, version: retry.version }
      }
      available(base)
      const latest = await tx.partnerTariffVersion.findFirstOrThrow({ where: { orgId, baseId }, orderBy: { version: 'desc' } })
      if (latest.id !== body.expectedLatestVersionId) throw fail(409, 'La base tiene una versión posterior. Recarga antes de revisar.')
      return tx.partnerTariffVersion.create({ data: { orgId, baseId, version: latest.version + 1, terms: json(body.terms),
        termsChecksum: partnerHash(body.terms), actorId, saveKey, intentHash }, select: { id: true, version: true } })
    })
    return reply.status(201).send(row)
  })

  app.post('/partner-bases/:baseId/versions/:versionId/publish', { preHandler: requireRole('ADMIN') }, async request => {
    const { baseId, versionId } = params.parse(request.params)
    const body = publishSchema.parse(request.body)
    const { orgId, sub: actorId } = request.user
    return prisma.$transaction(async tx => {
      const base = await lockedBase(tx, orgId, baseId)
      available(base)
      const version = await tx.partnerTariffVersion.findFirst({ where: { id: versionId!, orgId, baseId } })
      if (!version) throw fail(404, 'Versión no disponible.')
      if (base.activeVersionId === version.id && version.status === 'PUBLISHED') {
        if (version.publicationNote !== body.note) throw fail(409, 'La publicación ya tiene otra nota.')
        return { id: version.id, status: version.status }
      }
      if (base.activeVersionId !== body.expectedActiveVersionId || version.status !== 'DRAFT') throw fail(409, 'La versión activa cambió.')
      const latest = await tx.partnerTariffVersion.findFirstOrThrow({ where: { orgId, baseId }, orderBy: { version: 'desc' } })
      if (latest.id !== version.id) throw fail(409, 'Publica únicamente la última revisión.')
      const terms = PartnerBaseTermsSchema.parse(version.terms)
      if (partnerHash(terms) !== version.termsChecksum) throw new Error('Tariff terms integrity mismatch')
      const starts = [terms.mex.validFrom, terms.usa.validFrom,
        ...[terms.crossing, terms.interchange].flatMap(term => term.mode === 'EXTRA' ? [term.validFrom] : [])]
      // Validate intersecting validity and all inclusions without inventing an FX rate.
      const report = calculateThirdPartyCost({ ...terms, serviceDate: starts.sort().at(-1)! })
      if (report.issues.some(issue => issue.field !== 'fx')) throw fail(422, 'Completa los conceptos y verifica que las vigencias coincidan antes de publicar.')
      await tx.partnerTariffVersion.update({ where: { id: version.id }, data: { status: 'PUBLISHED',
        publishedById: actorId, publishedAt: new Date(), publicationNote: body.note } })
      await tx.partnerTariffBase.update({ where: { id: baseId }, data: { activeVersionId: version.id } })
      return { id: version.id, status: 'PUBLISHED' }
    })
  })

  app.post('/partner-bases/:baseId/versions/:versionId/calculate', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async request => {
    const { baseId, versionId } = params.parse(request.params)
    const trip = PartnerBaseTripSchema.parse(request.body)
    return prisma.$transaction(tx => reviewed(tx, request.user.orgId, baseId, versionId!, trip))
  })

  app.post('/partner-bases/:baseId/lifecycle', { preHandler: requireRole('ADMIN') }, async request => {
    const { baseId } = params.parse(request.params)
    const body = lifecycleSchema.parse(request.body)
    const saveKey = z.string().uuid().parse(request.headers['idempotency-key'])
    const { orgId, sub: actorId } = request.user
    const intentHash = partnerHash({ baseId, ...body })
    return prisma.$transaction(async tx => {
      const base = await lockedBase(tx, orgId, baseId)
      const retry = await tx.partnerTariffLifecycle.findUnique({ where: { orgId_saveKey: { orgId, saveKey } } })
      if (retry) {
        if (retry.intentHash !== intentHash) throw fail(409, 'La clave ya corresponde a otra transición.')
        return { id: retry.id, revision: retry.revision, archived: retry.archived }
      }
      if (base.lifecycleRevision !== body.expectedRevision || base.activeVersionId !== body.expectedActiveVersionId || base.archived === body.archived) {
        throw fail(409, 'El estado o la versión activa cambió. Recarga la base antes de confirmar.')
      }
      const event = await tx.partnerTariffLifecycle.create({ data: { orgId, baseId, revision: base.lifecycleRevision + 1,
        archived: body.archived, actorId, note: body.note, saveKey, intentHash }, select: { id: true, revision: true, archived: true } })
      await tx.partnerTariffBase.update({ where: { id: baseId }, data: { archived: event.archived, lifecycleRevision: event.revision } })
      return event
    })
  })

  app.get('/partner-bases/:baseId/lifecycle', async request => {
    const { baseId } = params.parse(request.params)
    const { before } = z.object({ before: z.coerce.number().int().positive().optional() }).strict().parse(request.query)
    const orgId = request.user.orgId
    if (!await prisma.partnerTariffBase.findFirst({ where: { id: baseId, orgId }, select: { id: true } })) throw fail(404, 'Base no disponible.')
    const rows = await prisma.partnerTariffLifecycle.findMany({ where: { orgId, baseId, ...(before ? { revision: { lt: before } } : {}) },
      select: lifecycleSelect, orderBy: { revision: 'desc' }, take: 21 })
    return { items: rows.slice(0, 20), nextBefore: rows.length > 20 ? rows[19].revision : null }
  })

  app.post('/partner-bases/:baseId/versions/:versionId/estimates', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
    const { baseId, versionId } = params.parse(request.params)
    const body = saveSchema.parse(request.body)
    const saveKey = z.string().uuid().parse(request.headers['idempotency-key'])
    const { orgId, sub: actorId } = request.user
    const intentHash = partnerHash({ baseId, versionId, ...body })
    const result = await prisma.$transaction(async tx => {
      await lockedBase(tx, orgId, baseId)
      const retry = await tx.partnerCostEstimate.findUnique({ where: { orgId_saveKey: { orgId, saveKey } } })
      if (retry) {
        if (retry.intentHash !== intentHash) throw fail(409, 'La clave ya corresponde a otro cálculo.')
        return { id: retry.id, version: retry.version }
      }
      const snapshot = await reviewed(tx, orgId, baseId, versionId!, body.trip)
      if (snapshot.reviewChecksum !== body.reviewChecksum) throw fail(409, 'El cálculo revisado cambió. Calcula nuevamente.')
      if (snapshot.status !== 'ESTIMATE' || snapshot.purchaseCostUsd === null) throw fail(422, 'El cálculo tiene conceptos pendientes o fuera de vigencia.')
      return tx.partnerCostEstimate.create({ data: { orgId, actorId, saveKey, intentHash, version: 1, snapshot: json(snapshot) },
        select: { id: true, version: true } })
    })
    return reply.status(201).send(result)
  })
}
