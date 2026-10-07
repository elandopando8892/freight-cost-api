/** The version read includes its parameters, base and audited history. The real
 * Preview load exceeded Prisma's implicit 5 s budget (P2028/EXPIRED, 7991 ms).
 * Bound the wizard only; retain the 2 s acquisition limit and never retry writes. */
export const WIZARD_TRANSACTION_OPTIONS = Object.freeze({ maxWait: 2_000, timeout: 15_000 })
