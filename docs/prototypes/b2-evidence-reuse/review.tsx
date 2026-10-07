import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import logo from '@/public/brand/marksman-logo.png';
import { allowed, scopeKey, type Evidence, type Filters, type ListHook, type Scope } from './contracts';

const defaults: Scope = {
  account: 'Cuenta sintética A', role: 'ADMIN', cycle: 'NETWORK_EXPECTED_EMPTY_PROXY', funding: 'CASH', state: 'normal',
};
const noFilters: Filters = { search: '', country: 'Todos', status: 'Todos' };

function Note({ scope, row }: { scope: Scope; row: Evidence }) {
  const key = `fcm-demo-note:${scopeKey(scope)}:${row.id}`;
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<{ note: string }>({
    defaultValues: { note: sessionStorage.getItem(key) ?? '' },
  });
  return <form onSubmit={handleSubmit(({ note }) => {
    sessionStorage.setItem(key, note.trim()); setSaved(true);
  })}>
    <label htmlFor="note">Nota de revisión · sólo demo local</label>
    <textarea id="note" {...register('note', {
      validate: (v) => v.trim().length >= 3 || 'Escribe al menos 3 caracteres.',
      maxLength: { value: 240, message: 'Máximo 240 caracteres.' },
      onChange: () => setSaved(false),
    })} aria-invalid={!!errors.note} aria-describedby="note-help note-error" />
    <p id="note-help" className="muted">Se guarda en esta pestaña; no aprueba evidencia ni cambia el motor.</p>
    <p id="note-error" role="alert">{errors.note?.message}</p>
    <Button type="submit">Guardar nota sintética</Button>
    {saved && <p role="status">Nota guardada sólo en esta pestaña.</p>}
  </form>;
}

function Inspection({ row, scope, back }: { row: Evidence; scope: Scope; back: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [row.id]);
  return <article className="inspector panel" aria-label="Detalle de evidencia">
    <Button className="back" variant="outline" onClick={back}>← Volver a pendientes</Button>
    <div className="eyebrow">{row.country} · PERNOCTA EN VIAJE</div>
    <h2 ref={heading} tabIndex={-1}>{row.name}</h2>
    <p className="muted">Hotel de paso + pensión · misma caja · relevo propio MX/US</p>
    <span className="badge">{row.status}</span>
    <dl className="facts">
      <div><dt>Período de la fuente</dt><dd>{row.period}</dd></div>
      <div><dt>Unidad</dt><dd>{row.unit}</dd></div>
      <div><dt>Impuestos</dt><dd>{row.tax}</dd></div>
      <div><dt>Concepto del modelo</dt><dd className="mono">{row.concept}</dd></div>
      <div><dt>Vínculo canónico</dt><dd className="mono">SIN_VINCULO_CANONICO</dd></div>
    </dl>
    <details><summary>Ver fuente sintética</summary>
      <p>{row.source ?? 'Fuente incompleta: no hay un localizador verificable.'}</p>
      <p className="muted">Ejemplo de estructura, no una fuente pública ni un benchmark adoptable.</p>
    </details>
    <section className="explanation"><h3>Qué ya incluye el modelo</h3><p>{row.included}</p></section>
    <section className="explanation"><h3>Qué falta respaldar</h3><p>{row.gap}</p></section>
    <div className="impact"><div><span>Impacto en CVU</span><strong>Pendiente</strong></div>
      <div><span>Total del caso</span><strong>Pendiente</strong></div></div>
    <p className="muted">Sin importes sustentados no hay total. “Pendiente” no significa cero.</p>
    <Note key={`${scopeKey(scope)}:${row.id}`} scope={scope} row={row} />
  </article>;
}

