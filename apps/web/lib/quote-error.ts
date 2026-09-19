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
