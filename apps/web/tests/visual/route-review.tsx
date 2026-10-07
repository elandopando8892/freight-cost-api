import { createRoot } from 'react-dom/client'
import { RouteReview } from '../../app/(app)/scenarios/benchmark/route-review/route-review'
import '../../app/globals.css'
window.fetch = async () => { throw new Error('QA: external network/auth/API blocked') }
createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-6xl p-4"><p className="mb-6 border-l-2 border-primary pl-3 text-sm">QA LOCAL · WIRE­FRAME IMPLEMENTADO · SIN GOOGLE, SESIÓN NI CONSUMO REAL</p><RouteReview /></main>)
