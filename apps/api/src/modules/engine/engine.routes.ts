import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { authenticate } from '../../middleware/authenticate.js'
import { prisma } from '../../config/prisma.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { buildParamMap, type ParamMap } from '../assumptions/assumptions.service.js'
import { calculate } from './engine.calculator.js'
import { resolveRoute } from './lane-resolver.service.js'
import { defaultService } from './engine.factors.js'
import type { EngineInput, EquipmentSpec, MarketCondition } from './engine.types.js'
import { assertCalculationOverrides, resolveCalculationContext, scopeForOperation } from '../cost-bases/cost-bases.service.js'
import { pricingInputIssues } from './engine-input-validation.js'
import { buildQuoteCalculationSnapshot, calculateForQuoteSnapshot } from '../quotes/quote-snapshot.js'
import { verifiedPreviewData } from '../quotes/quote-preview.js'
import { compareObservedTripCosts } from './engine-economic-validation.js'
import { OperationalSegmentSchema, segmentFor } from '../cost-bases/operational-segments.js'
import { requireRole } from '../../middleware/authorize.js'
import { reviewedPartnerCost } from './partner-cost-snapshot.js'

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
  // Roundtrip second leg (only used when service === 'Roundtrip'); all optional.
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

const DrayageSchema = z.object({
  loadedMiles: z.number().positive(),
  portPickupMiles: z.number().nonnegative().optional(),
  emptyReturnMiles: z.number().nonnegative().optional(),
  finalRepositionMiles: z.number().nonnegative().optional(),
  portDwellHours: z.number().nonnegative().optional(),
  deliveryServiceHours: z.number().nonnegative().optional(),
  transitDaysRaw: z.number().nonnegative().default(0),
  emptyReturnRequired: z.boolean().optional(),
  dropOff: z.boolean().optional(),
  chassisReturnRequired: z.boolean().optional(),
  dieselUsdGal: z.number().nonnegative().default(0),
  fscUsdMile: z.number().nonnegative().default(0),
  outState: z.string().default('TX'),
  returnTollUsd: z.number().nonnegative().optional(),
  driverExpenses: z.number().nonnegative().optional(),
  marketRpm: z.number().nonnegative().optional(),
})

const CalculateSchema = z.object({
  policy: EnginePolicySchema.optional(),
  costBaseId: z.string().min(1).optional(),
  assumptionSetId: z.string().min(1).optional(),
  overrides: z.record(z.number()).optional(),
  operation: z.string(),
  service: z.string().optional(), // omitted → defaultService(operation); carrier can override
  equipment: EquipmentSchema.default({}),
  fxRate: z.number().positive().optional(),
  mex: MexSchema.optional(),
  usa: UsaSchema.optional(),
  drayage: DrayageSchema.optional(),
})

