import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/prisma.js'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import type { JwtPayload } from '../auth/auth.schema.js'
import { TireCohortV2ResearchPersistence } from './tire-cohort-v2-persistence.js'

type PersistencePort = Pick<TireCohortV2ResearchPersistence, 'capture' | 'current'>
const QuerySchema = z.object({ comparisonKey: z.string().trim().min(1) }).strict()

export async function assertTireV2RuntimeRlsSafe() {
  const rows = await prisma.$queryRaw<{
    superuser: boolean; bypassrls: boolean; table_count: bigint; safe_table_count: bigint;
  }[]>`
    SELECT r.rolsuper AS superuser, r.rolbypassrls AS bypassrls,
      count(c.oid) AS table_count,
      count(c.oid) FILTER (WHERE c.relrowsecurity AND c.relforcerowsecurity
        AND has_table_privilege(current_user, c.oid, 'SELECT')
        AND has_table_privilege(current_user, c.oid, 'INSERT')
        AND has_table_privilege(current_user, c.oid, 'UPDATE')) AS safe_table_count
    FROM pg_roles r CROSS JOIN pg_class c
    WHERE r.rolname = current_user AND c.relnamespace = 'public'::regnamespace
      AND c.relname IN ('TireCohortV2ResearchSnapshot', 'TireCohortV2ResearchHead')
    GROUP BY r.rolsuper, r.rolbypassrls
  `
  const row = rows[0]
  if (!row || row.superuser || row.bypassrls ||
      Number(row.table_count) !== 2 || Number(row.safe_table_count) !== 2) {
    throw new Error('TIRE_V2_CAPTURE_RUNTIME_RLS_UNSAFE')
  }
}

function identityFrom(user: JwtPayload) {
  if (!user.supabaseId) throw Object.assign(new Error('AUTH_IDENTITY_MAPPING_REQUIRED'), { statusCode: 401 })
  return { internalUserId: user.sub, supabaseId: user.supabaseId, orgId: user.orgId, role: user.role }
}

/** Disabled by default until isolated migration and tenant RLS are approved and verified. */
export function createTireCohortV2ResearchRoutes(
  persistence: PersistencePort, enabled = false,
  ensureRuntimeSafe: () => Promise<void> = assertTireV2RuntimeRlsSafe,
) {
  return async function registeredTireCohortV2ResearchRoutes(app: FastifyInstance) {
    if (!enabled) return
    await ensureRuntimeSafe()
    app.addHook('preHandler', authenticate)
    app.get('/cost-bases/tire-cohort-v2-research/current', async (request, reply) => {
      const { comparisonKey } = QuerySchema.parse(request.query)
      return reply.header('Cache-Control', 'no-store')
        .send(await persistence.current(identityFrom(request.user as JwtPayload), comparisonKey))
    })
    app.post('/cost-bases/tire-cohort-v2-research', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request, reply) => {
      const result = await persistence.capture(identityFrom(request.user as JwtPayload), request.body)
      return reply.status(201).header('Cache-Control', 'no-store').send(result)
    })
  }
}

export const tireCohortV2ResearchRoutes = createTireCohortV2ResearchRoutes(
  new TireCohortV2ResearchPersistence(prisma),
  process.env.FCM_TIRE_V2_RESEARCH_CAPTURE_ENABLED === 'true',
)
