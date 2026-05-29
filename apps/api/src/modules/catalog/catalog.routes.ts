import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { prisma } from '../../config/prisma.js'

export async function catalogRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/catalog/equipment', async () => {
    return prisma.equipmentConfig.findMany({ orderBy: [{ truckType: 'asc' }, { trailerType: 'asc' }] })
  })

  app.get('/catalog/cities/mx', async () => {
    return prisma.cityMX.findMany({ orderBy: { production: 'asc' } })
  })

  // Flat list of distinct location strings (MX "City, ST" homologations + US/CA
  // metro cities) for the quote-form autocomplete. Small + cacheable.
  app.get('/catalog/locations', async () => {
    const [cities, metros] = await Promise.all([
      prisma.cityMX.findMany({ select: { homologation: true }, orderBy: { homologation: 'asc' } }),
      prisma.zipMarket.findMany({ select: { metroCity: true }, distinct: ['metroCity'], orderBy: { metroCity: 'asc' } }),
    ])
    const set = new Set<string>()
    for (const c of cities) if (c.homologation) set.add(c.homologation.trim())
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
