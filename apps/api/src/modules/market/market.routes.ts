import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { CreateMarketDataSchema } from './market.schema.js'
import { prisma } from '../../config/prisma.js'
import { MarketDataType } from '@prisma/client'
import { getFuelStatus, refreshFuelSurcharge, syncSetDieselUsBorder, fetchEiaCurrentDiesel, fetchEiaHistory, getDieselTrend } from './fuel.service.js'

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

  app.post('/market', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
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
  // Read-only operational signals. This endpoint deliberately does not change
  // assumptions, fuel surcharges, quotes, or published RateBooks.
  app.get('/market/intelligence', async (request) => {
    const { orgId } = request.user as JwtPayload
    const now = new Date()
    const inThirtyDays = new Date(now)
    inThirtyDays.setDate(inThirtyDays.getDate() + 30)

    const [dieselPoints, fxPoints, publishedBooks, activeSets] = await Promise.all([
      prisma.dieselHistory.findMany({ where: { areaName: 'U.S.' }, orderBy: { period: 'desc' }, take: 2, select: { period: true, value: true } }),
      prisma.marketData.findMany({ where: { orgId, type: 'FX_RATE' }, orderBy: { date: 'desc' }, take: 2, select: { value: true, unit: true, date: true, source: true } }),
      prisma.rateBook.findMany({
        where: { orgId, status: 'PUBLISHED' }, orderBy: { effectiveFrom: 'asc' },
        select: { id: true, code: true, name: true, effectiveUntil: true, costBaseId: true, assumptionSetId: true, costBase: { select: { scope: true } }, set: { select: { name: true, version: true } } },
      }),
      prisma.assumptionSet.findMany({ where: { orgId, isActive: true, status: 'PUBLISHED' }, select: { id: true, costBaseId: true, name: true, version: true } }),
    ])

    const signals: Array<Record<string, unknown>> = []
    if (dieselPoints.length === 2) {
      const [current, previous] = dieselPoints
      const deltaPercent = previous.value === 0 ? null : ((current.value - previous.value) / previous.value) * 100
      const magnitude = Math.abs(deltaPercent ?? 0)
      signals.push({
        key: 'US_DIESEL_TREND', severity: magnitude >= 8 ? 'ALERT' : magnitude >= 3 ? 'WATCH' : 'INFO', title: 'Variación de diésel EE. UU.',
        summary: deltaPercent === null ? 'Hay una referencia histórica, pero no es comparable contra cero.' : `El último dato cambió ${deltaPercent >= 0 ? '+' : ''}${deltaPercent.toFixed(1)}% contra el periodo anterior.`,
        evidence: { current: current.value, previous: previous.value, unit: 'USD/gal', currentPeriod: current.period, previousPeriod: previous.period, deltaPercent, source: 'EIA historical diesel series' },
        affectedScopes: ['INTRA_US', 'CROSS_BORDER', 'DRAYAGE'], reviewPath: '/fuel', reviewLabel: 'Revisar combustible',
      })
    } else {
      signals.push({
        key: 'US_DIESEL_COVERAGE', severity: 'INFO', title: 'Cobertura de diésel EE. UU.', summary: 'Aún no hay dos observaciones históricas para medir una variación.',
        evidence: { observations: dieselPoints.length, source: 'EIA historical diesel series' }, affectedScopes: ['INTRA_US', 'CROSS_BORDER', 'DRAYAGE'], reviewPath: '/fuel', reviewLabel: 'Ver cobertura de combustible',
      })
    }

    if (fxPoints.length === 2) {
      const [current, previous] = fxPoints
      const deltaPercent = previous.value === 0 ? null : ((current.value - previous.value) / previous.value) * 100
      const magnitude = Math.abs(deltaPercent ?? 0)
      signals.push({
        key: 'FX_TREND', severity: magnitude >= 4 ? 'ALERT' : magnitude >= 1.5 ? 'WATCH' : 'INFO', title: 'Variación de tipo de cambio',
        summary: deltaPercent === null ? 'La observación previa no es comparable contra cero.' : `El último tipo de cambio cambió ${deltaPercent >= 0 ? '+' : ''}${deltaPercent.toFixed(1)}%.`,
        evidence: { current: current.value, previous: previous.value, unit: current.unit, currentDate: current.date, previousDate: previous.date, deltaPercent, source: current.source ?? 'MarketData' },
        affectedScopes: ['CROSS_BORDER'], reviewPath: '/assumptions', reviewLabel: 'Revisar supuestos',
      })
    } else {
      signals.push({
        key: 'FX_COVERAGE', severity: 'INFO', title: 'Cobertura de tipo de cambio', summary: 'Registra al menos dos observaciones de FX para habilitar una señal de tendencia.',
        evidence: { observations: fxPoints.length, source: 'MarketData' }, affectedScopes: ['CROSS_BORDER'], reviewPath: '/assumptions', reviewLabel: 'Revisar supuestos',
      })
    }

    const expiringBooks = publishedBooks.filter((book) => book.effectiveUntil && book.effectiveUntil >= now && book.effectiveUntil <= inThirtyDays)
    if (expiringBooks.length) {
      signals.push({
        key: 'RATEBOOK_EXPIRY', severity: 'WATCH', title: 'RateBooks próximos a vencer', summary: `${expiringBooks.length} RateBook(s) publicado(s) vencen en los próximos 30 días.`,
        evidence: { count: expiringBooks.length, rateBooks: expiringBooks.map((book) => ({ code: book.code, name: book.name, effectiveUntil: book.effectiveUntil, scope: book.costBase.scope })) },
        affectedScopes: [...new Set(expiringBooks.map((book) => book.costBase.scope))], reviewPath: '/ratebooks/regenerate', reviewLabel: 'Preparar regeneración',
      })
    }

    const activeSetByBase = new Map(activeSets.filter((set) => set.costBaseId).map((set) => [set.costBaseId as string, set]))
    const staleBooks = publishedBooks.filter((book) => {
      const activeSet = activeSetByBase.get(book.costBaseId)
      return activeSet && activeSet.id !== book.assumptionSetId
    })
    if (staleBooks.length) {
      signals.push({
        key: 'RATEBOOK_LINEAGE', severity: 'WATCH', title: 'RateBooks con una versión activa posterior', summary: `${staleBooks.length} RateBook(s) se publicaron con una versión de supuestos que ya no es la activa para su base.`,
        evidence: { count: staleBooks.length, rateBooks: staleBooks.map((book) => { const activeSet = activeSetByBase.get(book.costBaseId)!; return { code: book.code, name: book.name, scope: book.costBase.scope, publishedVersion: `${book.set.name} v${book.set.version}`, activeVersion: `${activeSet.name} v${activeSet.version}` } }) },
        affectedScopes: [...new Set(staleBooks.map((book) => book.costBase.scope))], reviewPath: '/ratebooks/regenerate', reviewLabel: 'Revisar regeneración',
      })
    }

    return {
      generatedAt: now,
      policy: 'READ_ONLY_HUMAN_REVIEW_REQUIRED',
      coverage: { dieselObservations: dieselPoints.length, fxObservations: fxPoints.length, publishedRateBooks: publishedBooks.length, expiringRateBooks: expiringBooks.length, staleLineageRateBooks: staleBooks.length },
      signals,
    }
  })

  // Current region diesel + FSC index summary + sample derived state.
  app.get('/market/fuel', async () => getFuelStatus())

  // Update one or more region diesel prices (e.g. weekly EIA refresh).
  const UpdateRegionsSchema = z.object({
    regions: z.array(z.object({ region: z.string().min(1), dieselUsdGal: z.number().nonnegative() })).min(1),
  })
  app.put('/market/fuel/regions', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
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
  app.post('/market/fuel/refresh', { preHandler: requireRole('ADMIN') }, async (request) => {
    const { orgId } = request.user as JwtPayload
    const refresh = await refreshFuelSurcharge()
    const dieselSync = await syncSetDieselUsBorder(orgId)
    return { ...refresh, dieselSync }
  })

  // Live EIA pull: fetch diesel-by-region (EIA RSS) → update RegionDiesel →
  // refresh USA FSC → sync MX Diesel US Border. One call = current fuel everywhere.
  app.post('/market/fuel/fetch-eia', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
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

  // Historical diesel (EIA API v2, EPD2D monthly) → DieselHistory. Needs EIA_API_KEY.
  app.post('/market/fuel/fetch-eia-history', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const q = request.query as { start?: string }
    try {
      return reply.send(await fetchEiaHistory(q.start ?? '2020-01'))
    } catch (err) {
      const msg = (err as Error).message
      return reply.status(msg.includes('EIA_API_KEY') ? 400 : 502).send({ error: 'EIA history fetch failed', detail: msg })
    }
  })

  // Diesel + derived FSC trend for an area (default U.S.).
  app.get('/market/fuel/history', async (request) => {
    const q = request.query as { area?: string; months?: string }
    return getDieselTrend(q.area ?? 'U.S.', Math.min(parseInt(q.months ?? '24') || 24, 120))
  })
}
