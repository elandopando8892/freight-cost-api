import Link from 'next/link'
import { RouteReview } from './route-review'
export const metadata = { title: 'Revisión del tramo US' }
export default function Page() {
  // Only a separately restricted browser key may reach this client. No server-key fallback.
  const browserKey = process.env.NODE_ENV === 'development' ? process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY : undefined
  return <main className="mx-auto w-full max-w-6xl px-4 py-8"><Link href="/scenarios/benchmark" className="mb-4 inline-flex min-h-11 items-center text-sm text-primary underline">← Volver al benchmark</Link><RouteReview browserKey={browserKey} /></main>
}
