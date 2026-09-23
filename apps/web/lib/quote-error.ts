/** Allowlisted UI copy: never display arbitrary server diagnostics persistently. */
export function quoteErrorCopy(error: unknown) {
  const failure = error && typeof error === 'object'
    ? error as { status?: unknown; message?: unknown }
    : null
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
