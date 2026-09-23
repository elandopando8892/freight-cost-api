export const usdPerMile = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 })
export const fxFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
export const percent = (value: number) => `${(value * 100).toFixed(1)}%`
export const marginLabel = (label: string, value?: number) => value == null ? `${label} (margen no registrado)` : `${label} (${percent(value)})`
export const provenanceLabel = (value?: 'observed' | 'mixed' | 'cost_proxy' | 'absent') => value === 'observed' ? 'Observada'
  : value === 'mixed' ? 'Mixta: observada + aproximación'
    : value === 'cost_proxy' ? 'Aproximación por costos'
      : value === 'absent' ? 'Sin referencia' : 'Procedencia no registrada'
