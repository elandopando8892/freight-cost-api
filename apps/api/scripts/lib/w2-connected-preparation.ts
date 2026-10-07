/** Caller owns disconnect in its existing finally. No retry or mutation authority here. */
export async function w2WithConnectedPreparation<T>(
  client: { $connect(): Promise<void> },
  operation: () => Promise<T>,
  assertOpen: () => void,
  observe: (phase: 'connect' | 'transaction') => void,
): Promise<T> {
  assertOpen()
  observe('connect')
  await client.$connect()
  // Connecting can consume the rest of a finite window. Never start a write after it.
  assertOpen()
  observe('transaction')
  return operation()
}
