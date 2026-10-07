# B2 · Consumidor transitorio Google Maps y revisión de clave web

Fecha local: 2026-09-30. Registro: 2026-10-01T00:25:46Z. Rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, worktree D: verificados antes de editar. La ruta C: es fachada; archivo histórico `C:\Users\andre\.codex\AGENTS.md` no existe en esta comprobación. Lineamientos completos vigentes leídos de `D:\andre\apps\codex-home\AGENTS.md` y de la solicitud; leído AGENTS de web y guías Next locales de límites servidor/cliente y variables de entorno. Cambios preexistentes preservados.

## Antes / ahora / pendiente

Antes: consulta CLI real acreditaba acceso y contrato, pero descartaba contenido sin consumidor visual. Ahora: [wireframe/handoff MARKSMAN](../design/google-route-review-wireframe.md), página `/scenarios/benchmark/route-review` enlazada desde benchmark, inputs nominales del tramo US, intermedios explícitos, consentimiento de consumo, estado vacío/loading/error y presentación transitoria de distancia/tiempo/trazado mediante Google Maps. Backend reutiliza cliente básico y controles existentes; la revisión permanece desactivada por defecto y bloqueada fuera de development.

**Desarrollado y probado localmente; no mapa real/SaaS autenticado desplegado o aceptado.** La falta de clave web restringida no se sustituye por exponer clave servidor. No se valida camión ni peaje/ciclo/domicilio/puente. Handoff económico sigue null, cero adopciones, B1/E1 abiertos, B2 parcial y 0/4 gates. No convertir este corte visual en cierre económico.

## Reutilización y responsabilidades

- Guía `design:design-handoff` usada para medidas/tokens, breakpoints, estados, accesibilidad y wireframes. Manual oficial MARKSMAN: inspección visual páginas 12/13, tokens/logo/fallbacks licenciados existentes conservados. No ideación de tres estilos ni imágenes generadas: se continúa dirección seleccionada, no se solicita nueva marca.
- Google conserva cartografía y atribución; FCM conserva gobierno económico y permisos. Recomendación fundamentada en el wireframe: adaptar Maps JS nativo en lugar de wrapper nuevo o mapa alternativo con datos Google. APIs proveedor leídas hoy; backend y BFF existentes, no otro stack/core/infra.
- `google-route-review.routes.ts`: GET config sin proveedor; POST estricto con reconocimiento de consumo, sesión/org y ADMIN/OPERATOR. Flag local explícito, key sólo servidor por proceso, no carga automática de archivos privados. Una tentativa compartida por instancia del plugin, reservada síncronamente; errores/concurrencia/otro tenant no restauran cupo ni devuelven contenido ajeno. Sin persistencia, engine, logging del cuerpo o retry.
- `google-review-map.ts`: SDK oficial una vez por documento al pulsar, canal quarterly; espera tiles iniciales o rechaza ante fallo de autorización/timeout antes de POST. Data recibe GeoJSON nativo y ajusta bounds lng/lat; limpiar destruye capa/listeners al salir. No SDK/decoder/dependencia nuevos.
- `RouteReview`: sin consulta ni mapa al montar, permisos/config comprobados antes de SDK; bloqueo de doble clic síncrono, respuestas tardías descartadas, limpieza al borrar/editar/sesión vencida/pagehide/unmount. No storage/React Query/exportación de rutas. No adopción desde observaciones. Cambio de cuenta se probó como remount/evento simulado; no dos cuentas reales.
- Producción no puede activarse con el flag local. Reiniciar API restablece el contador por instancia; no representa límite global de cuenta/mes ni autorización para correr nuevas consultas. Previo a release: gobierno compartido de consumo, términos/privacidad públicos aplicables, credenciales/restricciones y validación real integral. No activar múltiples réplicas con este contador local.

## Evidencia local

**234/234 pruebas en siete archivos PASS**, 41 nuevas:

| Archivo | Pruebas / evidencia |
| --- | --- |
| API google-route-review-routes | 17 nuevas: permisos/tenant/config/prod, strict input/consent, concurrencia/cupo, error limpio, no-store/size |
| API google-basic-route-client | 49 regresión, respuesta/proveedor mock |
| API api.test | 126 regresión de app/registro y contratos existentes, mocks |
| API benchmark-route | 12, incluidos metadatos fieles al snapshot corregido |
| Web google-route-review | 19 nuevas: flujo, permisos/key/consent, duplicación, sesión, respuestas tardías, remount, no storage/adopción |
| Web google-review-map | 5 nuevas: loader único, GeoJSON/bounds/cleanup, fallo auth/timeout, sin red real |
| Web benchmark-calculator | 6 regresión del formulario existente |

Typecheck API y web PASS; diff check PASS con advertencias LF/CRLF existentes. No build Next completo ni suite general reejecutados; sin deploy. Tests herméticos con clave/puntos sintéticos, no lectura de la clave privada ni datos Google reales. **Cero solicitudes facturables de Routes o Maps en este corte.** La prueba CLI real anterior conserva su recibo separado (una solicitud), no cuenta como recorrido de esta UI.

