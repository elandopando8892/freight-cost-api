export type SectionResult<T> = { data: T; error: null } | { data: null; error: unknown }

export async function section<T>(request: Promise<T>): Promise<SectionResult<T>> {
  try { return { data: await request, error: null } } catch (error) { return { data: null, error: error ?? new Error('Unknown dashboard query failure') } }
}

export function dashboardErrorCopy(status: number | null) {
  if (status === 401) return { detail: 'La sesión expiró. Inicia sesión para consultar esta sección.', action: 'Iniciar sesión', href: '/login' }
  if (status === 403) return { detail: 'Tu cuenta no tiene permiso para consultar esta sección.', action: 'Reintentar consulta', href: '/' }
  if (status === 404) return { detail: 'Este recurso no está disponible. No equivale a una lista vacía.', action: 'Reintentar consulta', href: '/' }
  if (status === 422) return { detail: 'La respuesta contiene datos inválidos. Solicita revisión de esta sección.', action: 'Reintentar consulta', href: '/' }
  if (status === 429) return { detail: 'La consulta está limitada temporalmente. Intenta más tarde.', action: 'Reintentar consulta', href: '/' }
  return { detail: 'No se pudo consultar esta sección. Los datos no se muestran como si estuvieran vacíos.', action: 'Reintentar consulta', href: '/' }
}
