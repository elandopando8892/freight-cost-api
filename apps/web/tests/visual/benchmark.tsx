import { createRoot } from 'react-dom/client'
import { BenchmarkReview } from '../../app/(app)/scenarios/benchmark/benchmark-review'
import sample from './benchmark-sample.json'
import '../../app/globals.css'

// Synthetic calculator output generated offline; no server modules in the browser.
window.fetch = async () => { throw new Error('QA: network blocked') }
createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-6xl p-4">
  <p className="mb-4 rounded border p-3 font-bold">QA LOCAL · DATOS SINTÉTICOS · SIN AUTH NI BD</p>
  <details className="mb-4"><summary className="cursor-pointer p-2">JSON sintético generado por el motor real</summary><textarea aria-label="Salida sintética para copiar" readOnly value={JSON.stringify(sample)} className="h-24 w-full border p-2" /></details>
  <BenchmarkReview />
</main>)
