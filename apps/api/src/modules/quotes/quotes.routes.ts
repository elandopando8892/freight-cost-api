import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { prisma } from '../../config/prisma.js'
import { buildParamMap, type ParamMap } from '../assumptions/assumptions.service.js'
import { buildLaneKey } from '../lanes/lanes.schema.js'
import { calculate } from '../engine/engine.calculator.js'
import { defaultService } from '../engine/engine.factors.js'
import { usdToMxn, round2 } from '../../utils/currency.js'
import type { EngineInput, EquipmentSpec, MarketCondition } from '../engine/engine.types.js'
import { resolveCalculationContext } from '../cost-bases/cost-bases.service.js'
import { buildQuoteExplanation } from './quote-explanation.js'
import { buildQuoteCalculationSnapshot, isQuoteCalculationSnapshot, verifyQuoteCalculationSnapshot } from './quote-snapshot.js'
import { buildRatewareHandoff, confirmationEligibility } from './quote-governance.js'
import { assessRatewareCandidate } from './rateware-candidate.js'

const MarketConditionEnum = z.enum([
  'Very Tight', 'Moderately Tight', 'Balanced', 'Slightly Loose', 'Very Loose',
  'Slightly Tight', 'Neutral', 'Moderately Loose',
])
const EquipmentSchema = z.object({
  truckType: z.string().default('Truck Trailer'),
  trailer: z.string().default('Dry Van'),
  config: z.string().default('Single'),
  driver: z.string().default('B1'),
})
const EnginePolicySchema = z.enum(['OPERATIONAL_V3', 'WORKBOOK_V3'])
const MexSchema = z.object({
  baseKm: z.number().nonnegative(),
  routeExpensesMxn: z.number().nonnegative().default(0),
  baseHours: z.number().nonnegative().default(0),
  route: z.string().default('Straight & Danger'),
  // E3 Roundtrip second leg (only used when service === 'Roundtrip'); all optional.
  returnKm: z.number().nonnegative().optional(),
  returnLoaded: z.boolean().optional(),
  returnRouteExpensesMxn: z.number().nonnegative().optional(),
  returnBaseHours: z.number().nonnegative().optional(),
})
const UsaSchema = z.object({
  loadedMiles: z.number().nonnegative(),
  transitDaysRaw: z.number().nonnegative().default(0),
  driverExpenses: z.number().nonnegative().default(0),
  outState: z.string().default('TX'),
  dieselUsdGal: z.number().nonnegative().default(0),
  fscUsdMile: z.number().nonnegative().default(0),
  originCondition: MarketConditionEnum.default('Balanced'),
  destCondition: MarketConditionEnum.default('Balanced'),
})
const CreateQuoteSchema = z.object({
  policy: EnginePolicySchema.optional(),
  costBaseId: z.string().min(1).optional(),
  label: z.string().optional(),
  laneId: z.string().min(1).optional(),
  origin: z.string().min(1).optional(),       // lane endpoints (outbound/inbound the user entered)
  destination: z.string().min(1).optional(),
  assumptionSetId: z.string().min(1).optional(),
  overrides: z.record(z.number()).optional(),
  operation: z.string(),
  service: z.string().optional(), // omitted → defaultService(operation); carrier can override
  equipment: EquipmentSchema.default({}),
  fxRate: z.number().positive().optional(),
  mex: MexSchema.optional(),
  usa: UsaSchema.optional(),
})
const ConfirmQuoteSchema = z.object({ note: z.string().trim().min(3).max(2000) })
const RatewareEnrichmentSchema = z.object({ carrier: z.string().trim().min(2).max(160), effectiveDate: z.string().date(), rateOwner: z.string().trim().min(2).max(160), capacityPerWeek: z.number().int().positive().max(1_000_000).optional(), notes: z.string().trim().max(1000).optional() })

