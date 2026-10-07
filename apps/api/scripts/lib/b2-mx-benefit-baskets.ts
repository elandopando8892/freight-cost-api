import { createHash } from 'node:crypto'
import { z } from 'zod'
import { readLocalDocument } from '../assemble-economic-reference-cards.js'
import { readB2BenefitsEvidence } from './b2-recurring-benefits.js'

export const B2_MX_BASKETS_PIN = {
  id: 'b2MxBenefitBaskets', file: 'docs/research/B2_MX_BENEFIT_BASKETS_2026-10-03.json',
  sha256: '95309847c558c3a5c89d987daa6c8772fce448527b921a32e463d9acf033e853',
  hashPolicy: 'UTF8_CRLF_TO_LF_NO_OTHER_NORMALIZATION',
} as const
const offerId = z.enum(['TRAYECTO_CDMX_ALA', 'TRAYECTO_NUEVO_LAREDO_ALA', 'FEMSA_ALTAMIRA_FULL_20260924', 'GEPP_LOCAL_WITHDRAWN', 'TRAYECTO_LOCAL_INDEX_ONLY'])
const concept = z.enum(['VOUCHERS', 'SAVINGS_ACCOUNT', 'EMPLOYER_SAVINGS_FUND', 'PENSION_PLAN', 'LIFE_INSURANCE', 'RECURRING_BONUS', 'WELCOME_BONUS', 'STATUTORY_UPLIFT'])
const offerSchema = z.object({
  id: offerId, employerGroup: z.enum(['TRAYECTO', 'FEMSA', 'GEPP']), url: z.string().url(),
  access: z.enum(['PRIMARY_TEXT_VERIFIED', 'PRIMARY_OFFER_UNAVAILABLE', 'PRIMARY_FETCH_FORBIDDEN']),
  publicationDate: z.string().regex(/^2026-\d\d-\d\d$/).nullable(), role: z.enum(['SINGLE_DRY_VAN', 'FULL', 'LOCAL']),
  location: z.string().min(1), recruitmentState: z.enum(['CLOSED', 'NOT_ESTABLISHED', 'UNAVAILABLE']),
  monthlyVoucherMxn: z.literal(3430).nullable(), welcomeBonusMxn: z.literal(10000).nullable(),
  advertisedUnpriced: z.array(concept), locator: z.string().min(1),
  binationalRosterVerified: z.literal(false), septemberAvailabilityVerified: z.literal(false),
}).strict()
const sourceSchema = z.object({ model: z.literal('FCM_B2_MX_BENEFIT_BASKET_SOURCES_V1'), observedOn: z.literal('2026-10-03'),
  capture: z.literal('PRIMARY_PUBLIC_FACTS_AND_EXPLICIT_ACCESS_FAILURES_NOT_ORIGINAL_ARCHIVE'),
  offers: z.array(offerSchema).length(5), rejectedTransfers: z.array(z.string().min(1)).length(5),
  calibrated: z.literal(false), adoptedValues: z.literal(0), quoteReady: z.literal(false),
}).strict()
export function readMxBenefitBaskets(read = readLocalDocument) {
  const body = read(B2_MX_BASKETS_PIN.file).replace(/\r\n/g, '\n')
  if (createHash('sha256').update(body).digest('hex') !== B2_MX_BASKETS_PIN.sha256) throw new Error('B2_MX_BASKETS_SOURCE_HASH')
  const source = sourceSchema.parse(JSON.parse(body))
  if (new Set(source.offers.map(o => o.id)).size !== 5) throw new Error('B2_MX_BASKETS_IDENTITY')
  return source
}

/** Keep each employer offer whole and separate. A matching amount on two
 * group pages is corroboration, not two independent samples or two expenses.
 * Unavailable/index-only offers remain failure evidence, never price inputs. */
