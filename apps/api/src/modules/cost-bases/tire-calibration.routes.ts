import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/prisma.js'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import {
  TireCalibrationPersistence,
  type TireCalibrationIdentity,
} from './tire-calibration-persistence.js'
import { TireCohortSourcePersistence } from './tire-cohort-source-persistence.js'

const ParamsSchema = z.object({ id: z.string().trim().min(1) }).strict()
type TireCalibrationPersistencePort = Pick<TireCalibrationPersistence, 'reviewers' | 'list' | 'get' | 'open' | 'assign' | 'economicDecision' | 'independentDecision'>
type TireCohortSourcePersistencePort = Pick<TireCohortSourcePersistence, 'capture' | 'current'>
const SourceQuerySchema = z.object({ cohortKey: z.string().trim().min(1) }).strict()

function identityFrom(user: JwtPayload): TireCalibrationIdentity {
  if (!user.supabaseId) throw Object.assign(new Error('AUTH_IDENTITY_MAPPING_REQUIRED'), { statusCode: 401 })
  return {
    internalUserId: user.sub,
    supabaseId: user.supabaseId,
    orgId: user.orgId,
    role: user.role,
  }
}

/**
 * Authenticated tenant boundary for calibration review evidence.
 * It intentionally exposes no parameter-publication or cost-base-activation route.
 */
export function createTireCalibrationRoutes(persistence: TireCalibrationPersistencePort, sources: TireCohortSourcePersistencePort) {
  return async function registeredTireCalibrationRoutes(app: FastifyInstance) {
    app.addHook('preHandler', authenticate)

    app.get('/cost-bases/tire-calibration-reviewers', async request =>
      persistence.reviewers(identityFrom(request.user as JwtPayload)))

    app.get('/cost-bases/tire-cohort-sources/current', async request => {
      const { cohortKey } = SourceQuerySchema.parse(request.query)
      return sources.current(identityFrom(request.user as JwtPayload), cohortKey)
    })

    app.post('/cost-bases/tire-cohort-sources', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
      const result = await sources.capture(identityFrom(request.user as JwtPayload), request.body)
      return reply.status(201).send(result)
    })

    app.get('/cost-bases/tire-calibrations', async request =>
      persistence.list(identityFrom(request.user as JwtPayload)))

    app.get('/cost-bases/tire-calibrations/:id', async request => {
      const { id } = ParamsSchema.parse(request.params)
      return persistence.get(identityFrom(request.user as JwtPayload), id)
    })

    app.post('/cost-bases/tire-calibrations', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
      const receipt = await persistence.open(identityFrom(request.user as JwtPayload), request.body)
      return reply.status(201).send(receipt)
    })

    app.post('/cost-bases/tire-calibrations/:id/assign-reviewers', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async request => {
      const { id } = ParamsSchema.parse(request.params)
      return persistence.assign(identityFrom(request.user as JwtPayload), id, request.body)
    })

    app.post('/cost-bases/tire-calibrations/:id/economic-decision', { preHandler: requireRole('ADMIN') }, async request => {
      const { id } = ParamsSchema.parse(request.params)
      return persistence.economicDecision(identityFrom(request.user as JwtPayload), id, request.body)
    })

    app.post('/cost-bases/tire-calibrations/:id/independent-decision', { preHandler: requireRole('ADMIN') }, async request => {
      const { id } = ParamsSchema.parse(request.params)
      return persistence.independentDecision(identityFrom(request.user as JwtPayload), id, request.body)
    })
  }
}

export const tireCalibrationRoutes = createTireCalibrationRoutes(
  new TireCalibrationPersistence(prisma),
  new TireCohortSourcePersistence(prisma),
)
