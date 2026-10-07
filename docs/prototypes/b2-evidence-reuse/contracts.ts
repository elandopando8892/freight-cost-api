export type Scope = {
  account: string;
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER';
  cycle: 'NETWORK_EXPECTED_EMPTY_PROXY' | 'DEDICATED_EMPTY_SAME_BOX_RETURN';
  funding: 'CASH' | 'FINANCED';
  state: 'normal' | 'error' | 'expired' | 'stale';
};
export type Filters = { search: string; country: string; status: string };
export type Evidence = {
  id: string; name: string; country: string; status: string; source: string | null;
  period: string; unit: string; tax: string; concept: string; gap: string;
  included: string; canonicalKey: null; amount: null;
};
export type ListResult = {
  rows: Evidence[]; loading: boolean; error: boolean; retry: () => unknown;
};
export type ListHook = (scope: Scope, filters: Filters) => ListResult;
export const scopeKey = (s: Scope) => JSON.stringify([
  s.account, s.role, 'B2_USER_SCOPE_20261003', '2026-09-28/2026-09-30', s.cycle, s.funding, s.state,
]);
export const allowed = (s: Scope) => s.role !== 'VIEWER' && s.state !== 'expired';

// Deliberately no market amounts, customer records or inferred hotel/pensión mix.
export const fixture: Evidence[] = [
  {
    id: 'mx-hotel', name: 'Hotel de paso', country: 'MX', status: 'Parcial',
    source: 'https://example.invalid/demo/mx-hotel', period: '28–30 septiembre 2026 (sintético)',
    unit: 'MXN / habitación / noche', tax: 'Inclusión fiscal no demostrada', concept: 'MX_TRAVEL_EXPENSES',
    gap: 'Falta tarifa aplicable, noches justificadas y reparto hotel/pensión. No adoptar un mix 50/50.',
    included: 'Comidas MX se concilian por separado. El patio de base no es una habitación.',
    canonicalKey: null, amount: null,
  },
  {
    id: 'mx-pension', name: 'Pensión para pernoctar', country: 'MX', status: 'Sin vínculo',
    source: 'https://example.invalid/demo/mx-pension', period: '28–30 septiembre 2026 (sintético)',
    unit: 'MXN / unidad / noche', tax: 'Por verificar', concept: 'MX_TRAVEL_EXPENSES',
    gap: 'Estacionamiento no demuestra habitación incluida. Falta tarifa y vínculo canónico aprobado.',
    included: 'No duplicar patio fijo de base con estancia en viaje.', canonicalKey: null, amount: null,
  },
  {
    id: 'us-hotel', name: 'Hotel de paso', country: 'US', status: 'Fuera de período',
    source: 'https://example.invalid/demo/us-hotel', period: 'Octubre 2026 (sintético, incompatible)',
    unit: 'USD / habitación / noche', tax: 'Por verificar', concept: 'US_DRIVER_TOTAL',
    gap: 'Esta referencia no sustenta septiembre. No trasladar el precio cambiando su etiqueta.',
    included: 'La comida US ya considerada no se añade por segunda vez.', canonicalKey: null, amount: null,
  },
  {
    id: 'us-pension', name: 'Pensión para pernoctar', country: 'US', status: 'Fuente incompleta',
    source: null, period: 'Sin período verificable', unit: 'USD / unidad / noche', tax: 'Sin evidencia',
    concept: 'US_DRIVER_TOTAL', gap: 'Falta fuente, cobertura de pernocta y tarifa del período. No inferir noches del tiempo del activo.',
    included: 'No añadir seguro por viaje: se conserva el tratamiento global de flotilla.',
    canonicalKey: null, amount: null,
  },
];

export async function readEvidence(scope: Scope, filters: Filters): Promise<Evidence[]> {
  if (!allowed(scope)) throw new Error('Acceso sintético rechazado');
  await new Promise((resolve) => setTimeout(resolve, 180));
  if (scope.state === 'error') throw new Error('Consulta sintética fallida');
  const search = filters.search.trim().toLocaleLowerCase('es');
  return fixture.filter((r) =>
    `${r.name} ${r.concept}`.toLocaleLowerCase('es').includes(search) &&
    (filters.country === 'Todos' || r.country === filters.country) &&
    (filters.status === 'Todos' || r.status === filters.status),
  );
}
