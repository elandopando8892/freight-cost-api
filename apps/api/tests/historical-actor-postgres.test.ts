import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const url = process.env.FCM_ACTOR_TEST_DATABASE_URL
if (url) {
  const target = new URL(url)
  if (target.protocol !== 'postgresql:' || target.hostname !== '127.0.0.1' || target.pathname !== '/fcm_actor_block')
    throw new Error('ACTOR_FIXTURE_MUST_BE_DISPOSABLE_LOOPBACK')
}
describe.skipIf(!url)('historical actor storage in disposable Postgres', () => {
  let db: PrismaClient
  beforeAll(async () => {
    db = new PrismaClient({ datasourceUrl: url })
    await db.$executeRawUnsafe(`CREATE TYPE "Role" AS ENUM ('ADMIN','OPERATOR','VIEWER')`)
    await db.$executeRawUnsafe(`CREATE TABLE "User" (id text PRIMARY KEY, "orgId" text NOT NULL, "supabaseId" text UNIQUE,
      email text UNIQUE NOT NULL, "passwordHash" text, role "Role" NOT NULL,
      "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now())`)
    await db.$executeRawUnsafe(`CREATE TABLE "ActorReference" (id text PRIMARY KEY, "actorId" text REFERENCES "User"(id), amount numeric NOT NULL)`)
    await db.$executeRawUnsafe(`INSERT INTO "User" (id,"orgId",email,role) VALUES ('historic','original-org','historic@example.invalid','ADMIN')`)
    await db.$executeRawUnsafe(`INSERT INTO "ActorReference" VALUES ('audit-1','historic',75000)`)
  })
  afterAll(async () => { await db?.$disconnect() })
  it('reads a historical actor with no Auth subject through the real Prisma client without inventing an identity', async () => {
    const actor = await db.user.findUnique({ where: { id: 'historic' } })
    expect(actor).toMatchObject({ id: 'historic', orgId: 'original-org', role: 'ADMIN', supabaseId: null })
    const refs = await db.$queryRaw<{ actorId: string; amount: string }[]>`SELECT "actorId", amount::text FROM "ActorReference"`
    expect(refs).toEqual([{ actorId: 'historic', amount: '75000' }])
  })
  it('continues enforcing unique non-null Auth subjects', async () => {
    const data = { orgId: 'original-org', email: 'approved@example.invalid', role: 'VIEWER' as const,
      supabaseId: '00000000-0000-4000-8000-000000000001' }
    await db.user.create({ data: { ...data, id: 'approved' } })
    await expect(db.user.create({ data: { ...data, id: 'duplicate', email: 'duplicate@example.invalid' } })).rejects.toThrow()
    expect(await db.user.count()).toBe(2)
  })
})