function EvidenceList({ scope, useEvidence }: { scope: Scope; useEvidence: ListHook }) {
  const [filters, setFilters] = useState(noFilters);
  const [selected, setSelected] = useState<string | null>(null);
  const list = useEvidence(scope, filters);
  const row = list.rows?.find((r) => r.id === selected);
  const patch = (value: Partial<Filters>) => { setFilters({ ...filters, ...value }); setSelected(null); };
  if (!allowed(scope)) return <div className="panel guard" role="alert">
    <h2>{scope.state === 'expired' ? 'Sesión sintética vencida' : 'Acceso de viewer no habilitado'}</h2>
    <p>No se consulta evidencia. Este guard de demo no sustituye los permisos del backend.</p>
  </div>;
  return <div className={`workspace ${row ? 'has-selection' : ''}`}>
    <section className="list panel" aria-label="Pendientes de pernocta">
      <h2>Revisar pernocta</h2><p className="muted">Ambos países · evidencia e impacto</p>
      <label htmlFor="search">Buscar concepto</label>
      <Input id="search" value={filters.search} onChange={(e) => patch({ search: e.target.value })} placeholder="Hotel, pensión o concepto" />
      <div className="filter-grid">
        <label>País<select aria-label="País" value={filters.country} onChange={(e) => patch({ country: e.target.value })}>
          {['Todos', 'MX', 'US'].map((v) => <option key={v}>{v}</option>)}</select></label>
        <label>Estado<select aria-label="Estado" value={filters.status} onChange={(e) => patch({ status: e.target.value })}>
          {['Todos', 'Parcial', 'Sin vínculo', 'Fuera de período', 'Fuente incompleta'].map((v) => <option key={v}>{v}</option>)}</select></label>
      </div>
      {list.loading ? <p role="status">Cargando evidencia sintética…</p> : list.error ?
        <div role="alert"><p>No se pudo consultar. No se muestran resultados anteriores.</p><Button onClick={() => list.retry()}>Reintentar consulta</Button></div> :
        <><p className="count" role="status">{list.rows.length} conceptos</p>
          {list.rows.length === 0 && <p>No hay coincidencias. Cambia los filtros.</p>}
          <div className="rows">{list.rows.map((r) => <Button key={r.id} variant="outline"
            className="row" data-evidence={r.id} aria-pressed={selected === r.id} onClick={() => setSelected(r.id)}>
            <span><span className="row-title">{r.name}</span><span className="muted">{r.country} · {r.concept}</span></span>
            <span className="badge">{r.status}</span>
          </Button>)}</div></>}
    </section>
    {row && !list.error ? <Inspection row={row} scope={scope} back={() => {
      setSelected(null);
      requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-evidence="${row.id}"]`)?.focus());
    }} /> :
      <div className="panel placeholder"><div className="eyebrow">REVISIÓN DEL BENCHMARK</div>
        <h2>De la evidencia al costo,<br />sin ocultar los faltantes.</h2>
        <p>Selecciona un concepto para ver fuente, vigencia, inclusiones y efecto en CVU.</p>
        <p className="muted">4 ejemplos sintéticos. Ningún importe ni supuesto aprobado.</p></div>}
  </div>;
}

export function Review({ variant, useEvidence }: { variant: string; useEvidence: ListHook }) {
  const [scope, setScope] = useState(defaults);
  const [refreshes, setRefreshes] = useState(0);
  return <>
    <div className="demo">DEMOSTRACIÓN LOCAL · datos sintéticos · sin Auth, API ni adopción de precios</div>
    <header className="brand"><img src={logo} alt="MARKSMAN — Precision Freight Networks" />
      <nav aria-label="Comparación técnica"><a href="/actual.html" aria-current={variant === 'Actual' ? 'page' : undefined}>Base actual</a>
        <a href="/refine.html" aria-current={variant === 'Refine' ? 'page' : undefined}>Refine Core</a></nav></header>
    <main>
      <div className="eyebrow">BASES DE COSTO / REVISIÓN DE BENCHMARK · {variant.toUpperCase()}</div>
      <h1>Pernocta respaldada,<br className="mobile-break" /> costo explicable.</h1>
      <p className="subtitle">Base binacional · 28–30 septiembre 2026 · caja seca 53′ · relevo propio</p>
      <div className="context panel">
        <label>Ciclo<select aria-label="Ciclo" value={scope.cycle} onChange={(e) => setScope({ ...scope, cycle: e.target.value as Scope['cycle'] })}>
          <option value="NETWORK_EXPECTED_EMPTY_PROXY">Red · vacío esperado</option><option value="DEDICATED_EMPTY_SAME_BOX_RETURN">Dedicado · retorno misma caja</option></select></label>
        <label>Compra<select aria-label="Compra" value={scope.funding} onChange={(e) => setScope({ ...scope, funding: e.target.value as Scope['funding'] })}>
          <option value="CASH">Contado</option><option value="FINANCED">Financiado</option></select></label>
        <div className="context-note"><span className="mono">MX → US</span><span>Hotel + pensión en ambos países.<br />No hay mix ni noches asumidas.</span></div>
      </div>
      {scope.state === 'stale' && <p className="stale" role="alert">Revisión obsoleta (simulada): cambió la huella del expediente. Revalidar la evidencia antes de adoptar valores.</p>}
      <EvidenceList key={scopeKey(scope)} scope={scope} useEvidence={useEvidence} />
      <details className="qa"><summary>Controles de validación · sólo demo</summary>
        <div className="qa-fields">
          <label>Cuenta sintética<select aria-label="Cuenta sintética" value={scope.account} onChange={(e) => setScope({ ...scope, account: e.target.value })}>
            <option>Cuenta sintética A</option><option>Cuenta sintética B</option></select></label>
          <label>Rol sintético<select aria-label="Rol sintético" value={scope.role} onChange={(e) => setScope({ ...scope, role: e.target.value as Scope['role'] })}>
            <option>ADMIN</option><option>OPERATOR</option><option>VIEWER</option></select></label>
          <label>Consulta sintética<select aria-label="Consulta sintética" value={scope.state} onChange={(e) => setScope({ ...scope, state: e.target.value as Scope['state'] })}>
            <option value="normal">Normal</option><option value="error">Error</option><option value="expired">Sesión vencida</option><option value="stale">Revisión obsoleta</option></select></label>
          <Button variant="outline" onClick={() => setRefreshes((n) => n + 1)}>Simular renovación</Button>
          <span role="status">Renovaciones simuladas: {refreshes}</span>
        </div>
        <p>Roles y renovación simulados: no prueban Supabase ni seguridad productiva.</p>
      </details>
      <footer>Wireframe A · componentes Button/Input y React Hook Form existentes · fuentes tipográficas aprobadas sin archivos: fallback Arial/Courier.</footer>
    </main>
  </>;
}
