/**
 * Carrier production matrix — the org's OWN lanes (MEX + USA). The lane resolver
 * checks these before the global reference tables, so a carrier can quote any
 * route in their network even if it's not in the seeded V3.0 data.
 */
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { prisma } from '../../config/prisma.js'
import { scopeForOperation } from '../cost-bases/cost-bases.service.js'
import { buildParamMap } from '../assumptions/assumptions.service.js'
import { calculate } from '../engine/engine.calculator.js'
import { missingRequiredPricingLegs, normalizeLaneLookup, resolveRoute } from '../engine/lane-resolver.service.js'
import { buildLaneKey } from '../lanes/lanes.schema.js'
import { buildQuoteExplanation } from '../quotes/quote-explanation.js'
import { buildQuoteCalculationSnapshot } from '../quotes/quote-snapshot.js'
import { Prisma } from '@prisma/client'
import { round2, usdToMxn } from '../../utils/currency.js'
import type { EquipmentSpec, EngineInput } from '../engine/engine.types.js'

const norm = (origin: string, destination: string) => normalizeLaneLookup(`${origin} - ${destination}`)

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

const RouteGeographySchema = z.enum(['MX', 'US', 'CROSS_BORDER'])
const ProductionRouteSchema = z.object({
  code: z.string().trim().min(2).max(40).optional().nullable(),
  origin: z.string().trim().min(2),
  destination: z.string().trim().min(2),
  mexBorder: z.string().trim().min(2).optional().nullable(),
  usaBorder: z.string().trim().min(2).optional().nullable(),
  geography: RouteGeographySchema,
  operation: z.string().trim().min(2),
  service: z.string().trim().min(2).default('One Way'),
  truckType: z.string().trim().min(2).default('Truck'),
  trailerType: z.string().trim().min(2).default('Trailer'),
  config: z.string().trim().min(2).default('Single'),
  driverType: z.string().trim().min(2).default('Company'),
  confirmedCostBaseId: z.string().cuid().optional().nullable(),
  confirmedAssumptionSetId: z.string().cuid().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
})

const ProductionRoutePatchSchema = ProductionRouteSchema.partial()
const QuoteFromProductionRouteSchema = z.object({ label: z.string().trim().min(1).max(200).optional() })
const CreateReplacementRouteSchema = z.object({
  confirmedCostBaseId: z.string().cuid(),
  confirmedAssumptionSetId: z.string().cuid(),
  notes: z.string().trim().min(3).max(2000).optional(),
})

const routeKey = (input: z.infer<typeof ProductionRouteSchema>) => [
  input.geography, input.operation, input.service, input.origin, input.destination,
  input.mexBorder ?? '', input.usaBorder ?? '', input.truckType, input.trailerType,
  input.config, input.driverType,
].map((part) => part.trim().toUpperCase()).join(' | ')

function httpError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode })
}

function assertCompleteResolution(operation: string, resolved: Awaited<ReturnType<typeof resolveRoute>>) {
  const missing = missingRequiredPricingLegs(operation, resolved)
  if (missing.length) {
    const evidence = resolved.warnings.length ? ` ${resolved.warnings.join(' ')}` : ''
    throw httpError(`Could not resolve required ${missing.join(' and ')} pricing leg(s) for ${operation}.${evidence}`, 422)
  }
}

function expectedGeography(operation: string) {
  const scope = scopeForOperation(operation)
  if (scope === 'CROSS_BORDER') return 'CROSS_BORDER'
  if (scope === 'INTRA_US' || scope === 'DRAYAGE') return 'US'
  if (scope === 'INTRA_MEX' || scope === 'LOCAL') return 'MX'
  return null
}

const routeInclude = {
  suggestedCostBase: { select: { id: true, code: true, name: true, scope: true, status: true } },
  confirmedCostBase: { select: { id: true, code: true, name: true, scope: true, status: true } },
  confirmedAssumptionSet: { select: { id: true, name: true, version: true, status: true, costBaseId: true } },
  supersedesRoute: { select: { id: true, code: true, revision: true, status: true, confirmedAssumptionSet: { select: { version: true } } } },
  auditEvents: { include: { actor: { select: { id: true, email: true } } }, orderBy: { createdAt: 'asc' } },
} as const

