# C1: cálculo autenticado y criterio CORS

19 septiembre 2026, candidato eee0fa8. ADMIN sales completó Google en web 8rsm0poap, organización HeyMarksman. Se recorrió el asistente: Monterrey, Nuevo Leon → Dallas, TX; D2D Export; servicio automático; base XBF-XB-PILOT v1; Tractocamión/Caja seca/Sencillo/B1.

Generar tarifa falló. La UI conservó captura y mostró mensaje genérico con reintento. Logs del API cauiyuc1e confirman POST /engine/quote-by-route HTTP 409 (timestamp 1789829532848); no fue fallo de red/CORS. GET /catalog/locations y /cost-bases devolvieron 200. No hubo guardado ni envío.

La causa concreta del 409 permanece en investigación: no atribuirla sólo a configuración ni modificar datos para evadirla. El recorrido A3 está bloqueado por un fallo reproducido; se debe resolver su causa y mostrar información útil al usuario.

Revisión de código: lib/fetcher.ts llama rutas relativas /api/v1; quote-wizard.tsx usa ese fetcher. app/api/v1/[...path]/route.ts llama al API desde el servidor y buildBffRequestHeaders no transmite Origin del navegador. lib/api.ts es cliente de servidor. Los logs de este cálculo prueban llegada al API y respuesta HTTP.

Por tanto API_CORS del smoke anterior comprueba acceso directo entre orígenes que este recorrido BFF no necesita. Se conserva su BLOCK como resultado histórico; para este recorrido corresponde no aplicable con la evidencia anterior, no abrir CORS. Pendiente adaptar el verificador a un modo BFF explícito sin debilitar el modo directo.

Siguiente: identificar cuerpo/código del 409, resolver bloqueador con mínima corrección y repetir cálculo. Modelo recomendado Astra alto. Sesión ADMIN conservada en navegador para continuar. Renovación, aislamiento y escritura denegada a VIEWER aún no acreditados.
