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
import { assertCalculationOverrides, resolveCalculationContext, scopeForOperation } from '../cost-bases/cost-bases.service.js'
import { buildQuoteExplanation } from './quote-explanation.js'
import { buildQuoteCalculationSnapshot, isQuoteCalculationSnapshot, verifyQuoteCalculationSnapshot } from './quote-snapshot.js'
import { buildRatewareHandoff, confirmationEligibility, ratewareEconomicsDriftReasons } from './quote-governance.js'
import { assessRatewareCandidate, assessRatewareReadiness } from './rateware-candidate.js'
import { pricingInputIssues } from '../engine/engine-input-validation.js'
import { CustomerProposalDraftRequestSchema, ProposalPreviewKeySchema, buildCustomerProposalDraftPreview } from './customer-proposal-draft.js'
import { previewSaveIntentHash, verifiedPreviewData } from './quote-preview.js'

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
  baseKm: z.number().positive(),
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
  loadedMiles: z.number().positive(),
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
const SavePreviewSchema = z.object({ previewId: z.string().min(1), label: z.string().trim().max(160).nullable().optional() }).strict()
const SavePreviewKeySchema = z.string().uuid()
const ConfirmQuoteSchema = z.object({ note: z.string().trim().min(3).max(2000) })
const RatewareEnrichmentSchema = z.object({ carrier: z.string().trim().min(2).max(160), effectiveDate: z.string().date(), rateOwner: z.string().trim().min(2).max(160), capacityPerWeek: z.number().int().positive().max(1_000_000).optional(), notes: z.string().trim().max(1000).optional() })
const RATEWARE_REQUIRED_ENRICHMENT_FIELDS = ['carrier', 'effectiveDate', 'rateOwner'] as const

function ratewareEnrichmentState(value: unknown) {
  if (value == null) {
    return {
      enrichment: null,
      blockers: [`Falta enriquecimiento Rateware: ${RATEWARE_REQUIRED_ENRICHMENT_FIELDS.join(', ')}.`],
    }
  }
  const parsed = RatewareEnrichmentSchema.safeParse(value)
  if (parsed.success) return { enrichment: parsed.data, blockers: [] as string[] }
  const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? 'payload')))]
  return {
    enrichment: null,
    blockers: [`El enriquecimiento Rateware es incompleto o inválido: ${fields.join(', ')}.`],
  }
}

function httpError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode })
}

async function quoteOr404<T>(query: Promise<T>): Promise<T> {
  try { return await query }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw httpError('La cotización no está disponible.', 404)
    }
    throw error
  }
}

type QuoteLaneContext = {
  costBaseId: string | null
  operationType: string
  serviceType: string
  config: string
  origin: string
  destination: string
  equipment?: {
    truckType: string
    trailerType: string
    config: string
    operationType: string
    serviceType: string
    driverType: string
  } | null
}

export function assertQuoteLaneCompatible(
  lane: QuoteLaneContext,
  expected: {
    costBaseId: string | null
    operation: string
    service: string
    config: string
    origin?: string
    destination?: string
    equipment: EquipmentSpec
  },
) {
  if (lane.costBaseId !== expected.costBaseId) {
    throw httpError('La lane seleccionada no pertenece a la misma base de costos de la cotización.', 422)
  }
  if (lane.operationType !== expected.operation || lane.serviceType !== expected.service || lane.config !== expected.config) {
    throw httpError('La lane seleccionada no coincide con la operación, servicio y configuración de la cotización.', 422)
  }
  if (lane.equipment && (
    lane.equipment.truckType !== expected.equipment.truckType
    || lane.equipment.trailerType !== expected.equipment.trailer
    || lane.equipment.config !== expected.equipment.config
    || lane.equipment.operationType !== expected.operation
    || lane.equipment.serviceType !== expected.service
    || lane.equipment.driverType !== expected.equipment.driver
  )) {
    throw httpError('El equipo guardado en la lane no coincide con el equipo de la cotización.', 422)
  }
  const normalized = (value: string) => value.trim().toLocaleUpperCase('en-US')
  if (expected.origin && normalized(lane.origin) !== normalized(expected.origin)) {
    throw httpError('El origen capturado no coincide con la lane seleccionada.', 422)
  }
  if (expected.destination && normalized(lane.destination) !== normalized(expected.destination)) {
    throw httpError('El destino capturado no coincide con la lane seleccionada.', 422)
  }
}