type CatalogRoute = Awaited<ReturnType<typeof prisma.productionRoute.findFirstOrThrow>> & {
  suggestedCostBase: { id: string; code: string; name: string; scope: string; status: string } | null
  confirmedCostBase: { id: string; code: string; name: string; scope: string; status: string } | null
  confirmedAssumptionSet: { id: string; name: string; version: number; status: string; costBaseId: string | null } | null
  supersedesRoute: { id: string; code: string | null; revision: number; status: string; confirmedAssumptionSet: { version: number } | null } | null
  auditEvents: { id: string; action: string; note: string | null; createdAt: Date; actor: { id: string; email: string } | null }[]
}

function assessRoute(route: CatalogRoute) {
  const reasons: string[] = []
  const expectedScope = scopeForOperation(route.operation)
  const expectedGeo = expectedGeography(route.operation)

  if (expectedGeo && route.geography !== expectedGeo) reasons.push(`La geografÃ­a debe ser ${expectedGeo} para ${route.operation}.`)
  if (route.geography === 'CROSS_BORDER' && (!route.mexBorder || !route.usaBorder)) {
    reasons.push('Una ruta cross-border requiere ambos cruces fronterizos.')
  }
  if (!route.confirmedCostBase) reasons.push('Confirma una base de costos para la ruta.')
  else {
    if (route.confirmedCostBase.status !== 'ACTIVE') reasons.push('La base confirmada no estÃ¡ activa.')
    if (expectedScope && route.confirmedCostBase.scope !== expectedScope) reasons.push(`La base confirmada no corresponde al alcance ${expectedScope}.`)
  }
  if (!route.confirmedAssumptionSet) reasons.push('Confirma la versiÃ³n de supuestos que gobernarÃ¡ la ruta.')
  else {
    if (route.confirmedAssumptionSet.status !== 'PUBLISHED') reasons.push('La versiÃ³n confirmada debe estar publicada.')
    if (route.confirmedAssumptionSet.costBaseId !== route.confirmedCostBaseId) reasons.push('La versiÃ³n confirmada no pertenece a la base confirmada.')
  }

  const hasRequiredContext = Boolean(route.origin && route.destination)
  if (!hasRequiredContext || (route.geography === 'CROSS_BORDER' && (!route.mexBorder || !route.usaBorder))) {
    return { quality: 'INCOMPLETE' as const, reasons }
  }
  if (reasons.length) return { quality: 'NEEDS_REVIEW' as const, reasons }
  return { quality: 'READY' as const, reasons: [] }
}

async function suggestedBase(orgId: string, operation: string) {
  const scope = scopeForOperation(operation)
  if (!scope) return null
  return prisma.costBase.findFirst({
    where: { orgId, scope, status: 'ACTIVE', versions: { some: { isActive: true, status: 'PUBLISHED' } } },
    select: { id: true },
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
  })
}

async function resolveConfirmation(orgId: string, operation: string, baseId?: string | null, setId?: string | null) {
  if (!baseId && !setId) return { confirmedCostBaseId: null, confirmedAssumptionSetId: null }
  if (!baseId) throw httpError('Selecciona la base de costos antes de confirmar una versiÃ³n.', 422)

  const base = await prisma.costBase.findFirst({
    where: { id: baseId, orgId },
    include: { versions: { where: setId ? { id: setId } : { isActive: true, status: 'PUBLISHED' }, select: { id: true, status: true, costBaseId: true } } },
  })
  if (!base) throw httpError('La base de costos no pertenece a tu organizaciÃ³n.', 404)
  const expectedScope = scopeForOperation(operation)
  if (expectedScope && base.scope !== expectedScope) throw httpError(`La base no corresponde al alcance ${expectedScope}.`, 422)
  const version = base.versions[0]
  if (!version) throw httpError('La base no tiene una versiÃ³n publicada activa para confirmar.', 422)
  if (version.status !== 'PUBLISHED' || version.costBaseId !== base.id) throw httpError('La versiÃ³n confirmada no es vÃ¡lida para esta base.', 422)
  return { confirmedCostBaseId: base.id, confirmedAssumptionSetId: version.id }
}

function presentRoute(route: CatalogRoute) {
  return { ...route, ...assessRoute(route) }
}

function engineEquipment(route: { truckType: string; trailerType: string; config: string; driverType: string }): EquipmentSpec {
  return {
    truckType: route.truckType === 'Truck' ? 'Truck Trailer' : route.truckType,
    trailer: route.trailerType === 'Trailer' ? 'Dry Van' : route.trailerType,
    config: route.config,
    driver: route.driverType === 'Company' ? 'B1' : route.driverType,
  }
}