export function reviewMxBenefitBaskets() {
  const source = readMxBenefitBaskets(), prior = readB2BenefitsEvidence()
  const original = source.offers.find(o => o.id === 'TRAYECTO_CDMX_ALA')!
  if (original.url !== prior.mx.sourceUrl || original.monthlyVoucherMxn !== prior.mx.monthlyVoucherMxnPerEmployee)
    throw new Error('B2_MX_BASKETS_PRIOR_COMPONENT_MISMATCH')
  const baskets = source.offers.map(offer => {
    const verified = offer.access === 'PRIMARY_TEXT_VERIFIED'
    const dryVan = offer.role === 'SINGLE_DRY_VAN'
    const voucherComparable = verified && dryVan && offer.monthlyVoucherMxn !== null
    const rows = concept.options.map(id => {
      const welcome = id === 'WELCOME_BONUS', voucher = id === 'VOUCHERS'
      const published = verified && (welcome ? offer.welcomeBonusMxn !== null : voucher ?
        offer.monthlyVoucherMxn !== null || offer.advertisedUnpriced.includes(id) : offer.advertisedUnpriced.includes(id))
      return { conceptId: id, offerId: offer.id, employerGroup: offer.employerGroup,
        evidenceState: !verified ? 'PRIMARY_UNAVAILABLE_NO_PRICE' : !published ? 'NOT_ESTABLISHED_NOT_ZERO' :
          welcome ? 'ONE_OFF_NOT_RECURRING' : voucher && offer.monthlyVoucherMxn !== null ? 'PUBLISHED_EMPLOYEE_MONTH' : 'ADVERTISED_UNPRICED',
        publishedAmountMxn: !verified ? null : welcome ? offer.welcomeBonusMxn : voucher ? offer.monthlyVoucherMxn : null,
        amountBasis: !published ? null : welcome ? 'PER_HIRE_NOT_MONTH' : voucher && offer.monthlyVoucherMxn !== null ? 'EMPLOYEE_MONTH' : null,
        recurringComparableComponentMxnPerEmployeeMonth: voucher && voucherComparable ? offer.monthlyVoucherMxn : null,
        // Only the equivalent voucher component is already compared; no other benefit is priced.
        includedInPriorComponentComparison: voucher && voucherComparable,
        contributesAdditionalChargeMxn: null, selectedForCostEngine: false,
      }
    })
    return { ...offer, rows, comparisonEligibility: voucherComparable ? 'VOUCHER_COMPONENT_ONLY' : 'CONTEXT_ONLY_NO_COST_TRANSFER',
      sameGroupCorroborationNotIndependentSample: offer.employerGroup === original.employerGroup && offer.id !== original.id,
      datedSeptemberPublication: offer.publicationDate?.startsWith('2026-09') ?? false,
      publicationProvesBinationalOrWholePackage: false,
      knownRecurringComponentMxnPerEmployeeMonth: voucherComparable ? offer.monthlyVoucherMxn : null,
      completeRecurringBasketMonthlyMxn: null, septemberCostAccepted: false, quoteReady: false }
  })
  const verified = baskets.filter(b => b.access === 'PRIMARY_TEXT_VERIFIED')
  const comparable = baskets.filter(b => b.comparisonEligibility === 'VOUCHER_COMPONENT_ONLY')
  return { model: 'FCM_B2_MX_BENEFIT_BASKET_REVIEW_V1', sourcePin: B2_MX_BASKETS_PIN,
    sourceObservedOn: source.observedOn, baskets, sourceCount: baskets.length,
    verifiedOfferCount: verified.length, verifiedEmployerGroupCount: new Set(verified.map(b => b.employerGroup)).size,
    voucherComparableOfferCount: comparable.length, voucherComparableEmployerGroupCount: new Set(comparable.map(b => b.employerGroup)).size,
    completeSeptemberBasketCount: 0, crossEmployerBasketMerged: false, voucherChargesAdded: 0,
    rejectedTransfers: source.rejectedTransfers, status: 'PARTIAL_CANASTA_EVIDENCE_NOT_CALIBRATED',
    quoteReady: false, calibrated: false, adoptedValues: 0, externalWrites: false }
}

/** Selecting a single evidence offer does not adopt it. Array selections,
 * unions and caller-supplied percentages/prices are deliberately unsupported. */
export function inspectMxBenefitBasket(raw: unknown) {
  const input = z.object({ offerId }).strict().parse(raw)
  return reviewMxBenefitBaskets().baskets.find(b => b.id === input.offerId)!
}
