import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import { env } from './config/env.js'
import { errorHandler } from './middleware/error-handler.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { assumptionsRoutes } from './modules/assumptions/assumptions.routes.js'
import { catalogRoutes } from './modules/catalog/catalog.routes.js'
import { marketRoutes } from './modules/market/market.routes.js'
import { lanesRoutes } from './modules/lanes/lanes.routes.js'
import { engineRoutes } from './modules/engine/engine.routes.js'
import { quotesRoutes } from './modules/quotes/quotes.routes.js'

export function buildApp() {
  const app = Fastify({ logger: env.NODE_ENV === 'development' })

  // Plugins
  app.register(helmet)
  app.register(cors, { origin: true })
  app.register(jwt, { secret: env.JWT_SECRET as string })

  // Global error handler
  app.setErrorHandler(errorHandler)

  // Health check (no auth)
  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

  // Routes
  app.register(authRoutes)
  app.register(assumptionsRoutes)
  app.register(catalogRoutes)
  app.register(marketRoutes)
  app.register(lanesRoutes)
  app.register(engineRoutes)
  app.register(quotesRoutes)

  return app
}