export async function productionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/production/routes', async (request) => {
    const { orgId } = request.user as JwtPayload
    const routes = await prisma.productionRoute.findMany({
      where: { orgId }, include: routeInclude, orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    })
    return routes.map(presentRoute)
  })

  app.post('/production/routes', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
    const user = request.user as JwtPayload
    const { orgId } = user
    const input = ProductionRouteSchema.parse(request.body)
    const suggestion = await suggestedBase(orgId, input.operation)
    const confirmation = await resolveConfirmation(orgId, input.operation, input.confirmedCostBaseId, input.confirmedAssumptionSetId)
    const route = await prisma.productionRoute.create({
      data: { orgId, ...input, routeKey: routeKey(input), suggestedCostBaseId: suggestion?.id ?? null, ...confirmation,
        auditEvents: { create: { orgId, actorId: user.sub, action: 'CREATED', note: 'Production route draft created.' } } },
      include: routeInclude,
    })
    return reply.status(201).send(presentRoute(route))
  })

  app.patch('/production/routes/:id', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const patch = ProductionRoutePatchSchema.parse(request.body)
    const existing = await prisma.productionRoute.findFirstOrThrow({ where: { id, orgId } })
    if (existing.status !== 'DRAFT') throw httpError('A production route is immutable. Archive it and create a new version.', 409)

    const merged = ProductionRouteSchema.parse({ ...existing, ...patch })
    const baseChanged = patch.confirmedCostBaseId !== undefined
    const confirmation = await resolveConfirmation(
      orgId,
      merged.operation,
      baseChanged ? patch.confirmedCostBaseId : existing.confirmedCostBaseId,
      patch.confirmedAssumptionSetId !== undefined ? patch.confirmedAssumptionSetId : baseChanged ? null : existing.confirmedAssumptionSetId,
    )
    const suggestion = patch.operation !== undefined ? await suggestedBase(orgId, merged.operation) : undefined
    const route = await prisma.productionRoute.update({
      where: { id },
      data: {
        ...merged,
        routeKey: routeKey(merged),
        ...(suggestion === undefined ? {} : { suggestedCostBaseId: suggestion?.id ?? null }),
        ...confirmation,
      },
      include: routeInclude,
    })
    return presentRoute(route)
  })

  app.post('/production/routes/:id/produce', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request) => {
    const user = request.user as JwtPayload
    const { orgId } = user
    const { id } = request.params as { id: string }
    const route = await prisma.productionRoute.findFirstOrThrow({ where: { id, orgId }, include: routeInclude })
    if (route.status !== 'DRAFT') throw httpError('Only a draft route can enter production.', 409)
    const assessment = assessRoute(route)
    if (assessment.quality !== 'READY') throw httpError(`Route cannot enter production: ${assessment.reasons.join(' ')}`, 422)
    const resolved = await resolveRoute({
      orgId, outboundLocation: route.origin, inboundLocation: route.destination,
      mexBorder: route.mexBorder ?? route.origin, usBorder: route.usaBorder ?? route.destination,
      equipment: engineEquipment(route), operation: route.operation, service: route.service,
    })
    assertCompleteResolution(route.operation, resolved)
    const produced = await prisma.$transaction(async (tx) => {
      const updated = await tx.productionRoute.update({ where: { id }, data: { status: 'PRODUCTION' }, include: routeInclude })
      await tx.productionRouteAuditEvent.create({ data: { orgId, routeId: id, actorId: user.sub, action: 'PRODUCED', note: 'Route entered production.', payload: { revision: updated.revision } } })
      return updated
    })
    return presentRoute(produced)
  })

  // A production route is immutable. Replacing it creates a separately
  // reviewable draft with explicit lineage; it never reassigns the old route
  // or its saved quotes.
  app.post('/production/routes/:id/replacements', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
    const user = request.user as JwtPayload
    const { orgId } = user
    const { id } = request.params as { id: string }
    const input = CreateReplacementRouteSchema.parse(request.body)
    const source = await prisma.productionRoute.findFirstOrThrow({ where: { id, orgId }, include: routeInclude })
    if (source.status !== 'PRODUCTION') throw httpError('Only a route in production can be replaced.', 409)

    const confirmation = await resolveConfirmation(orgId, source.operation, input.confirmedCostBaseId, input.confirmedAssumptionSetId)
    const latest = await prisma.productionRoute.aggregate({ where: { orgId, routeKey: source.routeKey }, _max: { revision: true } })
    const revision = (latest._max.revision ?? source.revision) + 1
    const suggestion = await suggestedBase(orgId, source.operation)
    const replacement = await prisma.$transaction(async (tx) => {
      const created = await tx.productionRoute.create({
      data: {
        orgId, routeKey: source.routeKey, revision, supersedesRouteId: source.id,
        code: source.code, origin: source.origin, destination: source.destination,
        mexBorder: source.mexBorder, usaBorder: source.usaBorder, geography: source.geography,
        operation: source.operation, service: source.service, truckType: source.truckType,
        trailerType: source.trailerType, config: source.config, driverType: source.driverType,
        suggestedCostBaseId: suggestion?.id ?? null,
        ...confirmation,
        notes: input.notes ?? `Replacement draft for revision ${source.revision}; proposed version selected by an operator.`,
        auditEvents: { create: { orgId, actorId: user.sub, action: 'CREATED', note: 'Replacement route draft created.', payload: { supersedesRouteId: source.id, sourceRevision: source.revision } } },
      },
      include: routeInclude,
    })
      await tx.productionRouteAuditEvent.create({ data: { orgId, routeId: source.id, actorId: user.sub, action: 'REPLACEMENT_PROPOSED', note: input.notes ?? 'A replacement draft was proposed.', payload: { replacementRouteId: created.id, replacementRevision: created.revision, confirmedAssumptionSetId: confirmation.confirmedAssumptionSetId } } })
      return created
    })
    return reply.status(201).send(presentRoute(replacement))
  })

  app.post('/production/routes/:id/archive', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request) => {
    const user = request.user as JwtPayload
    const { orgId } = user
    const { id } = request.params as { id: string }
    await prisma.productionRoute.findFirstOrThrow({ where: { id, orgId } })
    const route = await prisma.$transaction(async (tx) => {
      const updated = await tx.productionRoute.update({ where: { id }, data: { status: 'ARCHIVED' }, include: routeInclude })
      await tx.productionRouteAuditEvent.create({ data: { orgId, routeId: id, actorId: user.sub, action: 'ARCHIVED', note: 'Route archived by an operator.', payload: { revision: updated.revision } } })
      return updated
    })
    return presentRoute(route)
  })

  app.post('/production/routes/:id/quotes', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
    const user = request.user as JwtPayload
    const { orgId } = user
    const { id } = request.params as { id: string }
    const { label } = QuoteFromProductionRouteSchema.parse(request.body ?? {})
    const route = await prisma.productionRoute.findFirstOrThrow({
      where: { id, orgId },
      include: { confirmedCostBase: true, confirmedAssumptionSet: { include: { params: true } } },
    })
    if (route.status !== 'PRODUCTION') throw httpError('Only a route in production can create a governed quote.', 409)
    if (!route.confirmedCostBase || route.confirmedCostBase.status !== 'ACTIVE') throw httpError('The route does not have an active confirmed cost base.', 409)
    if (!route.confirmedAssumptionSet || route.confirmedAssumptionSet.status !== 'PUBLISHED' || route.confirmedAssumptionSet.costBaseId !== route.confirmedCostBaseId) {
      throw httpError('The route does not have a published confirmed assumption version.', 409)
    }

    const equipment = engineEquipment(route)
    const resolved = await resolveRoute({
      orgId, outboundLocation: route.origin, inboundLocation: route.destination,
      mexBorder: route.mexBorder ?? route.origin, usBorder: route.usaBorder ?? route.destination,
      equipment, operation: route.operation, service: route.service,
    })
    assertCompleteResolution(route.operation, resolved)

    const params = buildParamMap(route.confirmedAssumptionSet.params)
    const input: EngineInput = {
      policy: route.confirmedCostBase.defaultPolicy === 'WORKBOOK_V3' ? 'WORKBOOK_V3' : 'OPERATIONAL_V3',
      operation: route.operation, service: route.service, equipment, params,
      mexLeg: resolved.mexLeg, usaLeg: resolved.usaLeg,
    }
    const result = calculate(input)
    const snapshot = buildQuoteCalculationSnapshot(input, result)
    const explanation = buildQuoteExplanation(
      {
        operation: route.operation, service: route.service, equipment,
        mex: resolved.mexLeg ? { baseKm: resolved.mexLeg.baseKm, routeExpensesMxn: resolved.mexLeg.routeExpensesMxn ?? 0, baseHours: resolved.mexLeg.baseHours ?? 0, route: resolved.mexLeg.route } : undefined,
        usa: resolved.usaLeg ? { loadedMiles: resolved.usaLeg.loadedMiles, transitDaysRaw: resolved.usaLeg.transitDaysRaw ?? 0, driverExpenses: resolved.usaLeg.driverExpenses ?? 0, outState: resolved.usaLeg.outState, dieselUsdGal: resolved.usaLeg.dieselUsdGal, fscUsdMile: resolved.usaLeg.fscUsdMile, originCondition: resolved.usaLeg.originCondition, destCondition: resolved.usaLeg.destCondition } : undefined,
      }, result,
      {
        costBase: { id: route.confirmedCostBase.id, code: route.confirmedCostBase.code, name: route.confirmedCostBase.name, scope: route.confirmedCostBase.scope, status: route.confirmedCostBase.status },
        set: { id: route.confirmedAssumptionSet.id, name: route.confirmedAssumptionSet.name, version: route.confirmedAssumptionSet.version, status: route.confirmedAssumptionSet.status }, policy: result.policy,
      }, snapshot,
    )
    const laneKey = buildLaneKey(orgId, route.origin, route.destination, undefined, route.operation, route.service, route.config, route.confirmedCostBase.id)
    const lane = await prisma.lane.upsert({
      where: { orgId_laneKey: { orgId, laneKey } },
      create: { orgId, laneKey, costBaseId: route.confirmedCostBase.id, origin: route.origin, destination: route.destination, operationType: route.operation, serviceType: route.service, config: route.config },
      update: { costBaseId: route.confirmedCostBase.id }, select: { id: true },
    })
    const quote = await prisma.quote.create({
      data: {
        orgId, laneId: lane.id, productionRouteId: route.id, assumptionSetId: route.confirmedAssumptionSet.id, costBaseId: route.confirmedCostBase.id,
        label: label ?? route.code ?? undefined, calculationPolicy: result.policy, operation: result.operation, service: route.service,
        freightBaselineUsd: result.freightBaselineUsd, requiredTariffUsd: result.requiredTariffUsd, requiredTariffMxn: round2(usdToMxn(result.requiredTariffUsd, result.fxRateUsed)), fxRateUsed: result.fxRateUsed,
        mexLeg: (result.mexLeg ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
        usaLeg: (result.usaLeg ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
        commercial: result.commercial as unknown as Prisma.InputJsonValue,
        explanation: explanation as unknown as Prisma.InputJsonValue,
        auditEvents: { create: { orgId, actorId: user.sub, action: 'CREATED', note: 'Quote created from a production route.', payload: { source: 'PRODUCTION_ROUTE', productionRouteId: route.id, snapshotChecksum: snapshot.checksum, resolverWarningCount: resolved.warnings.length } as Prisma.InputJsonValue } },
      },
    })
    return reply.status(201).send({ ...quote, resolverWarnings: resolved.warnings })
  })

  // ── MEX matrix ─────────────────────────────────────────────────────────
  app.get('/production/mex-lanes', async (request) => {
    const { orgId } = request.user as JwtPayload
    return prisma.carrierMexLane.findMany({ where: { orgId }, orderBy: [{ origin: 'asc' }, { destination: 'asc' }] })
  })

  app.post('/production/mex-lanes', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
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

  app.put('/production/mex-lanes/:id', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const input = MexLaneSchema.parse(request.body)
    await prisma.carrierMexLane.findFirstOrThrow({ where: { id, orgId } })
    return prisma.carrierMexLane.update({ where: { id }, data: { ...input, laneKeyNorm: norm(input.origin, input.destination) } })
  })

  app.delete('/production/mex-lanes/:id', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
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

  app.post('/production/usa-lanes', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
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

  app.put('/production/usa-lanes/:id', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const input = UsaLaneSchema.parse(request.body)
    await prisma.carrierUsaLane.findFirstOrThrow({ where: { id, orgId } })
    return prisma.carrierUsaLane.update({ where: { id }, data: { ...input, laneKeyNorm: norm(input.origin, input.destination) } })
  })

  app.delete('/production/usa-lanes/:id', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    await prisma.carrierUsaLane.findFirstOrThrow({ where: { id, orgId } })
    await prisma.carrierUsaLane.delete({ where: { id } })
    return reply.status(204).send()
  })
}
