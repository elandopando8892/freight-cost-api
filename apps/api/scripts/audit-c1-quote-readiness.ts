import { PrismaClient } from '@prisma/client'
import { readVerifiedPartnerPreviewTarget } from './inspect-partner-preview.js'
import { evaluateC1QuoteReadiness } from '../src/modules/pilot/c1-quote-readiness.js'

const expectedCode = 'XBF-XB-PILOT'

async function main() {
  const direct = readVerifiedPartnerPreviewTarget()
  direct.searchParams.set('connect_timeout', '10')
  const db = new PrismaClient({ datasourceUrl: direct.toString(), log: [] })
  try {
    const bases = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '10000ms'")
      return tx.costBase.findMany({
        where: { code: expectedCode },
        select: {
          code: true,
          scope: true,
          status: true,
          isDefault: true,
          versions: {
            select: {
              version: true,
              status: true,
              isActive: true,
              applicabilityContext: true,
              _count: { select: { params: true } },
            },
            orderBy: { version: 'asc' },
          },
        },
      })
    }, { timeout: 15_000 })
    const readiness = evaluateC1QuoteReadiness(bases.map(base => ({
      code: base.code,
      scope: base.scope,
      status: base.status,
      isDefault: base.isDefault,
      versions: base.versions.map(version => ({
        version: version.version,
        status: version.status,
        isActive: version.isActive,
        applicabilityContext: version.applicabilityContext,
        parameterCount: version._count.params,
      })),
    })))
    const inventory = bases.map(base => ({
      code: base.code,
      scope: base.scope,
      status: base.status,
      isDefault: base.isDefault,
      versions: base.versions.map(version => ({
        version: version.version,
        status: version.status,
        isActive: version.isActive,
        hasApplicabilityProfile: version.applicabilityContext !== null,
        parameterCount: version._count.params,
      })),
    }))
    console.log(JSON.stringify({
      schemaVersion: 'fcm.c1-quote-readiness.v2',
      checkedAt: new Date().toISOString(),
      target: 'Neon staging broad-art-99750179/neondb',
      mode: 'READ_ONLY',
      inventory,
      targetBaseCode: expectedCode,
      ...readiness,
      note: 'Active base, exactly one published active version, 210 parameters and a valid profile are necessary, not sufficient. This does not check trip compatibility, run a quote, prove authorization, or approve parameter economics.',
      writesAttempted: false,
    }))
    if (!readiness.targetCandidateForNewCalculation) process.exitCode = 1
  } finally {
    await db.$disconnect()
  }
}

main().catch(() => {
  console.error('C1 read-only inventory unavailable; verify exact Preview target and connectivity. No quote or database write was attempted.')
  process.exitCode = 2
})
