'use client'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ClientApiError, fetcher, sessionExpiredEvent } from '@/lib/fetcher'
import { ReviewResults } from './benchmark-review'
import { parseReview, type ReviewResult } from './review-contract'
import { BenchmarkForm, emptyForm, type FormNode } from './benchmark-form'
import { createBenchmarkDossier, openBenchmarkDossier, downloadBenchmarkDossier, MAX_DOSSIER_BYTES, type DossierInput } from '@/lib/benchmark-dossier'
import { confirmedB2CaseCapture } from '@/lib/benchmark-case-capture'
import { B2EvidenceInspector } from './evidence/b2-evidence'

export function BenchmarkCalculator() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<ReviewResult | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [expired, setExpired] = useState(false)
  const [restored, setRestored] = useState<DossierInput | undefined>()
  const [opening, setOpening] = useState<{ input: DossierInput; savedAt: string } | null>(null)
  const [filePending, setFilePending] = useState(false)
  const [notice, setNotice] = useState('')
  const [showEvidence, setShowEvidence] = useState(false)
  const fileInput = useRef<HTMLInputElement | null>(null)
  const generation = useRef(0)
  useEffect(() => {
    const clear = () => { generation.current++; setText(''); setResult(null); setPending(false); setFilePending(false); setOpening(null); setRestored(undefined); setNotice(''); setError(''); setShowEvidence(false); setExpired(true) }
    window.addEventListener(sessionExpiredEvent, clear)
    window.addEventListener('pagehide', clear)
    return () => { generation.current++; window.removeEventListener(sessionExpiredEvent, clear); window.removeEventListener('pagehide', clear) }
  }, [])
  function change(value: string) {
    generation.current++; setText(value); setResult(null); setError(''); setPending(false); setNotice(''); setOpening(null); setFilePending(false)
  }
  async function startConfirmedCase() {
    if (expired || pending || filePending || opening || text) return
    const current = ++generation.current; setFilePending(true); setError(''); setNotice('')
    try {
      const schema = await fetcher<FormNode>('/api/v1/engine/benchmark-owned-d2d/form', { cache: 'no-store', silent: true })
      if (current !== generation.current) return
      const input = confirmedB2CaseCapture(emptyForm(schema) as DossierInput)
      change(JSON.stringify(input)); setRestored(input); setFormKey(k => k + 1)
      setNotice('Caso México–Fort Smith iniciado: relevo propio y misma caja seca 53′. La fecha exacta, los importes y su evidencia siguen pendientes; no se eligió FX ni financiación.')
    } catch {
      if (current === generation.current) setError('No se pudo iniciar el caso. Verifica tu sesión y el formulario; no se cargaron importes.')
    } finally { if (current === generation.current) setFilePending(false) }
  }
  async function save() {
    if (expired || filePending || pending || opening || !text) return
    const current = ++generation.current; setFilePending(true); setError(''); setNotice('')
    try {
      // Check current permission/schema before writing a portable user-owned file.
      const schema = await fetcher<FormNode>('/api/v1/engine/benchmark-owned-d2d/form', { cache: 'no-store', silent: true })
      const dossier = await createBenchmarkDossier(JSON.parse(text), schema)
      if (current !== generation.current) return
      downloadBenchmarkDossier(dossier)
      setNotice('Archivo generado para guardar en tu equipo. Conserva sólo inputs; no es una cotización ni una base publicada.')
    } catch (e) {
      if (current !== generation.current) return
      setError(e instanceof ClientApiError && e.status === 403 ? 'No tienes permiso para guardar este expediente. Necesitas rol administrador u operador.'
        : 'No se pudo generar el archivo. Verifica tu sesión y los campos; la captura actual se conserva.')
    } finally { if (current === generation.current) setFilePending(false) }
  }
  async function chooseFile(file?: File) {
    if (!file || expired || pending || filePending) return
    const current = ++generation.current; setFilePending(true); setOpening(null); setError(''); setNotice('')
    try {
      if (file.size > MAX_DOSSIER_BYTES) throw new Error('DOSSIER_SIZE')
      const schema = await fetcher<FormNode>('/api/v1/engine/benchmark-owned-d2d/form', { cache: 'no-store', silent: true })
      const selected = await openBenchmarkDossier(await file.text(), schema)
      if (current !== generation.current) return
      setOpening(selected)
    } catch (e) {
      if (current !== generation.current) return
      setError(e instanceof ClientApiError && e.status === 403 ? 'No tienes permiso para abrir este expediente. Necesitas rol administrador u operador.'
        : 'No se abrió el archivo: sesión, formato, versión, integridad o campos incompatibles. La captura actual se conserva; usa un expediente generado con el formulario vigente.')
    } finally { if (current === generation.current) setFilePending(false) }
  }
  function replace() {
    if (!opening || expired) return
    const input = opening.input
    change(JSON.stringify(input)); setRestored(input); setFormKey(k => k + 1)
    setNotice('Expediente reabierto. Revisa los inputs y pulsa Calcular escenarios; ningún total guardado se considera válido.')
  }
  async function calculate() {
    if (expired || pending || filePending || opening) return
    const current = ++generation.current
    setResult(null); setError('')
    let input: unknown
    try {
      if (new TextEncoder().encode(text).length > 256_000) throw new Error()
      input = JSON.parse(text)
    } catch { setError('El expediente excede el tamaño permitido o está incompleto. Revisa los campos antes de calcular.'); return }
    setPending(true)
    try {
      const response = await fetcher<unknown>('/api/v1/engine/benchmark-owned-d2d', { method: 'POST', json: input, silent: true })
      if (current !== generation.current) return
      setResult(parseReview(JSON.stringify(response)))
    } catch (e) {
      if (current !== generation.current) return
      const issues = e instanceof ClientApiError ? (e.body as { issues?: { field: string; message: string }[] } | null)?.issues : null
      setError(e instanceof ClientApiError && e.status === 403 ? 'Se requiere un usuario administrador u operador con organización válida.'
        : e instanceof ClientApiError && e.status === 400 ? `Revisa los campos pendientes: ${(issues ?? []).slice(0, 12).map(i => `${i.field}: ${i.message}`).join('; ') || 'campos, unidades y evidencias'}. No se generaron totales.`
        : 'No se pudo calcular. Verifica tu sesión, los inputs y la conexión; no se adoptó ningún importe.')
    } finally { if (current === generation.current) setPending(false) }
  }
  return <div className="grid min-w-0 gap-4">
    <header><p className="font-mono text-xs uppercase tracking-widest text-primary">Benchmark operativo</p><h1 className="mt-2 text-2xl font-semibold">Escenarios D2D</h1><p className="mt-2 text-sm text-muted-foreground">Remolque propio compartido · Cálculo desde inputs · No calibrado</p></header>
    <p className="rounded-lg border bg-card p-4 text-sm">1. Captura la ruta y sus costos. 2. Calcula CFU y CVU con tu sesión. 3. Guarda los inputs para retomar el trabajo. Las fuentes siguen pendientes de validación económica; el resultado no es una tarifa de compra o venta.</p>
    <div className="grid gap-2"><Button variant="outline" className="min-h-11 w-fit max-w-full whitespace-normal" disabled={expired || pending || filePending || !!opening || !!text} onClick={startConfirmedCase}>Iniciar caso México–Fort Smith</Button>
      <p className="text-xs text-muted-foreground">Carga sólo la ruta y el relevo confirmados. No rellena costos ni fechas. Si ya capturaste otro caso, guárdalo antes de limpiar.</p></div>
    {expired ? <p role="alert">Sesión vencida. Vuelve a iniciar sesión; se limpió el expediente local.</p> : <BenchmarkForm key={formKey} onChange={change} initialValue={restored} />}
    <section aria-label="Consulta de evidencia sin salir del caso" className="grid min-w-0 gap-3 rounded-lg border bg-card p-4">
      <Button variant="outline" className="min-h-11 w-fit max-w-full whitespace-normal" disabled={expired} aria-expanded={showEvidence} aria-controls="b2-inline-evidence" onClick={() => setShowEvidence(value => !value)}>{showEvidence ? 'Ocultar evidencia B2' : 'Consultar evidencia pública B2'}</Button>
      <p className="text-xs text-muted-foreground">Revisa fuentes sin salir ni perder la captura. El expediente B2 corresponde al perfil México–Fort Smith; sus presets son comparativos, no seleccionan la base ni cambian tus inputs. No adopta importes.</p>
      <div id="b2-inline-evidence" hidden={!showEvidence}>{showEvidence && !expired && <B2EvidenceInspector embedded />}</div>
    </section>
    <div className="flex flex-wrap gap-3"><Button className="min-h-11" disabled={expired || pending || filePending || !!opening || !text.trim()} onClick={calculate}>{pending ? 'Calculando…' : 'Calcular escenarios'}</Button>
      <Button variant="outline" className="min-h-11" disabled={expired || pending || filePending || !!opening || !text.trim()} onClick={save}>Guardar expediente</Button>
      <Button variant="outline" className="min-h-11" disabled={expired || pending || filePending || !!opening} onClick={() => fileInput.current?.click()}>Abrir expediente</Button>
      <Button variant="outline" className="min-h-11" disabled={expired} onClick={() => { change(''); setRestored(undefined); setFormKey(k => k + 1) }}>Limpiar</Button></div>
    {!expired && <input ref={fileInput} hidden type="file" accept=".json,application/json" aria-label="Archivo de expediente D2D" onChange={e => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ''; void chooseFile(file) }} />}
    <p className="text-xs text-muted-foreground">El archivo queda en tu equipo, no en la plataforma. Puede contener datos de tu operación: guárdalo en un lugar seguro. Reabrir exige recálculo; no publica bases ni aprueba fuentes.</p>
    {filePending && <p role="status">Verificando acceso y expediente…</p>}
    {opening && <section aria-label="Confirmar apertura" className="grid gap-3 rounded-lg border bg-card p-4"><p>Archivo verificado · guardado {new Date(opening.savedAt).toLocaleString('es-MX')}. Reemplazará la captura actual y quitará sus resultados. La huella verifica integridad, no aprobación de fuentes.</p>
      <div className="flex flex-wrap gap-3"><Button className="min-h-11" onClick={replace}>Reemplazar expediente</Button><Button variant="outline" className="min-h-11" onClick={() => { setOpening(null); setNotice('Apertura cancelada. La captura actual se conserva.') }}>Cancelar apertura</Button></div></section>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
    <div aria-live="polite" aria-busy={pending}>{pending ? <p>Calculando sin guardar datos…</p> : <ReviewResults result={result} calculated />}</div>
  </div>
}
