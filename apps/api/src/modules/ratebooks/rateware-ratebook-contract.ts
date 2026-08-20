import { z } from 'zod'

export const RatewareRateBookContractSchema = z.object({
  contractVersion: z.literal('fcm.rateware-ratebook.v1'),
  mode: z.literal('READ_ONLY'),
  source: z.object({ system: z.literal('Freight Cost Model'), organizationId: z.string(), rateBookId: z.string(), exportedAt: z.string().datetime() }),
  governance: z.object({ status: z.literal('PUBLISHED'), publishedAt: z.string().datetime().nullable(), publicationNote: z.string().nullable() }),
  rateBook: z.object({ code: z.string(), name: z.string(), currency: z.string(), effectiveFrom: z.string().datetime(), effectiveUntil: z.string().datetime().nullable() }),
  lineage: z.object({
    costBase: z.object({ id: z.string(), code: z.string(), name: z.string(), scope: z.string(), status: z.string() }),
    assumptionSet: z.object({ id: z.string(), name: z.string(), version: z.number(), status: z.string() }),
  }),
  entries: z.array(z.object({
    sourceQuoteId: z.string(), sourceQuoteVersion: z.number(), sourceProductionRouteId: z.string().nullable(),
    origin: z.string(), destination: z.string(), operation: z.string(), service: z.string(), equipment: z.string().nullable(), config: z.string().nullable(),
    publishedTariff: z.number(), currency: z.string(), sourceTariffUsd: z.number(), sourceTariffMxn: z.number(), fxRateUsed: z.number(),
  })),
})

type ExportableRateBook = {
  id: string; code: string; name: string; currency: string; effectiveFrom: Date; effectiveUntil: Date | null; status: string; publishedAt: Date | null; publicationNote: string | null
  costBase: { id: string; code: string; name: string; scope: string; status: string }
  set: { id: string; name: string; version: number; status: string }
  entries: Array<{ sourceQuoteId: string; sourceQuoteVersion: number; sourceProductionRouteId: string | null; origin: string; destination: string; operation: string; service: string; equipment: string | null; config: string | null; publishedTariff: number; currency: string; sourceTariffUsd: number; sourceTariffMxn: number; fxRateUsed: number }>
}

/** Pure, versioned mapping. Transport and Rateware-side writes are intentionally excluded. */
export function buildRatewareRateBookContract(book: ExportableRateBook, exportedAt: Date, organizationId: string) {
  if (book.status !== 'PUBLISHED') throw new Error('Only published RateBooks can be packaged for Rateware.')
  return RatewareRateBookContractSchema.parse({
    contractVersion: 'fcm.rateware-ratebook.v1',
    mode: 'READ_ONLY',
    source: { system: 'Freight Cost Model', organizationId, rateBookId: book.id, exportedAt: exportedAt.toISOString() },
    governance: { status: 'PUBLISHED', publishedAt: book.publishedAt?.toISOString() ?? null, publicationNote: book.publicationNote },
    rateBook: { code: book.code, name: book.name, currency: book.currency, effectiveFrom: book.effectiveFrom.toISOString(), effectiveUntil: book.effectiveUntil?.toISOString() ?? null },
    lineage: { costBase: book.costBase, assumptionSet: book.set },
    entries: book.entries.map((entry) => ({ ...entry, sourceProductionRouteId: entry.sourceProductionRouteId ?? null })),
  })
}