export async function quotesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.post('/quotes/from-preview', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store')
    const user = request.user as JwtPayload
    const body = SavePreviewSchema.parse(request.body)
    const key = SavePreviewKeySchema.parse(request.headers['idempotency-key'])
    const label = body.label?.trim() || null
    const intentHash = previewSaveIntentHash(body.previewId, label)
    const prior = await prisma.quoteSaveIntent.findUnique({ where: { orgId_key: { orgId: user.orgId, key } }, include: { quote: true } })
    if (prior) {
      if (prior.intentHash !== intentHash) throw httpError('La clave de guardado ya se utilizó con otro contenido.', 409)
      return reply.status(200).send(prior.quote)
    }

    const preview = await prisma.quoteCalculationPreview.findFirst({ where: { id: body.previewId, orgId: user.orgId } })
    if (!preview) throw httpError('La vista previa no está disponible para esta organización.', 404)
    if (preview.expiresAt.getTime() <= Date.now()) throw httpError('El cálculo está desactualizado. Calcula de nuevo antes de guardar.', 409)
    const { capture, lineage, snapshot, result } = verifiedPreviewData(preview)

    if (lineage.set) {
      const version = await prisma.assumptionSet.findFirst({
        where: { id: lineage.set.id, orgId: user.orgId },
        select: { id: true, isActive: true, status: true, costBaseId: true },
      })
      if (!version || version.isActive !== lineage.set.isActive || version.status !== lineage.set.status || version.costBaseId !== (lineage.costBase?.id ?? null)) {
        throw httpError('La versión de supuestos cambió desde el cálculo. Calcula de nuevo.', 409)
      }
    }
    if (lineage.costBase) {
      const base = await prisma.costBase.findFirst({
        where: { id: lineage.costBase.id, orgId: user.orgId }, select: { id: true, status: true },
      })
      if (!base || base.status !== lineage.costBase.status) {
        throw httpError('La base de costos cambió desde el cálculo. Calcula de nuevo.', 409)
      }
    }

    const explanation = buildQuoteExplanation({
      operation: capture.operation, service: capture.service, equipment: capture.equipment,
      fxRate: capture.fxRate ?? undefined, mex: snapshot.input.mexLeg, usa: snapshot.input.usaLeg,
      drayage: snapshot.input.drayageLeg,
    }, result, lineage, snapshot)
    const create = () => prisma.$transaction(async (tx) => {
      const laneKey = buildLaneKey(user.orgId, capture.origin, capture.destination, undefined,
        capture.operation, capture.service, capture.equipment.config, lineage.costBase?.id ?? null)
      const lane = await tx.lane.upsert({
        where: { orgId_laneKey: { orgId: user.orgId, laneKey } },
        create: {
          orgId: user.orgId, laneKey, costBaseId: lineage.costBase?.id ?? null,
          origin: capture.origin, destination: capture.destination,
          operationType: capture.operation, serviceType: capture.service, config: capture.equipment.config,
        },
        update: { costBaseId: lineage.costBase?.id ?? null },
        select: { id: true },
      })
      const quote = await tx.quote.create({
        data: {
          orgId: user.orgId, laneId: lane.id,
          assumptionSetId: lineage.set?.id ?? undefined, costBaseId: lineage.costBase?.id ?? undefined,
          label, previewId: preview.id,
          calculationPolicy: result.policy, operation: result.operation, service: capture.service,
          freightBaselineUsd: result.freightBaselineUsd, requiredTariffUsd: result.requiredTariffUsd,
          requiredTariffMxn: round2(usdToMxn(result.requiredTariffUsd, result.fxRateUsed)), fxRateUsed: result.fxRateUsed,
          mexLeg: (result.mexLeg ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
          usaLeg: (result.usaLeg ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
          commercial: result.commercial as unknown as Prisma.InputJsonValue,
          explanation: explanation as unknown as Prisma.InputJsonValue,
          auditEvents: { create: {
            orgId: user.orgId, actorId: user.sub, action: 'CREATED',
            note: 'Quote saved from a reviewed server calculation.',
            payload: { source: 'REVIEWED_PREVIEW', previewId: preview.id, snapshotChecksum: snapshot.checksum,
              costBaseId: lineage.costBase?.id ?? null, assumptionSetId: lineage.set?.id ?? null } as Prisma.InputJsonValue,
          } },
        },
      })
      await tx.quoteSaveIntent.create({ data: { orgId: user.orgId, key, intentHash, quoteId: quote.id } })
      return quote
    })
    try {
      return reply.status(201).send(await create())
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const winner = await prisma.quoteSaveIntent.findUnique({ where: { orgId_key: { orgId: user.orgId, key } }, include: { quote: true } })
        if (winner && winner.intentHash === intentHash) return reply.status(200).send(winner.quote)
        if (winner) throw httpError('La clave de guardado ya se utilizó con otro contenido.', 409)
      }
      throw error
    }
  })

  app.post('/quotes', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
    const user = request.user as JwtPayload
    const { orgId } = user
    const body = CreateQuoteSchema.parse(request.body)
    const inputIssues = pricingInputIssues(body.operation, { mex: body.mex, usa: body.usa })
    if (inputIssues.length > 0) {
      return reply.status(422).send({ error: inputIssues.join(' '), issues: inputIssues })
    }

    // Carrier's choice: explicit service, else the prevailing per-operation default.
    const service = body.service ?? defaultService(body.operation)

    let params: ParamMap = {}
    const { costBase, set, defaultPolicy, applicabilityProfile } = await resolveCalculationContext(orgId, {
      costBaseId: body.costBaseId,
      assumptionSetId: body.assumptionSetId,
      operation: body.operation,
      service,
      policy: body.policy,
      equipment: body.equipment,
    })
    assertCalculationOverrides(costBase?.scope ?? scopeForOperation(body.operation), body.overrides, applicabilityProfile)
    if (set) params = buildParamMap(set.params)

    const selectedLane = body.laneId
      ? await prisma.lane.findFirst({
          where: { id: body.laneId, orgId },
          select: {
            id: true, costBaseId: true, operationType: true, serviceType: true,
            config: true, origin: true, destination: true,
            equipment: {
              select: {
                truckType: true, trailerType: true, config: true,
                operationType: true, serviceType: true, driverType: true,
              },
            },
          },
        })
      : null
    if (body.laneId && !selectedLane) throw httpError('La lane seleccionada no pertenece a tu organización.', 404)
    if (selectedLane) {
      assertQuoteLaneCompatible(selectedLane, {
        costBaseId: costBase?.id ?? null,
        operation: body.operation,
        service,
        config: body.equipment.config,
        origin: body.origin,
        destination: body.destination,
        equipment: body.equipment,
      })
    }

    const equipment: EquipmentSpec = body.equipment
    const input: EngineInput = {
      policy: body.policy ?? defaultPolicy,
      applicabilityProfile: applicabilityProfile ?? undefined,
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
    let laneId = selectedLane?.id
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
    return quoteOr404(prisma.quote.findFirstOrThrow({
      where: { id, orgId },
      include: {
        lane: { include: { equipment: true } },
        productionRoute: { select: { id: true, code: true, status: true, origin: true, destination: true } },
        set: true,
        costBase: { select: { id: true, code: true, name: true, scope: true } },
        confirmedBy: { select: { id: true, email: true } },
        auditEvents: { include: { actor: { select: { id: true, email: true } } }, orderBy: { createdAt: 'asc' } },
      },
    }))
  })

  app.post('/quotes/:id/customer-proposal-draft/preview', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store')
    const user = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const idempotencyHeader = request.headers['idempotency-key']
    const idempotencyKey = ProposalPreviewKeySchema.parse(idempotencyHeader)
    const body = CustomerProposalDraftRequestSchema.parse(request.body)
    const quote = await prisma.quote.findFirst({
      where: { id, orgId: user.orgId },
      select: {
        id: true,
        status: true,
        confirmedAt: true,
        explanation: true,
        lane: { select: { origin: true, destination: true } },
      },
    })
    if (!quote) throw httpError('La cotización no está disponible.', 404)
    if (quote.status !== 'CONFIRMED') throw httpError('Confirma la cotización antes de revisar una propuesta.', 409)
    let eligibility: ReturnType<typeof confirmationEligibility>
    try {
      eligibility = confirmationEligibility(quote.explanation)
    } catch {
      throw httpError('La evidencia guardada no permite revisar esta propuesta.', 409)
    }
    return buildCustomerProposalDraftPreview({
      quote,
      request: body,
      eligibility,
      idempotencyKey,
    })
  })

  app.post('/quotes/:id/replay', async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const quote = await quoteOr404(prisma.quote.findFirstOrThrow({ where: { id, orgId }, select: { explanation: true } }))
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
    const quote = await quoteOr404(prisma.quote.findFirstOrThrow({ where: { id, orgId: user.orgId }, select: { id: true, status: true, explanation: true } }))
    if (quote.status !== 'DRAFT') throw Object.assign(new Error('Only a draft quote can be confirmed.'), { statusCode: 409 })
    const eligibility = confirmationEligibility(quote.explanation)
    if (!eligibility.eligible) throw Object.assign(new Error(`Quote cannot be confirmed: ${eligibility.reasons.join(' ')}`), { statusCode: 422 })
    const confirmedAt = new Date()
    return prisma.$transaction(async (transaction) => {
      const transition = await transaction.quote.updateMany({
        where: { id, orgId: user.orgId, status: 'DRAFT' },
        data: { status: 'CONFIRMED', confirmedAt, confirmedById: user.sub, confirmationNote: note },
      })
      if (transition.count !== 1) {
        throw Object.assign(new Error('Quote confirmation lost a concurrent transition; the quote was not confirmed again.'), { statusCode: 409 })
      }
      await transaction.quoteAuditEvent.create({
        data: {
          orgId: user.orgId,
          quoteId: id,
          actorId: user.sub,
          action: 'CONFIRMED',
          note,
          payload: { snapshotChecksum: eligibility.snapshot?.checksum ?? null } as Prisma.InputJsonValue,
        },
      })
      return transaction.quote.findFirstOrThrow({
        where: { id, orgId: user.orgId },
        include: { confirmedBy: { select: { id: true, email: true } } },
      })
    })
  })

  app.get('/integration/rateware/quotes/:id', async (request) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const quote = await quoteOr404(prisma.quote.findFirstOrThrow({
      where: { id, orgId },
      include: {
        lane: { select: { origin: true, destination: true } },
        productionRoute: { select: { id: true, code: true, status: true } },
        confirmedBy: { select: { id: true, email: true } },
        auditEvents: { where: { action: 'RATEWARE_ENRICHED' }, orderBy: { createdAt: 'desc' }, take: 1, select: { payload: true } },
      },
    }))
    if (quote.status !== 'CONFIRMED') throw Object.assign(new Error('Only confirmed quotes can be packaged for Rateware.'), { statusCode: 409 })
    const eligibility = confirmationEligibility(quote.explanation)
    const handoff = eligibility.snapshot
      ? buildRatewareHandoff({ quote, snapshot: eligibility.snapshot, explanation: eligibility.explanation })
      : null
    const ratewareCandidate = handoff ? assessRatewareCandidate(handoff) : null
    const packageBlockers = eligibility.snapshot
      ? ratewareEconomicsDriftReasons(quote, eligibility.snapshot)
      : []
    const enrichmentState = ratewareEnrichmentState(quote.auditEvents[0]?.payload ?? null)
    const readiness = assessRatewareReadiness({
      confirmationEligibility: eligibility,
      ratewareCandidate,
      enrichmentReady: enrichmentState.enrichment !== null,
      enrichmentBlockers: enrichmentState.blockers,
      packageBlockers,
    })
    if (!readiness.ready || !handoff || !enrichmentState.enrichment) {
      throw Object.assign(new Error(`Rateware package is not ready: ${readiness.blockers.join(' ')}`), { statusCode: 409 })
    }
    return { ...handoff, enrichment: enrichmentState.enrichment }
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
      const handoff = eligibility.snapshot
        ? buildRatewareHandoff({ quote, snapshot: eligibility.snapshot, explanation: eligibility.explanation })
        : null
      const candidate = handoff ? assessRatewareCandidate(handoff) : null
      const packageBlockers = eligibility.snapshot
        ? ratewareEconomicsDriftReasons(quote, eligibility.snapshot)
        : []
      const enrichmentState = ratewareEnrichmentState(quote.auditEvents[0]?.payload ?? null)
      const readiness = assessRatewareReadiness({
        confirmationEligibility: eligibility,
        ratewareCandidate: candidate,
        enrichmentReady: enrichmentState.enrichment !== null,
        enrichmentBlockers: enrichmentState.blockers,
        packageBlockers,
      })
      return {
        id: quote.id, label: quote.label, operation: quote.operation, service: quote.service,
        requiredTariffUsd: quote.requiredTariffUsd, createdAt: quote.createdAt, confirmedAt: quote.confirmedAt,
        confirmedBy: quote.confirmedBy, lane: quote.lane, productionRoute: quote.productionRoute,
        ready: readiness.ready, blockers: readiness.blockers,
        snapshotChecksum: eligibility.snapshot?.checksum ?? null,
        ratewareCandidate: candidate,
        enrichment: enrichmentState.enrichment,
      }
    })
    return { contractVersion: 'fcm.rateware-handoff.v1', total: data.length, ready: data.filter((item) => item.ready).length, data }
  })

  app.post('/integration/rateware/quotes/:id/enrichment', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request) => {
    const user = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const enrichment = RatewareEnrichmentSchema.parse(request.body)
    const quote = await quoteOr404(prisma.quote.findFirstOrThrow({ where: { id, orgId: user.orgId }, select: { id: true, status: true, explanation: true } }))
    if (quote.status !== 'CONFIRMED') throw Object.assign(new Error('Only confirmed quotes can be enriched for Rateware.'), { statusCode: 409 })
    if (!confirmationEligibility(quote.explanation).eligible) throw Object.assign(new Error('Quote evidence is not eligible for Rateware enrichment.'), { statusCode: 409 })
    return prisma.quoteAuditEvent.create({ data: { orgId: user.orgId, quoteId: id, actorId: user.sub, action: 'RATEWARE_ENRICHED', note: `Rateware enrichment recorded for ${enrichment.carrier}.`, payload: enrichment as Prisma.InputJsonValue }, include: { actor: { select: { id: true, email: true } } } })
  })

  app.delete('/quotes/:id', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    await quoteOr404(prisma.quote.findFirstOrThrow({ where: { id, orgId } }))
    await prisma.quote.delete({ where: { id } })
    return reply.status(204).send()
  })
}
