/**
 * Integration tests using Fastify inject() — no real DB needed.
 * Prisma client is mocked so all HTTP logic, auth, routing, and
 * validation are exercised without a live PostgreSQL connection.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'

// ── Mock Prisma BEFORE importing app ─────────────────────────────────────────
vi.mock('../src/config/prisma.js', () => {
  const org = { id: 'org-1', name: 'Test Carrier', country: 'MX', createdAt: new Date(), updatedAt: new Date() }
  const user = { id: 'user-1', orgId: 'org-1', email: 'test@carrier.com', passwordHash: '', role: 'ADMIN', createdAt: new Date(), updatedAt: new Date() }
  const assumptionSet = {
    id: 'set-1', orgId: 'org-1', name: 'Base Q1', version: 1, isActive: true, notes: null,
    createdAt: new Date(), updatedAt: new Date(),
    params: [],
  }
  const lane = {
    id: 'lane-1', orgId: 'org-1', laneKey: 'abc123',
    origin: 'Monterrey, NL', destination: 'Laredo, TX',
    equipmentId: 'eq-1', operationType: 'D2D Export', serviceType: 'One Way',
    config: 'Single', isD2D: true, isDrayage: false, isRoundtrip: false, isBackhaul: false,
    baseKm: 250, returnKm: null, loadedMiles: null, transitDays: null,
    createdAt: new Date(), updatedAt: new Date(),
  }
  const equipment = {
    id: 'eq-1', truckType: 'Truck Trailer', trailerType: 'Dry Van', config: 'Single',
    operationType: 'D2D Export', serviceType: 'One Way', driverType: 'Interstate',
    dispatchService: null,
    fuelEfficiencyFactor: 1.0, fixedCostFactor: 1.0, maintTiresFactor: 1.0, driverFactor: 1.0,
  }

  return {
    prisma: {
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: user.id, email: user.email, role: user.role, orgId: user.orgId }),
      },
      organization: {
        create: vi.fn().mockResolvedValue(org),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      assumptionSet: {
        findMany: vi.fn().mockResolvedValue([assumptionSet]),
        create: vi.fn().mockResolvedValue(assumptionSet),
        findFirstOrThrow: vi.fn().mockResolvedValue({ ...assumptionSet, params: [] }),
        findFirst: vi.fn().mockResolvedValue({ ...assumptionSet, params: [] }),
        update: vi.fn().mockResolvedValue(assumptionSet),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        delete: vi.fn().mockResolvedValue(assumptionSet),
      },
      assumptionParam: {
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        upsert: vi.fn().mockResolvedValue({ id: 'p-1', section: 'FUEL', field: 'Diesel MX', value: 30 }),
      },
      equipmentConfig: {
        findMany: vi.fn().mockResolvedValue([equipment]),
        findFirstOrThrow: vi.fn().mockResolvedValue(equipment),
        findUnique: vi.fn().mockResolvedValue(equipment),
        findUniqueOrThrow: vi.fn().mockResolvedValue(equipment),
        upsert: vi.fn().mockResolvedValue(equipment),
      },
      cityMX: { findMany: vi.fn().mockResolvedValue([]) },
      zipMarket: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
      lane: {
        findMany: vi.fn().mockResolvedValue([lane]),
        findFirstOrThrow: vi.fn().mockResolvedValue(lane),
        upsert: vi.fn().mockResolvedValue(lane),
        update: vi.fn().mockResolvedValue(lane),
        delete: vi.fn().mockResolvedValue(lane),
      },
      marketData: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: 'md-1', orgId: 'org-1', type: 'DIESEL_MX', value: 28, unit: 'MXN/L', date: new Date(), createdAt: new Date() }),
      },
      quote: {
        create: vi.fn().mockResolvedValue({ id: 'q-1', orgId: 'org-1' }),
        findMany: vi.fn().mockResolvedValue([]),
        findFirstOrThrow: vi.fn().mockResolvedValue({ id: 'q-1', laneId: 'lane-1', assumptionSetId: 'set-1' }),
        delete: vi.fn().mockResolvedValue({ id: 'q-1' }),
      },
      $transaction: vi.fn().mockImplementation(async (ops: unknown) => {
        if (Array.isArray(ops)) return Promise.all(ops)
        return ops
      }),
    },
  }
})

// ── Mock bcryptjs ────────────────────────────────────────────────────────────
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$hashed'),
    compare: vi.fn().mockResolvedValue(true),
  },
}))

// ── Mock envalid to avoid needing a real .env ────────────────────────────────
vi.mock('../src/config/env.js', () => ({
  env: {
    DATABASE_URL: 'postgresql://mock',
    JWT_SECRET: 'test-secret-for-validation-32chars',
    JWT_EXPIRES_IN: '7d',
    PORT: 3001,
    NODE_ENV: 'test',
    EIA_API_KEY: '',
    CRON_SECRET: 'test-cron-secret',
  },
}))

// ── Now import the app ───────────────────────────────────────────────────────
const { buildApp } = await import('../src/app.js')

let app: FastifyInstance
let token: string

beforeAll(async () => {
  app = buildApp()
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────
describe('Health', () => {
  it('GET /health → 200 ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.status).toBe('ok')
    expect(body.ts).toBeDefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────
describe('Auth', () => {
  it('POST /auth/register → 201 with token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { orgName: 'Test Carrier', email: 'test@carrier.com', password: 'securepass123' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.token).toBeDefined()
    expect(typeof body.token).toBe('string')
    token = body.token
  })

  it('POST /auth/register with bad email → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { orgName: 'X', email: 'not-an-email', password: 'pass' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /auth/login → 200 with token', async () => {
    const { prisma } = await import('../src/config/prisma.js')
    // Mock findUnique to return a user with a hashed password
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 'user-1', orgId: 'org-1', email: 'test@carrier.com',
      passwordHash: '$2b$12$hashed', role: 'ADMIN',
      createdAt: new Date(), updatedAt: new Date(),
    })
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'test@carrier.com', password: 'securepass123' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.token).toBeDefined()
    token = body.token
  })

  it('GET /auth/me without token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/me' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /auth/me with token → 200', async () => {
    const { prisma } = await import('../src/config/prisma.js')
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 'user-1', orgId: 'org-1', email: 'test@carrier.com',
      passwordHash: '$2b$12$hashed', role: 'ADMIN',
      createdAt: new Date(), updatedAt: new Date(),
    })
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ASSUMPTIONS
// ─────────────────────────────────────────────────────────────────────────────
describe('Assumptions', () => {
  it('GET /assumptions/sets → 200 list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/assumptions/sets',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
  })

  it('POST /assumptions/sets → 201 created', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/assumptions/sets',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Q2 2026 Base', notes: 'Test set' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.name).toBe('Base Q1')  // mocked value
  })

  it('POST /assumptions/sets without name → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/assumptions/sets',
      headers: { authorization: `Bearer ${token}` },
      payload: { notes: 'Missing name' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('GET /assumptions/sets/set-1/params → 200 grouped params', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/assumptions/sets/set-1/params',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
  })

  it('PATCH /assumptions/sets/set-1/params → 200 updates values', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/assumptions/sets/set-1/params',
      headers: { authorization: `Bearer ${token}` },
      payload: [
        { section: 'FUEL', field: 'Diesel MX', value: 30 },
        { section: 'FINANCE', field: 'Tipo de Cambio', value: 18.0 },
      ],
    })
    expect(res.statusCode).toBe(200)
  })

  it('PATCH /assumptions/sets/set-1/params with invalid section → 400', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/assumptions/sets/set-1/params',
      headers: { authorization: `Bearer ${token}` },
      payload: [{ section: 'INVALID_SECTION', field: 'Diesel MX', value: 30 }],
    })
    expect(res.statusCode).toBe(400)
  })

  it('PATCH cost-card section (COST_CAPITAL) → 200 with warnings array', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/assumptions/sets/set-1/params',
      headers: { authorization: `Bearer ${token}` },
      payload: [{ section: 'COST_CAPITAL', field: 'PU Tracto', value: 240000 }],
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('params')
    expect(Array.isArray(body.warnings)).toBe(true)
  })

  it('PATCH out-of-range value → 200 but flags a warning', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/assumptions/sets/set-1/params',
      headers: { authorization: `Bearer ${token}` },
      payload: [{ section: 'FINANCE', field: 'Tipo de Cambio', value: 999 }], // recommended high is 20
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.warnings.some((w: { field: string }) => w.field === 'Tipo de Cambio')).toBe(true)
  })

  it('POST /assumptions/sets/set-1/params/reset → 200', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/assumptions/sets/set-1/params/reset',
      headers: { authorization: `Bearer ${token}` },
      payload: { fields: [{ section: 'FUEL', field: 'Diesel MX' }] },
    })
    expect(res.statusCode).toBe(200)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG
// ─────────────────────────────────────────────────────────────────────────────
describe('Catalog', () => {
  it('GET /catalog/equipment → 200 list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/catalog/equipment',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
  })

  it('GET /catalog/cities/mx → 200 list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/catalog/cities/mx',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MARKET
// ─────────────────────────────────────────────────────────────────────────────
describe('Market', () => {
  it('GET /market → 200 with null entries (no data yet)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/market',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
  })

  it('POST /market → 201 creates entry', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/market',
      headers: { authorization: `Bearer ${token}` },
      payload: { type: 'DIESEL_MX', value: 28.5, unit: 'MXN/L', date: new Date().toISOString() },
    })
    expect(res.statusCode).toBe(201)
  })

  it('POST /market with invalid type → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/market',
      headers: { authorization: `Bearer ${token}` },
      payload: { type: 'DIESEL_INVALID', value: 28, unit: 'MXN/L', date: new Date().toISOString() },
    })
    expect(res.statusCode).toBe(400)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// LANES
// ─────────────────────────────────────────────────────────────────────────────
describe('Lanes', () => {
  it('GET /lanes → 200 list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/lanes',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
  })

  it('POST /lanes → 201 upsert lane', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/lanes',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        origin: 'Monterrey, NL',
        destination: 'Laredo, TX',
        operationType: 'D2D Export',
        serviceType: 'One Way',
        config: 'Single',
        isD2D: true,
        baseKm: 250,
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.origin).toBe('Monterrey, NL')
  })

  it('POST /lanes missing required fields → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/lanes',
      headers: { authorization: `Bearer ${token}` },
      payload: { origin: 'Monterrey' },  // missing destination, operationType, serviceType
    })
    expect(res.statusCode).toBe(400)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE CALCULATE (HTTP layer)
// ─────────────────────────────────────────────────────────────────────────────
describe('Engine /calculate', () => {
  const crossborderPayload = {
    operation: 'D2D Export',
    service: 'One Way',
    equipment: { truckType: 'Truck Trailer', trailer: 'Flatbed', config: 'Single', driver: 'B1' },
    mex: { baseKm: 225, routeExpensesMxn: 0, baseHours: 0, route: 'Straight & Danger' },
    usa: {
      loadedMiles: 435, dieselUsdGal: 5.152, fscUsdMile: 0.8,
      originCondition: 'Very Tight', destCondition: 'Very Tight',
    },
  }

  it('POST /engine/calculate → 200, Monterrey→Dallas Flatbed = $2,600', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/engine/calculate',
      headers: { authorization: `Bearer ${token}` },
      payload: crossborderPayload,
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.mexLeg.requiredTariffUsd).toBe(1200)
    expect(body.usaLeg.flatUsd).toBeCloseTo(1391, 0)
    expect(body.freightBaselineUsd).toBe(2600)
  })

  it('POST /engine/calculate MX-only lane runs only MEX leg', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/engine/calculate',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        operation: 'Intra-Mex',
        equipment: { trailer: 'Dry Van' },
        mex: { baseKm: 300, baseHours: 0 },
      },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.mexLeg).not.toBeNull()
    expect(body.usaLeg).toBeNull()
  })

  it('POST /engine/calculate without token → 401', async () => {
    const res = await app.inject({ method: 'POST', url: '/engine/calculate', payload: crossborderPayload })
    expect(res.statusCode).toBe(401)
  })

  it('POST /engine/calculate missing operation → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/engine/calculate',
      headers: { authorization: `Bearer ${token}` },
      payload: { mex: { baseKm: 225 } },
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /engine/calculate with no legs → 422', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/engine/calculate',
      headers: { authorization: `Bearer ${token}` },
      payload: { operation: 'D2D Export' },
    })
    expect(res.statusCode).toBe(422)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CRON (fuel auto-refresh) — auth guard only; success path hits EIA network
// ─────────────────────────────────────────────────────────────────────────────
describe('Cron /cron/fuel', () => {
  it('GET /cron/fuel without secret → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/cron/fuel' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /cron/fuel with wrong secret → 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/cron/fuel',
      headers: { authorization: 'Bearer wrong-secret' },
    })
    expect(res.statusCode).toBe(401)
  })
})