Primera regresión descubrió snapshot de formulario anterior (140 keys MX/139 US) frente a contrato `TRACTOR_ONLY` vigente (125/124). Archivos backend/form/rates/catalog y snapshot estaban limpios antes del corte. Diagnóstico acotado confirmó únicamente 15 keys `cost-crossborder` adicionales por país; se retiraron mecánicamente de la muestra estática para coincidir con metadatos actuales. No se cambió contrato económico ni importes/defaults ni se relajó el test. Reejecución afectada PASS. El primer diagnóstico por importación sin DATABASE_URL falló en validación de config, no consultó DB; diagnóstico posterior usó URL hermética localhost:1 sin operaciones DB. No claves/costos de ejemplo sembrados en bases.

QA visual: harness Vite existente `127.0.0.1:4317/tests/visual/viewports.html?page=route-review`, env y red externa bloqueados, sin shell/login real. Inspección desktop y móvil: iframe 1440×900, clientWidth/scrollWidth 1440/1440; iframe 390×844 con scrollbar vertical, contenido útil 371/371. Formulario, acciones, mapa vacío y pendientes legibles sin desbordamiento horizontal; footer móvil inspeccionado. Capturas sólo vacías/sintéticas, no cartografía de Google archivada. No aceptación visual de tiles reales o respuesta real.

## Credencial existente: evidencia de consola y orientación

Usuario abrió Keys & Credentials del proyecto **rateware**, cuenta `sales@heymarksman.com`. Filtro Maps JavaScript API mostraba botón Disable (indicador de habilitación en consola, no prueba de SDK). Credencial compatible visible **Bidware**, creada Sep 24, 2026, **35 APIs**; lista incluye Maps JavaScript API. En detalle, Application restrictions **None seleccionado**, Websites/IP/Android/iOS no seleccionados. Lectura únicamente: no Show key, Save, Create credential, Disable ni cambio de restricciones. No copiar esta clave a FCM ni modificarla: pertenece a otra aplicación y se desconoce su uso compartido; compatibilidad con API no acredita seguridad para navegador.

Ubicación manual: [Keys & Credentials rateware](https://console.cloud.google.com/google/maps-apis/credentials?project=rateware) → fila Bidware → nombre para restricciones; Show key revela el valor, no pegarlo al chat. No repetir ni guardar secretos/signing secret/URLs de reautenticación de consola en este expediente.

**Recomendación y siguiente decisión:** clave web exclusiva FCM, Application restrictions Websites, sólo orígenes locales usados (`http://localhost:3001/*` y `http://127.0.0.1:3001/*`), API restriction Maps JavaScript API únicamente. No autorizar `*.vercel.app`, no reusar/debilitar Bidware ni clave Routes. Crear credencial/ampliar acceso requiere autorización puntual y, si la consola requiere términos o entrada de nueva credencial, intervención humana conforme a la política. No se crea por esta orientación.

Tras autorización/configuración privada: browser key en `apps/web/.env.local` como `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`, nunca `GOOGLE_ROUTES_API_KEY`; servidor recibe su key existente por proceso y `FCM_GOOGLE_ROUTE_REVIEW_ENABLED=true` únicamente durante prueba local acotada. No claves literales en código/docs. Verificar restricciones primero; no fallback ni quitar restricciones ante error. No modificar `.env.local` o copiar key automáticamente en este corte. El mapa real requerirá sesión/rol existentes, origen autorizado y autorización del consumo de una carga de mapa + una consulta; no contraseña en chat.

[Precio oficial revisado](https://developers.google.com/maps/billing-and-pricing/pricing): Dynamic Maps 10,000 eventos gratuitos/mes y USD 7/1,000 primera banda de pago; Compute Routes Essentials tiene su propio cap de 10,000 y USD 5/1,000. Uso compartido por cuenta/SKU, saldo real desconocido. Son dos eventos diferentes, no afirmar costo cero por volumen de cotizaciones. No cambio de cuotas/facturación/habilitaciones. [Seguridad oficial](https://developers.google.com/maps/api-security-best-practices) fundamenta separar/restringir claves; [loader](https://developers.google.com/maps/documentation/javascript/load-maps-js-api), [eventos/fallo auth](https://developers.google.com/maps/documentation/javascript/events), [políticas de Routes](https://developers.google.com/maps/documentation/routes/policies) sustentan integración y límites.

## Modelo y recuperación

Modelo recomendado GPT-6.1 Sol · alto integración/seguridad, medio comprobación de consola y orientación. No selector cambiado, Astra/subagentes ni tokens/precio de modelo medidos. Sin negocio, IA de aplicación, Auth/Neon/usuarios/migraciones, DB writes o infraestructura; sin commit/push/preview/producción. Servidor QA local Vite en 4317 sólo interfaz simulada; no backend real activado.

Rollback no ejecutado: quitar archivos nuevos de UI/adapter/API/tests/wireframe y este informe; retirar sólo import/registro nuevo de app.ts, enlace nuevo en benchmark/page.tsx y entrada route-review del harness. Revertir exclusivamente refresh del snapshot si se quiere restaurar la muestra previa (volvería a fallar su prueba por desfase conocido). Retirar notas de estado de este corte. Preservar cambios ajenos, archivo privado con key y cliente/recibos/expedientes anteriores. No secreto/estado cloud que eliminar; no desmontar infraestructura ni credenciales compartidas.
