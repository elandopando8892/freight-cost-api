/** Allowlisted UI copy: never display arbitrary server diagnostics persistently. */
export function quoteErrorCopy(error: unknown) {
  const failure = error && typeof error === 'object'
    ? error as { status?: unknown; message?: unknown; body?: { issues?: unknown } }
    : null
  const fields: Record<string, string> = { outboundLocation: 'origen', inboundLocation: 'destino', mexBorder: 'frontera de México', usBorder: 'frontera de EE. UU.', operation: 'operación', service: 'servicio', route: 'tipo de ruta', costBaseId: 'base de costo', fxRate: 'tipo de cambio', 'equipment.truckType': 'camión', 'equipment.trailer': 'remolque', 'equipment.config': 'configuración', 'equipment.driver': 'operador' }
  if (failure?.status === 400 || failure?.status === 422) {
    const issues = Array.isArray(failure.body?.issues) ? failure.body.issues : []
    const labels = [...new Set(issues.flatMap(issue => {
      const field = issue && typeof issue === 'object' ? (issue as { field?: unknown }).field : null
      return typeof field === 'string' && Object.hasOwn(fields, field) ? [fields[field]] : []
    }))]
    return { title: 'Revisa los datos del cálculo', description: labels.length ? `Corrige: ${labels.join(', ')}. Conservamos la captura; vuelve a calcular después de corregirla.` : 'El servidor rechazó los datos. Revisa origen, destino, base, servicio y tipo de cambio. Conservamos la captura.', reviewBase: false }
  }
  if (failure?.status === 401) return { title: 'La sesión expiró', description: 'Inicia sesión nuevamente antes de calcular. Conservamos la captura mientras permanezcas en esta pantalla.', reviewBase: false }
  if (failure?.status === 403) return { title: 'Sin permiso para calcular', description: 'Solicita a un administrador revisar tus permisos. La captura no se ha eliminado.', reviewBase: false }
  if (failure?.status === 429) return { title: 'Límite temporal de consultas', description: 'Espera un momento y vuelve a calcular. No enviamos reintentos automáticos.', reviewBase: false }
  if (typeof failure?.status === 'number' && failure.status >= 500) return { title: 'Servicio de cálculo no disponible', description: 'Conservamos la captura. Intenta nuevamente cuando el servicio se recupere; no equivale a una ruta sin datos.', reviewBase: false }
  const missingProfile = failure?.status === 409 && failure.message ===
    'Legacy cost-base versions without an applicability profile are restricted to historical snapshot replay.'
  return missingProfile ? {
    title: 'Esta versión requiere un perfil de operación',
    description: 'La versión seleccionada sólo permite consultar cálculos históricos. Conservamos la captura. Selecciona una versión compatible o pide a un administrador que revise y apruebe el perfil de una nueva versión.',
    reviewBase: true,
  } : {
    title: 'No fue posible generar la tarifa',
    description: 'Conservamos la captura. Revisa el contexto de base y ruta, o intenta nuevamente.',
    reviewBase: false,
  }
}

export function quoteSaveErrorCopy(error: unknown): string {
  const failure = error && typeof error === 'object' ? error as { status?: unknown; message?: unknown } : null
  if (failure?.status === 401) return 'La sesión expiró. Inicia sesión antes de guardar; el cálculo sigue visible.'
  if (failure?.status === 403) return 'Tu rol no permite guardar cotizaciones. Solicita acceso de operador o administrador.'
  if (failure?.status === 404) return 'Esta vista previa ya no está disponible para tu organización. Calcula de nuevo.'
  if (failure?.status === 409 && typeof failure.message === 'string') {
    if (/desactualizado|cambió|Calcula de nuevo/i.test(failure.message)) return 'La base o versión cambió desde la vista previa. Calcula de nuevo antes de guardar.'
    if (/clave de guardado/i.test(failure.message)) return 'Este intento de guardado ya se usó con otro contenido. Conserva la etiqueta original o genera un nuevo cálculo.'
  }
  if (failure?.status === 422) return 'El servidor rechazó los datos de la cotización. Revisa la ruta, la base y el servicio.'
  if (failure?.status === 429) return 'Hay demasiadas solicitudes. Espera un momento y reintenta el mismo guardado.'
  return 'No pudimos confirmar el guardado. Reintenta: se reutilizará la misma clave para evitar duplicados.'
}
