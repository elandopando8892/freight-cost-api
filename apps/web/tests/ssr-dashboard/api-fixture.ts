// Isolated SSR regression fixture: no credentials, database or external traffic.
import { headers } from 'next/headers'
export class ApiError extends Error {
  constructor(public status: number, public body: unknown, message: string) { super(message) }
}
export async function api<T = unknown>(path: string): Promise<T> {
  const fixtureStatus = (await headers()).get('x-fcm-fixture-status')
  if (fixtureStatus === '401') throw new ApiError(401, null, 'Synthetic unauthorized')
  if (fixtureStatus === '503') throw new ApiError(503, null, 'Synthetic unavailable')
  // Exercise the same native fetch error as the disabled local API, loopback only.
  await fetch(`http://127.0.0.1:3002${path}`, { cache: 'no-store' })
  throw new Error('Fixture expects the local API to remain disabled')
}