export async function quotesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.post('/quotes', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
    const user = request.user as JwtPayload
    const { orgId } = user
    const body = CreateQuoteSchema.parse(request.body)
    if (!body.mex && !body.usa) {
      return reply.status(422).send({ error: 'Provide at least one of mex or usa leg facts.' })
    }

    // Carrier's choice: explicit service, else the prevailing per-operation default.
    const service = body.service ?? defaultService(body.operation)

    let params: ParamMap = {}
    const { costBase, set, defaultPolicy } = await resolveCalculationContext(orgId, body)
    if (set) params = buildParamMap(set.params)

    const equipment: EquipmentSpec = body.equipment
    const input: EngineInput = {
      policy: body.policy ?? defaultPolicy,
      operation: body.operation,
      service,
      equipment,
      params,
      fxRate: body.fxRate,
      overrides: body.overrides,
      mexLeg: body.mex ? { ...body.mex, operation: body.operation, service, equipment } : undefined,
      usaLeg: body.usa
        ? {
            ...body.usa,
            originCondition: body.usa.originCondition as MarketCondition,
            destCondition: body.usa.destCondition as MarketCondition,
            operation: body.operation, service, equipment,
          }
        : undefined,
    }

    const r = calculate(input)
    const snapshot = buildQuoteCalculationSnapshot({ ...input, params: { ...params, ...(body.overrides ?? {}) }, overrides: undefined }, r)
    const explanation = buildQuoteExplanation(
      { ...body, service },
      r,
      {
        costBase: costBase ? { id: costBase.id, code: costBase.code, name: costBase.name, scope: costBase.scope, status: costBase.status } : null,
        set: set ? { id: set.id, name: set.name, version: set.version, status: set.status } : null,
        policy: r.policy,
      },
      snapshot,
    )

    // Persist the lane (origin → destination) so History + recent-lanes are meaningful.
    let laneId = body.laneId
    if (!laneId && body.origin && body.destination) {
      const laneKey = buildLaneKey(orgId, body.origin, body.destination, undefined, body.operation, service, body.equipment.config, costBase?.id)
      const lane = await prisma.lane.upsert({
        where: { orgId_laneKey: { orgId, laneKey } },
        create: {
          orgId, laneKey, costBaseId: costBase?.id,
          origin: body.origin, destination: body.destination,
          operationType: body.operation, serviceType: service, config: body.equipment.config,
        },
        update: { costBaseId: costBase?.id },
        select: { id: true },
      })
      laneId = lane.id
    }

    const quote = await prisma.quote.create({
      data: {
        orgId,
        laneId: laneId ?? undefined,
        assumptionSetId: set?.id ?? undefined,
        costBaseId: costBase?.id ?? undefined,
        label: body.label,
        calculationPolicy: r.policy,
        operation: r.operation,
        service,
        freightBaselineUsd: r.freightBaselineUsd,
        requiredTariffUsd: r.requiredTariffUsd,
        requiredTariffMxn: round2(usdToMxn(r.requiredTariffUsd, r.fxRateUsed)),
        fxRateUsed: r.fxRateUsed,
        mexLeg: (r.mexLeg ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
        usaLeg: (r.usaLeg ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
        commercial: (r.commercial ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
        explanation: explanation as unknown as Prisma.InputJsonValue,
        auditEvents: { create: { orgId, actorId: user.sub, action: 'CREATED', note: 'Quote created manually.', payload: { source: 'MANUAL', snapshotChecksum: snapshot.checksum, costBaseId: costBase?.id ?? null, assumptionSetId: set?.id ?? null } as Prisma.InputJsonValue } },
      },
    })
    return reply.status(201).send(quote)
  })

  app.get('/quotes', async (request) => {
    const { orgId } = request.user as JwtPayload
    return prisma.quote.findMany({
      where: { orgId },
      include: {
        lane: true,
        productionRoute: { select: { id: true, code: true, status: true, origin: true, destination: true } },
        set: { select: { id: true, name: true, version: true } },
        costBase: { select: { id: true, code: true, name: true, scope: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  })

  app.get('/quotes/:id', async (request) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    return prisma.quote.findFirstOrThrow({
      where: { id, orgId },
      include: {
        lane: { include: { equipment: true } },
        productionRoute: { select: { id: true, code: true, status: true, origin: true, destination: true } },
        set: true,
        costBase: { select: { id: true, code: true, name: true, scope: true } },
        confirmedBy: { select: { id: true, email: true } },
        auditEvents: { include: { actor: { select: { id: true, email: true } } }, orderBy: { createdAt: 'asc' } },
      },
    })
  })

  app.post('/quotes/:id/replay', async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const quote = await prisma.quote.findFirstOrThrow({ where: { id, orgId }, select: { explanation: true } })
    const explanation = quote.explanation as { snapshot?: unknown } | null
    if (!isQuoteCalculationSnapshot(explanation?.snapshot)) {
      return reply.status(409).send({ error: 'This historical quote does not have a reproducible calculation snapshot.' })
    }
    return verifyQuoteCalculationSnapshot(explanation.snapshot)
  })

  app.post('/quotes/:id/confirm', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request) => {
    const user = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const { note } = ConfirmQuoteSchema.parse(request.body)
    const quote = await prisma.quote.findFirstOrThrow({ where: { id, orgId: user.orgId }, select: { id: true, status: true, explanation: true } })
    if (quote.status !== 'DRAFT') throw Object.assign(new Error('Only a draft quote can be confirmed.'), { statusCode: 409 })
    const eligibility = confirmationEligibility(quote.explanation)
    if (!eligibility.eligible) throw Object.assign(new Error(`Quote cannot be confirmed: ${eligibility.reasons.join(' ')}`), { statusCode: 422 })
    return prisma.quote.update({
      where: { id },
      data: {
        status: 'CONFIRMED', confirmedAt: new Date(), confirmedById: user.sub, confirmationNote: note,
        auditEvents: { create: { orgId: user.orgId, actorId: user.sub, action: 'CONFIRMED', note, payload: { snapshotChecksum: eligibility.snapshot?.checksum ?? null } as Prisma.InputJsonValue } },
      },
      include: { confirmedBy: { select: { id: true, email: true } } },
    })
  })

  app.get('/integration/rateware/quotes/:id', async (request) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const quote = await prisma.quote.findFirstOrThrow({
      where: { id, orgId },
      include: { lane: { select: { origin: true, destination: true } }, productionRoute: { select: { id: true, code: true, status: true } }, confirmedBy: { select: { id: true, email: true } } },
    })
    if (quote.status !== 'CONFIRMED') throw Object.assign(new Error('Only confirmed quotes can be packaged for Rateware.'), { statusCode: 409 })
    const eligibility = confirmationEligibility(quote.explanation)
    if (!eligibility.eligible || !eligibility.snapshot) throw Object.assign(new Error('The confirmed quote no longer has eligible evidence for a Rateware handoff.'), { statusCode: 409 })
    return buildRatewareHandoff({ quote, snapshot: eligibility.snapshot, explanation: eligibility.explanation })
  })

  // Read-only local queue. A consumer may download an individual package only
  // after a person has confirmed it; this endpoint never sends data to Rateware.
  app.get('/integration/rateware/quotes', async (request) => {
    const { orgId } = request.user as JwtPayload
    const quotes = await prisma.quote.findMany({
      where: { orgId, status: 'CONFIRMED' },
      include: {
        lane: { select: { origin: true, destination: true } },
        productionRoute: { select: { id: true, code: true, status: true } },
        confirmedBy: { select: { id: true, email: true } },
        auditEvents: { where: { action: 'RATEWARE_ENRICHED' }, orderBy: { createdAt: 'desc' }, take: 1, select: { payload: true, createdAt: true, actor: { select: { email: true } } } },
      },
      orderBy: { confirmedAt: 'desc' },
    })
    const data = quotes.map((quote) => {
      const eligibility = confirmationEligibility(quote.explanation)
      const enrichment = quote.auditEvents[0]?.payload ?? null
      const candidate = eligibility.eligible && eligibility.snapshot ? assessRatewareCandidate(buildRatewareHandoff({ quote, snapshot: eligibility.snapshot, explanation: eligibility.explanation })) : null
      return {
        id: quote.id, label: quote.label, operation: quote.operation, service: quote.service,
        requiredTariffUsd: quote.requiredTariffUsd, createdAt: quote.createdAt, confirmedAt: quote.confirmedAt,
        confirmedBy: quote.confirmedBy, lane: quote.lane, productionRoute: quote.productionRoute,
        ready: eligibility.eligible, blockers: eligibility.reasons,
        snapshotChecksum: eligibility.snapshot?.checksum ?? null,
        ratewareCandidate: candidate,
        enrichment,
      }
    })
    return { contractVersion: 'fcm.rateware-handoff.v1', total: data.length, ready: data.filter((item) => item.ready).length, data }
  })

  app.post('/integration/rateware/quotes/:id/enrichment', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request) => {
    const user = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const enrichment = RatewareEnrichmentSchema.parse(request.body)
    const quote = await prisma.quote.findFirstOrThrow({ where: { id, orgId: user.orgId }, select: { id: true, status: true, explanation: true } })
    if (quote.status !== 'CONFIRMED') throw Object.assign(new Error('Only confirmed quotes can be enriched for Rateware.'), { statusCode: 409 })
    if (!confirmationEligibility(quote.explanation).eligible) throw Object.assign(new Error('Quote evidence is not eligible for Rateware enrichment.'), { statusCode: 409 })
    return prisma.quoteAuditEvent.create({ data: { orgId: user.orgId, quoteId: id, actorId: user.sub, action: 'RATEWARE_ENRICHED', note: `Rateware enrichment recorded for ${enrichment.carrier}.`, payload: enrichment as Prisma.InputJsonValue }, include: { actor: { select: { id: true, email: true } } } })
  })

  app.delete('/quotes/:id', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    await prisma.quote.findFirstOrThrow({ where: { id, orgId } })
    await prisma.quote.delete({ where: { id } })
    return reply.status(204).send()
  })
}