export async function engineRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.post('/engine/third-party-cost', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store')
    return reply.send(reviewedPartnerCost(request.body))
  })

  const EconomicComparisonSchema = z.object({
    previewId: z.string().min(1),
    observed: z.object({
      sourceReference: z.string().trim().min(4).max(240),
      asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
        const date = new Date(`${value}T00:00:00Z`)
        return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
          && date.getTime() <= Date.now()
      }, 'Invalid observation date'),
      allocationMethod: z.string().trim().min(10).max(500),
      mexProductionCostUsd: z.number().finite().positive().optional(),
      usaProductionCostUsd: z.number().finite().positive().optional(),
    }).strict(),
  }).strict()

  app.post('/engine/compare-observed-cost', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store')
    const { orgId } = request.user as JwtPayload
    const body = EconomicComparisonSchema.parse(request.body)
    const preview = await prisma.quoteCalculationPreview.findFirst({ where: { id: body.previewId, orgId } })
    if (!preview) return reply.status(404).send({ error: 'Calculation preview not found for this organization.' })
    if (preview.expiresAt.getTime() <= Date.now()) return reply.status(409).send({ error: 'Calculation preview expired; calculate again.' })
    const { lineage, snapshot } = verifiedPreviewData(preview)
    if (lineage.readiness !== 'GOVERNED' || !lineage.costBase) {
      return reply.status(422).send({ error: 'A governed cost base is required for observed-cost comparison.' })
    }
    const base = await prisma.costBase.findFirst({
      where: { id: lineage.costBase.id, orgId },
      select: { operationalSegment: true },
    })
    const parsedSegment = OperationalSegmentSchema.safeParse(base?.operationalSegment)
    if (!parsedSegment.success || segmentFor(parsedSegment.data).status !== 'CONFIGURABLE') {
      return reply.status(422).send({ error: 'This segment has no supported own-cost comparison model.' })
    }
    return reply.send(compareObservedTripCosts(parsedSegment.data, calculateForQuoteSnapshot(snapshot), body.observed))
  })

  app.post('/engine/calculate', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
    const { orgId } = request.user as JwtPayload
    const body = CalculateSchema.parse(request.body)

    const inputIssues = pricingInputIssues(body.operation, {
      mex: body.mex,
      usa: body.usa,
      drayage: body.drayage,
    })
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
      mexLeg: body.mex
        ? { ...body.mex, operation: body.operation, service, equipment }
        : undefined,
      usaLeg: body.usa
        ? {
            ...body.usa,
            originCondition: body.usa.originCondition as MarketCondition,
            destCondition: body.usa.destCondition as MarketCondition,
            operation: body.operation,
            service,
            equipment,
          }
        : undefined,
      drayageLeg: body.drayage
        ? { ...body.drayage, operation: body.operation, service, equipment }
        : undefined,
    }

    const result = calculate(input)
    return reply.send({
      ...result,
      costBaseId: costBase?.id ?? null,
      assumptionSetId: set?.id ?? null,
      applicabilityProfile,
    })
  })

  // ── Quote by route name — resolves leg facts from V3.0 reference tables ───
  const ByRouteSchema = z.object({
    policy: EnginePolicySchema.optional(),
    costBaseId: z.string().min(1).optional(),
    assumptionSetId: z.string().min(1).optional(),
    overrides: z.record(z.number()).optional(),
    outboundLocation: z.string().min(1),
    inboundLocation: z.string().min(1),
    mexBorder: z.string().default('Nuevo Laredo, Tamaulipas'),
    usBorder: z.string().default('Laredo, TX'),
    operation: z.string(),
    service: z.string().optional(), // omitted → defaultService(operation); carrier can override
    route: z.string().default('Straight & Danger'),
    equipment: EquipmentSchema.default({}),
    fxRate: z.number().positive().optional(),
  })

  app.post('/engine/quote-by-route', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store')
    const { orgId } = request.user as JwtPayload
    const body = ByRouteSchema.parse(request.body)
    const service = body.service ?? defaultService(body.operation)

    const resolved = await resolveRoute({
      orgId,
      outboundLocation: body.outboundLocation,
      inboundLocation: body.inboundLocation,
      mexBorder: body.mexBorder,
      usBorder: body.usBorder,
      equipment: body.equipment,
      operation: body.operation,
      service,
      route: body.route,
    })

    const inputIssues = pricingInputIssues(body.operation, {
      mex: resolved.mexLeg,
      usa: resolved.usaLeg,
    })
    if (inputIssues.length > 0) {
      return reply.status(422).send({ error: inputIssues.join(' '), issues: inputIssues, warnings: resolved.warnings })
    }

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

    const input: EngineInput = {
      policy: body.policy ?? defaultPolicy,
      applicabilityProfile: applicabilityProfile ?? undefined,
      operation: body.operation,
      service,
      equipment: body.equipment,
      params,
      fxRate: body.fxRate,
      overrides: body.overrides,
      mexLeg: resolved.mexLeg,
      usaLeg: resolved.usaLeg,
    }
    const result = calculate(input)
    const snapshot = buildQuoteCalculationSnapshot({ ...input, params: { ...params, ...(body.overrides ?? {}) }, overrides: undefined }, result)
    const lineage = {
      costBase: costBase ? { id: costBase.id, code: costBase.code, name: costBase.name, scope: costBase.scope, status: costBase.status } : null,
      set: set ? { id: set.id, name: set.name, version: set.version, status: set.status, isActive: set.isActive } : null,
      policy: result.policy,
      readiness: !costBase ? 'LEGACY' : costBase.status === 'ACTIVE' && set?.status === 'PUBLISHED'
        && set.isActive && set.applicabilityContext != null && set.params.length === 210 ? 'GOVERNED' : 'IN_PREPARATION',
    }
    const capture = {
      origin: body.outboundLocation.trim(), destination: body.inboundLocation.trim(),
      mexBorder: body.mexBorder, usBorder: body.usBorder, route: body.route,
      operation: body.operation, service, equipment: body.equipment, fxRate: body.fxRate ?? null,
    }
    const preview = await prisma.quoteCalculationPreview.create({
      data: {
        orgId, capture: capture as Prisma.InputJsonValue,
        lineage: lineage as Prisma.InputJsonValue,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        result: { ...result, resolved: { mexLeg: resolved.mexLeg ?? null, usaLeg: resolved.usaLeg ?? null }, warnings: resolved.warnings } as unknown as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 20 * 60_000),
      },
      select: { id: true },
    })

    return reply.send({
      ...result,
      resolved: { mexLeg: resolved.mexLeg ?? null, usaLeg: resolved.usaLeg ?? null },
      warnings: resolved.warnings,
      costBaseId: costBase?.id ?? null,
      assumptionSetId: set?.id ?? null,
      applicabilityProfile,
      lineage,
      previewId: preview.id,
    })
  })
}
