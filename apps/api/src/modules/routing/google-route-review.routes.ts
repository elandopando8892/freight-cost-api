import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import { createGoogleBasicRouteClient, GoogleBasicRouteRequestSchema, GoogleRouteError } from './google-basic-route.client.js'

const bodySchema = z.object({ acknowledgeUsage: z.literal(true), request: GoogleBasicRouteRequestSchema }).strict()
export type GoogleReviewBudget = { remaining: (kind: 'map' | 'routes') => 0 | 1; reserve: (kind: 'map' | 'routes') => boolean }
type Options = { environment?: string; enabled?: string; apiKey?: string; fetcher?: typeof fetch;
  budget?: GoogleReviewBudget; allowedRequest?: { origin: string; destination: string } }

/** Local review only. One Routes attempt shared across all users of this plugin instance.
 * No file loading, persistent content, engine handoff, production activation or response logging. */
export async function googleRouteReviewRoutes(app: FastifyInstance, options: Options = {}) {
  const environment = options.environment ?? process.env.NODE_ENV
  const enabled = environment === 'development' && (options.enabled ?? process.env.FCM_GOOGLE_ROUTE_REVIEW_ENABLED) === 'true'
  const apiKey = options.apiKey ?? process.env.GOOGLE_ROUTES_API_KEY
  let attempted = false
  let mapOwner: string | undefined
  const routeAllowed = (request: z.infer<typeof GoogleBasicRouteRequestSchema>) => !options.allowedRequest ||
    (request.origin === options.allowedRequest.origin && request.destination === options.allowedRequest.destination && request.intermediates.length === 0)
  const owner = (request: { user?: { sub: string; orgId: string } }) => `${request.user?.orgId}:${request.user?.sub}`
  app.addHook('onSend', async (_request, reply) => { reply.header('Cache-Control', 'no-store') })
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', async (request, reply) => {
    if (!request.user?.sub || !request.user.orgId) return reply.status(403).send({ error: 'Identidad y organización requeridas.' })
  })
  const guard = requireRole('ADMIN', 'OPERATOR')
  app.get('/routing/google-basic/config', { preHandler: guard }, async () => ({
    enabled: enabled && !!apiKey?.trim(), remainingAttempts: options.budget?.remaining('routes') ?? (attempted ? 0 : 1),
    ...(options.budget ? { remainingMapLoads: options.budget.remaining('map') } : {}),
    policy: 'LOCAL_TRANSIENT_REVIEW_ONLY', quoteReady: false,
  }))
  app.post('/routing/google-basic/map-reservation', { bodyLimit: 8_000, preHandler: guard }, async (request, reply) => {
    if (!enabled || !apiKey?.trim() || !options.budget) return reply.status(503).send({ code: 'REVIEW_DISABLED', error: 'Reserva de mapa no habilitada.' })
    const checked = bodySchema.safeParse(request.body)
    if (!checked.success || !routeAllowed(checked.data.request)) return reply.status(400).send({ code: 'INVALID_INPUT', error: 'Sólo se permite el tramo aprobado, sin intermedios.' })
    if (!options.budget.remaining('routes') || !options.budget.reserve('map')) return reply.status(429).send({ code: 'CALL_LIMIT_REACHED', error: 'Presupuesto local agotado; no se cargó Google.' })
    mapOwner = owner(request)
    return { reserved: true }
  })
  app.post('/routing/google-basic/candidate', { bodyLimit: 8_000, preHandler: guard }, async (request, reply) => {
    if (!enabled) return reply.status(503).send({ code: 'REVIEW_DISABLED', error: 'Revisión Google desactivada; sólo habilitable en desarrollo local.' })
    const checked = bodySchema.safeParse(request.body)
    if (!checked.success || !routeAllowed(checked.data.request)) return reply.status(400).send({ code: 'INVALID_INPUT', error: 'Revisa puntos y consentimiento; no se consultó Google.' })
    if (attempted || options.budget?.remaining('routes') === 0) return reply.status(429).send({ code: 'CALL_LIMIT_REACHED', error: 'Tentativa local agotada; no hay reintentos automáticos.' })
    if (options.budget && mapOwner !== owner(request)) return reply.status(403).send({ code: 'MAP_RESERVATION_REQUIRED', error: 'La identidad actual debe reservar primero el mapa aprobado.' })
    try {
      const client = createGoogleBasicRouteClient({ apiKey, fetcher: options.fetcher })
      if (options.budget && !options.budget.reserve('routes')) return reply.status(429).send({ code: 'CALL_LIMIT_REACHED', error: 'Tentativa agotada; no hay reintentos.' })
      // Synchronous reservation also covers concurrent requests and provider failures.
      attempted = true
      return await client.routeCandidate(checked.data.request)
    } catch (error) {
      const code = error instanceof GoogleRouteError ? error.code : 'TRANSPORT_ERROR'
      const status = code === 'MISSING_API_KEY' || code === 'INVALID_API_KEY' ? 503
        : code === 'QUOTA_REJECTED' || code === 'CALL_LIMIT_REACHED' ? 429
        : code === 'INVALID_INPUT' ? 400 : 502
      return reply.status(status).send({ code, error: 'No se obtuvo el candidato. No se adoptaron valores ni se reintentó.' })
    }
  })
}
