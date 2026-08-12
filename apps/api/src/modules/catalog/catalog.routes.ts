import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { prisma } from '../../config/prisma.js'
import { PARAMETER_DEFINITIONS, ParameterKind, summarizeParameterCatalog } from '../../data/parameter-catalog.js'
import { getCostBaseCoverage } from './coverage.service.js'

export async function catalogRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/catalog/equipment', async () => {
    return prisma.equipmentConfig.findMany({ orderBy: [{ truckType: 'asc' }, { trailerType: 'asc' }] })
  })

  app.get('/catalog/parameters/summary', async () => summarizeParameterCatalog())

  app.get('/catalog/coverage', async (request) => {
    const { orgId } = request.user as { orgId: string }
    return getCostBaseCoverage(orgId)
  })

  app.get('/catalog/parameters', async (request) => {
    const query = request.query as { section?: string; kind?: string; q?: string }
    const kind = query.kind?.toUpperCase() as ParameterKind | undefined
    const section = query.section?.trim().toUpperCase()
    const search = query.q?.trim().toLocaleLowerCase()
    const data = PARAMETER_DEFINITIONS.filter((definition) => {
      if (section && definition.section !== section) return false
      if (kind && definition.kind !== kind) return false
      return !search || [definition.key, definition.label, definition.section, definition.unit, definition.costBehavior]
        .some((value) => value.toLocaleLowerCase().includes(search))
    })
    return { data, total: data.length, catalogTotal: PARAMETER_DEFINITIONS.length }
  })

  app.get('/catalog/cities/mx', async () => {
    return prisma.cityMX.findMany({ orderBy: { production: 'asc' } })
  })

  // Flat list of distinct location strings for the quote-form autocomplete.
  // MX cities use the FULL production name ("Manzanillo, Colima") — that's the
  // exact form resolveMexLeg looks up in mexLaneExpense; the abbreviated
  // homologation ("Manzanillo, CL") would NOT resolve. US/CA use metro cities.
  app.get('/catalog/locations', async () => {
    const [cities, metros] = await Promise.all([
      prisma.cityMX.findMany({ select: { production: true }, orderBy: { production: 'asc' } }),
      prisma.zipMarket.findMany({ select: { metroCity: true }, distinct: ['metroCity'], orderBy: { metroCity: 'asc' } }),
    ])
    const set = new Set<string>()
    for (const c of cities) if (c.production) set.add(c.production.trim())
    for (const m of metros) if (m.metroCity) set.add(m.metroCity.trim())
    return { locations: [...set].sort((a, b) => a.localeCompare(b)) }
  })

  app.get('/catalog/zip-markets', async (request) => {
    const query = request.query as { page?: string; limit?: string; market?: string }
    const page = Math.max(1, parseInt(query.page ?? '1'))
    const limit = Math.min(500, parseInt(query.limit ?? '100'))
    const skip = (page - 1) * limit

    const where = query.market ? { market: { contains: query.market, mode: 'insensitive' as const } } : {}

    const [data, total] = await Promise.all([
      prisma.zipMarket.findMany({ where, skip, take: limit, orderBy: { zipCode: 'asc' } }),
      prisma.zipMarket.count({ where }),
    ])

    return { data, total, page, limit }
  })
}
