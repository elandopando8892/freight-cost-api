import Link from 'next/link'
import { BenchmarkReview } from './benchmark-review'
export const metadata = { title: 'Revisión de benchmark D2D' }
export default function Page() {
  return <main className="mx-auto w-full max-w-6xl px-4 py-8"><Link className="mb-4 inline-flex min-h-11 items-center text-sm text-primary underline" href="/scenarios">← Scenario Lab</Link><BenchmarkReview /></main>
}
