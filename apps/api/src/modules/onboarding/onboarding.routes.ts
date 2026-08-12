import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { CostBaseScope } from '@prisma/client'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import { prisma } from '../../config/prisma.js'
import type { JwtPayload } from '../auth/auth.schema.js'

const CarrierProfileSchema = z.object({
  legalName: z.string().trim().min(2).max(180).nullable().optional(),
  operatingName: z.string().trim().max(180).nullable().optional(),
  primaryContactName: z.string().trim().min(2).max(120).nullable().optional(),
  primaryContactEmail: z.string().trim().email().max(180).nullable().optional(),
  primaryContactPhone: z.string().trim().max(40).nullable().optional(),
  defaultCurrency: z.enum(['USD', 'MXN']).default('USD'),
  operatingScopes: z.array(z.nativeEnum(CostBaseScope)).max(5).default([]),
})

async function carrierOnboarding(orgId: string) {
  const [profile, pricingBaseCount, productionRouteCount, confirmedQuoteCount, publishedRateBookCount] = await Promise.all([
    prisma.carrierProfile.findUnique({ where: { orgId } }),
    prisma.costBase.count({ where: { orgId, status: 'ACTIVE', versions: { some: { isActive: true, status: 'PUBLISHED' } } } }),
    prisma.productionRoute.count({ where: { orgId, status: 'PRODUCTION' } }),
    prisma.quote.count({ where: { orgId, status: 'CONFIRMED' } }),
    prisma.rateBook.count({ where: { orgId, status: 'PUBLISHED' } }),
  ])
  const profileComplete = Boolean(profile?.legalName && profile.primaryContactName && profile.primaryContactEmail)
  const steps = [
    { key: 'CARRIER_PROFILE', label: 'Identidad operativa', description: 'Registra razón social, contacto y alcances donde operas.', complete: profileComplete, href: '/onboarding' },
    { key: 'PRICING_BASE', label: 'Base tarifaria activa', description: 'Activa una base con su versión de supuestos publicada.', complete: pricingBaseCount > 0, href: '/cost-bases' },
    { key: 'PRODUCTION_ROUTE', label: 'Primera ruta de producción', description: 'Confirma una ruta compatible con tu base y supuestos.', complete: productionRouteCount > 0, href: '/production' },
    { key: 'CONFIRMED_QUOTE', label: 'Primera cotización confirmada', description: 'Conserva una cotización con evidencia reproducible.', complete: confirmedQuoteCount > 0, href: '/quote' },
    { key: 'PUBLISHED_RATEBOOK', label: 'Primer RateBook publicado', description: 'Publica un tarifario versionado cuando la revisión comercial esté lista.', complete: publishedRateBookCount > 0, href: '/ratebooks' },
  ]
  const completed = steps.filter((step) => step.complete).length
  return { profile, steps, completed, total: steps.length, ready: completed === steps.length }
}

export async function onboardingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.get('/onboarding/carrier', async (request) => carrierOnboarding((request.user as JwtPayload).orgId))
  app.put('/onboarding/carrier/profile', { preHandler: requireRole('ADMIN', 'OPERATOR') }, async (request) => {
    const { orgId } = request.user as JwtPayload
    const input = CarrierProfileSchema.parse(request.body)
    await prisma.carrierProfile.upsert({ where: { orgId }, create: { orgId, ...input }, update: input })
    return carrierOnboarding(orgId)
  })
}
