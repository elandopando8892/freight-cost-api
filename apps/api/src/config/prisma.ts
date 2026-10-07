import { PrismaClient } from '@prisma/client'
import { resolveDatabaseUrl } from './database-url.js'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: resolveDatabaseUrl({DATABASE_URL:process.env.DATABASE_URL,
      STAGING_DATABASE_URL:process.env.STAGING_DATABASE_URL,VERCEL_ENV:process.env.VERCEL_ENV}),
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
