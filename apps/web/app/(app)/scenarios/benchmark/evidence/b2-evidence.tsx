'use client'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ClientApiError, fetcher, sessionExpiredEvent } from '@/lib/fetcher'
import { b2EvidencePath, parseB2Evidence, type B2Evidence, type EvidenceContext } from '@/lib/b2-evidence'
import styles from './evidence.module.css'

export function B2EvidenceInspector({ embedded = false }: { embedded?: boolean } = {}) {
  const [context, setContext] = useState<EvidenceContext>({ cycleId: 'NETWORK_EXPECTED_EMPTY_PROXY', fundingMode: 'CASH' })
  const [data, setData] = useState<B2Evidence | null>(null), [pending, setPending] = useState(false)
  const [error, setError] = useState(''), [expired, setExpired] = useState(false)
  const [search, setSearch] = useState(''), [country, setCountry] = useState('ALL'), [selected, setSelected] = useState('MX_TRAVEL_EXPENSES')
  const generation = useRef(0), controller = useRef<AbortController | null>(null)
  const identity = useRef<string | null>(null), fingerprint = useRef<string | undefined>(undefined)
  useEffect(() => {
    function wipe() {
      generation.current++; controller.current?.abort(); identity.current = null; fingerprint.current = undefined
      setData(null); setSearch(''); setCountry('ALL'); setSelected(''); setPending(false); setExpired(true)
    }
    window.addEventListener(sessionExpiredEvent, wipe); window.addEventListener('pagehide', wipe)
    return () => { generation.current++; controller.current?.abort(); window.removeEventListener(sessionExpiredEvent, wipe); window.removeEventListener('pagehide', wipe) }
  }, [])
  async function load() {
    if (pending || expired) return
    const current = ++generation.current; controller.current?.abort(); controller.current = new AbortController()
    setPending(true); setError(''); setData(null)
    try {
      const parsed = parseB2Evidence(await fetcher(b2EvidencePath(context, fingerprint.current), { cache: 'no-store', silent: true, signal: controller.current.signal }), context)
      if (current !== generation.current) return
      const scope = JSON.stringify(parsed.scope)
      if (identity.current && identity.current !== scope) {
        identity.current = null; fingerprint.current = undefined; setSearch(''); setCountry('ALL'); setSelected(''); setExpired(true)
        setError('Cambió la cuenta u organización. Recarga para volver a comprobar la sesión.'); return
      }
      identity.current = scope; fingerprint.current = parsed.sha256; setData(parsed); setSelected(parsed.case.rows[0].id)
    } catch (e) {
      if (current !== generation.current) return
      setError(e instanceof ClientApiError && e.status === 401 ? 'Sesión vencida. Inicia sesión de nuevo.'
        : e instanceof ClientApiError && e.status === 403 ? 'Necesitas rol administrador u operador y organización válida.'
        : e instanceof ClientApiError && e.status === 409 ? 'El expediente cambió. Recarga para revisar su nueva huella.'
        : 'No se pudo verificar el expediente. No se mostraron valores ni se guardó información.')
    } finally { if (current === generation.current) setPending(false) }
  }
  function change(next: EvidenceContext) {
    generation.current++; controller.current?.abort(); setPending(false); setData(null); setSelected(''); setError(''); setContext(next)
  }
  const rows = data?.case.rows.filter(r => (country === 'ALL' || r.country === country) && `${r.title} ${r.id}`.toLowerCase().includes(search.toLowerCase())) ?? []
  const detail = rows.find(r => r.id === selected)
  return <section className={styles.root}>
    <header><p className={styles.eyebrow}>Gobierno de costos · expediente B2 · sólo lectura</p>{embedded ? <h2>Revisión de pernocta binacional</h2> : <h1>Revisión de pernocta binacional</h1>}
      <p>México, DF → Fort Smith, AR 72916 · Puente III · relevo propio MX/US, misma caja seca 53′.</p>
      <p>Referencia: 28–30 septiembre 2026 · fecha exacta del viaje pendiente.</p></header>
    <div className={styles.controls}>
      <label>Ciclo<select aria-label="Ciclo" value={context.cycleId} disabled={expired} onChange={e => change({ ...context, cycleId: e.target.value as EvidenceContext['cycleId'] })}>
        <option value="NETWORK_EXPECTED_EMPTY_PROXY">Red · vacío esperado de referencia</option><option value="DEDICATED_EMPTY_SAME_BOX_RETURN">Dedicado · retorno de la misma caja</option></select></label>
      <label>Capital comparativo<select aria-label="Capital comparativo" value={context.fundingMode} disabled={expired} onChange={e => change({ ...context, fundingMode: e.target.value as EvidenceContext['fundingMode'] })}>
        <option value="CASH">Contado</option><option value="FINANCED">Financiado</option></select></label>
      <Button onClick={load} disabled={pending || expired}>{pending ? 'Verificando…' : 'Consultar expediente'}</Button>
    </div>
    <p className={styles.notice}>Presets existentes para comparación; no seleccionan un crédito ni adoptan supuestos. No se guarda una nota: el registro actual exige una cotización y cambios de parámetros.</p>
    {expired && <p role="alert">Sesión o contexto invalidado. Recarga e inicia sesión de nuevo; se limpiaron los datos.</p>}
    {error && <p role="alert">{error}</p>}
    <p role="status" aria-busy={pending}>{pending ? 'Consultando por el BFF, sin escritura…' : !data ? 'Sin expediente cargado. La consulta requiere permisos; no se usa un resultado de demostración como fallback.' : `${data.sourcePinCount} fuentes locales verificadas · 210 parámetros canónicos · sin calibración ni adopción.`}</p>
    {data && <>
      <p className={styles.notice}>La proyección histórica es de octubre 2026 y no está aceptada para septiembre. CFU, CVU, costo productivo, compra y venta: pendientes. El vínculo canónico de estos conceptos aún no está verificado.</p>
      <div className={styles.grid}>
        <aside className={styles.panel} aria-label="Conceptos pendientes">
          <label>Buscar concepto<Input aria-label="Buscar concepto" value={search} onChange={e => setSearch(e.target.value)} /></label>
          <label>País<select aria-label="País" value={country} onChange={e => setCountry(e.target.value)}><option value="ALL">Ambos</option><option value="MX">México</option><option value="US">Estados Unidos</option></select></label>
          {rows.map(r => <button key={r.id} className={styles.row} aria-pressed={r.id === selected} onClick={() => setSelected(r.id)}>{r.title}<small>Pendiente de evidencia y precio aplicable</small></button>)}
          {!rows.length && <p>No hay conceptos con estos filtros.</p>}
        </aside>
        <article className={styles.panel} aria-label="Detalle del concepto">
          {detail ? <><h2>{detail.title}</h2><p className={styles.notice}>Concepto del motor: {detail.id} · clave canónica: sin vínculo verificado.</p>
            <h3>Qué conserva el modelo</h3><p>{detail.included}</p><h3>Qué falta</h3><ul>{detail.missing.map(m => <li key={m}>{m}</li>)}</ul>
            <h3>Fuentes del expediente público</h3>{detail.sources.map(s => <section key={s.id} className={styles.source}><h4>{s.title}</h4>
              <p>{s.comparisonValue === null ? 'Precio aplicable: pendiente.' : `Comparador publicado: ${s.comparisonValue} ${s.currency} / ${s.unit}. NO adoptado.`}</p>
              <p>{s.limitation}</p><small>Observado {s.observedOn}; precio histórico e impuestos no acreditados.</small>
              <a href={s.url} target="_blank" rel="noopener noreferrer">Ver fuente pública ↗</a></section>)}
            <h3>Impacto en el motor</h3><p>{detail.effect}</p><p>Delta CVU: pendiente · total del caso: pendiente.</p></> : <p>Selecciona un concepto visible para revisar sus fuentes.</p>}
        </article>
      </div>
      <details className={styles.panel}><summary>Faltantes del cierre y trazabilidad</summary><p>{data.case.fixedRemainders.length} remanentes fijos y {data.case.variableRemainders.length} variables; no son toda la calibración de los 210 parámetros.</p>
        <ul>{data.case.issues.map(i => <li key={i.code}>{i.code}: {i.rationale}</li>)}</ul><p>Huella: <code>{data.sha256}</code></p>
        <p>Captura pública local pinneada; no consulta viva ni archivo original de cada fuente. B2 permanece abierto.</p></details>
    </>}
  </section>
}
