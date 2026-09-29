import { PrismaClient } from '@prisma/client'
import { readVerifiedPartnerPreviewTarget } from './inspect-partner-preview.js'
import { evaluateC1QuoteReadiness } from '../src/modules/pilot/c1-quote-readiness.js'
import { C1PurposeSchema, evaluateC1OperatingModel } from '../src/modules/pilot/c1-operating-model.js'

const expectedCode = 'XBF-XB-PILOT'

async function main() {
  const purposeArguments = process.argv.slice(2)
  if (purposeArguments.length !== 1 || !purposeArguments[0].startsWith('--purpose=')) {
    throw new Error('An explicit operating purpose is required')
  }
  const purpose = C1PurposeSchema.parse(purposeArguments[0].slice('--purpose='.length))
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
    const candidates = bases.map(base => ({
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
    }))
    const readiness = evaluateC1QuoteReadiness(candidates)
    const operatingModel = evaluateC1OperatingModel(purpose, candidates)
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
      schemaVersion: 'fcm.c1-quote-readiness.v3',
      checkedAt: new Date().toISOString(),
      target: 'Neon staging broad-art-99750179/neondb',
      mode: 'READ_ONLY',
      inventory,
      targetBaseCode: expectedCode,
      ...readiness,
      targetCandidateForNewCalculation: operatingModel.structuralCandidateForRequestedPurpose,
      blockers: operatingModel.blockers,
      operatingModel,
      note: 'Fleet inventory completeness does not establish fitness for the requested operating purpose. This does not inspect partner tariff versions, check trip compatibility, run a quote, prove authorization, or approve parameter economics.',
      writesAttempted: false,
    }))
    if (!operatingModel.structuralCandidateForRequestedPurpose) process.exitCode = 1
  } finally {
    await db.$disconnect()
  }
}

main().catch(() => {
  console.error('C1 inventory unavailable; supply --purpose=FLEET_COST, THIRD_PARTY_PURCHASE or THIRD_PARTY_BENCHMARK and verify exact Preview target/connectivity. No write was attempted.')
  process.exitCode = 2
})
