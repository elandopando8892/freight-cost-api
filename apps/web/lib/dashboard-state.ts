export type SectionFailure = { status: number | null; kind: 'HTTP' | 'UNAVAILABLE' | 'UNKNOWN' }
export type SectionResult<T> = { data: T; error: null } | { data: null; error: SectionFailure }

function sectionFailure(error: unknown): SectionFailure {
  if (error instanceof Error) {
    const status = 'status' in error ? error.status : null
    if (typeof status === 'number' && Number.isInteger(status) && status >= 400 && status <= 599) {
      return { status, kind: 'HTTP' }
    }
    const cause = error.cause
    const code = cause && typeof cause === 'object' && 'code' in cause ? cause.code : null
    if (['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'UND_ERR_CONNECT_TIMEOUT'].includes(String(code)) || error.name === 'TimeoutError') {
      return { status: null, kind: 'UNAVAILABLE' }
    }
  }
  return { status: null, kind: 'UNKNOWN' }
}

export async function section<T>(request: Promise<T>): Promise<SectionResult<T>> {
  try { return { data: await request, error: null } } catch (error) {
    // Keep native Error/stack/cause out of the RSC component props. Next 16.3.3
    // fails rebuilding a debug stack for these captured fetch errors (frame.join).
    return { data: null, error: sectionFailure(error) }
  }
}

export function dashboardErrorCopy(status: number | null, kind?: SectionFailure['kind']) {
  if (status === 401) return { detail: 'La sesión expiró. Inicia sesión para consultar esta sección.', action: 'Iniciar sesión', href: '/login' }
  if (status === 403) return { detail: 'Tu cuenta no tiene permiso para consultar esta sección.', action: 'Reintentar consulta', href: '/' }
  if (status === 404) return { detail: 'Este recurso no está disponible. No equivale a una lista vacía.', action: 'Reintentar consulta', href: '/' }
  if (status === 422) return { detail: 'La respuesta contiene datos inválidos. Solicita revisión de esta sección.', action: 'Reintentar consulta', href: '/' }
  if (status === 429) return { detail: 'La consulta está limitada temporalmente. Intenta más tarde.', action: 'Reintentar consulta', href: '/' }
  if (kind === 'UNAVAILABLE' || status === 502 || status === 503 || status === 504) return { detail: 'El servicio de datos no está disponible. Esto no indica que el acceso con Google haya fallado. No se muestran datos hasta restablecer la conexión.', action: 'Reintentar consulta', href: '/' }
  return { detail: 'No se pudo consultar esta sección. Los datos no se muestran como si estuvieran vacíos.', action: 'Reintentar consulta', href: '/' }
}
