import Link from 'next/link'
import { B2EvidenceInspector } from './b2-evidence'

export const metadata = { title: 'Expediente B2 · pernocta binacional' }
export default function B2EvidencePage() {
  return <main className="mx-auto max-w-6xl px-4 py-8"><Link href="/scenarios/benchmark" className="text-sm text-primary">← Revisión del benchmark</Link><div className="mt-6"><B2EvidenceInspector /></div></main>
}
