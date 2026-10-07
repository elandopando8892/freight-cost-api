/** Throw inside the existing interactive transaction; never treat a DB failure as this signal. */
export class W2DiagnosticRollback extends Error {
  constructor() { super('Intentional W2 diagnostic rollback') }
}
export const W2_DIAGNOSTIC_RECEIPT = { event: 'W2_DIAGNOSTIC_ROLLBACK', completedPreparation: true, committed: false } as const
export async function w2RollbackAfterPreparation(prepare: () => Promise<unknown>): Promise<never> {
  await prepare()
  throw new W2DiagnosticRollback()
}
