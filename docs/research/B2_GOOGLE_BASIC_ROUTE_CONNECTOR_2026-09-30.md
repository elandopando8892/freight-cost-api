# B2 - Trazado básico Google, sin optimización ni contacto comercial

Fecha: 2026-09-30. Corredor del usuario: Mexico, DF - Fort Smith, AR 72916 vía Nuevo Laredo / Laredo. Este corte implementa la aclaración del usuario: **mapear trazado/distancia con las APIs existentes**, no optimizar flotas ni enviar formularios a Google. Sustituye ese contacto como siguiente paso obligatorio del snapshot anterior; no niega las limitaciones documentadas de TRUCK.

## Entregable y límites

Cliente local nuevo: `apps/api/src/modules/routing/google-basic-route.client.ts`. Reutiliza fetch/Zod y las convenciones del conector SAKBÉ, sin importar motor/Prisma/servidor. Usa exclusivamente ComputeRoutes con `DRIVE`, `TRAFFIC_UNAWARE`, sin alternativas ni optimización, hasta diez intermedios explícitos. Máscara fija: distancia, duración y GeoJSON LineString. Se adapta [GeoJSON nativo del proveedor](https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRoutes), sin decoder propio ni SDK/dependencia nuevos.

El perfil no acepta tolls/traffic/TRUCK, máscaras wildcard ni flags de aprobación. Devuelve geometría transitoria y observaciones; `truckRouteValidated:false`, peaje comercial null y cuatro inputs del handoff null. Una ruta DRIVE **no se promueve a itinerario operativo de camión**, tiempo sin tráfico no es ciclo y puntos nominales no son domicilios/puente aprobados. No se alteran preflight D2D, tasas, CFU/CVU ni expedientes MX.

CLI: `apps/api/scripts/query-google-basic-route.ts`. Por defecto sólo planifica, sin clave/red. `--execute` habilita explícitamente una consulta; un intento máximo por instancia, reservado antes del await, sin retry ni fallback. HTTP/access/cuota/timeout/JSON/geometry vacíos o inválidos salen con código limpio, sin cuerpo/prosa de proveedor ni causas que expongan claves. La clave sólo se envía en header al host fijo HTTPS, nunca en URL/body/log.

**No hay límite mensual global implementado**: crear otra instancia/proceso reinicia el límite local. La futura integración SaaS necesita contador compartido compatible con tenant/cuenta y evitar consultas automáticas por render. No presentar 3,000 cotizaciones como 3,000 llamadas ni un cap local como saldo de Google.

## Costo y términos aplicables

[Precio público revisado hoy](https://developers.google.com/maps/billing-and-pricing/pricing): Compute Routes Essentials tiene 10,000 eventos gratuitos/mes; el perfil básico está diseñado para ese SKU. La cuenta comparte consumo con otros proyectos y funcionalidades de otras APIs tienen sus propios eventos. El saldo real sigue desconocido: menos de 3,000 consultas de este módulo no garantiza por sí solo costo cero de toda la cuenta. No se modifican cuotas, facturación ni habilitaciones. No se piden peajes Google (Enterprise) ni optimización; peajes de camión quedan en el expediente comercial separado.

[Políticas de Routes](https://developers.google.com/maps/documentation/routes/policies): contenido cartográfico no se guarda en JSON de investigación, DB ni caché; si se muestra sobre mapa debe ser Google Maps y conservar atribución. El cliente devuelve atribución/política junto con el contenido transitorio. El CLI **no imprime geometría/distancia/tiempo** en salida retenida; una eventual ejecución valida el contrato y muestra únicamente estado no cartográfico. Aún falta consumidor UI transitorio, términos/privacidad visibles y wireframes MARKSMAN; esto no es mapa visible terminado ni integración SaaS autenticada.

## Solicitud y configuración privada

[Borrador Laredo - Fort Smith](B2_GOOGLE_BASIC_US_REQUEST_2026-09-30.json): localidades nominales confirmadas por usuario, sin puntos intermedios elegidos por el agente. No se infieren coordenadas/domicilio/puente. SHA-256 `d01e2697edfea76c006e86177ecdccbf21a2487dd797ecbef22d26c6107e1a02`.

Archivo privado nuevo, confirmado ignorado por Git: `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927\.env.google-routes.local`, inicialmente vacío, variable `GOOGLE_ROUTES_API_KEY`. Introducir únicamente la clave de servidor existente del proyecto rateware que permita Routes. No pedir crear credenciales ni debilitar restricciones; no compartir valor en chat ni frontend. Se solicitó al usuario introducirla ahí; no hay credencial usable acreditada ni llamada live en este corte. La apertura del archivo en Codex fue solicitada; herramienta devolvió `queued`, no se afirma que el panel ya sea visible.

Desde la raíz del worktree, con Node/tsx existentes:

```text
node node_modules/tsx/dist/cli.mjs apps/api/scripts/query-google-basic-route.ts --route=docs/research/B2_GOOGLE_BASIC_US_REQUEST_2026-09-30.json
```

Dry-run reproducido: exit 0, `DRY_RUN_NO_NETWORK`, máscara/perfil básico correctos, cero solicitudes reales y DB no usada. Añadir `--execute` sólo para la prueba puntual cuando exista clave compatible; el CLI no es motor de cotizaciones ni publica ruta. Variable de entorno explícitamente vacía desactiva fallback al archivo privado para pruebas herméticas. No se cargan `.env` generales ni credencial SAKBÉ.

## Plan y evidencia de pruebas

Guía utilizada **`engineering:testing-strategy`**: concentra pruebas en aislamiento financiero/seguridad, contrato, errores y no-adopción; ninguna fixture representa ruta real.

| Área | Tipo / cobertura objetivo | Evidencia local |
| --- | --- | --- |
| Perfil y costo | Unitarias: todas las opciones avanzadas y promociones de aprobación rechazadas antes de red | PASS |
| Seguridad | Unitarias: key sólo en header, input con key rechazado, outputs/prosa/error/cause limpios, size cap y redirect error | PASS |
| Conteo por cliente | Unitarias: dos llamadas concurrentes, repetición y fallo no generan segundo intento; timeout sin retry | PASS |
| Datos | Unitarias: unidades/GeoJSON válidos; ceros, forma degenerada, errores/alternativas/missing route no crean costo o viaje | PASS |
| CLI | Dry-run sin key/red; ejecución mock única sin contenido cartográfico en reporte; clave vacía sin fallback privado | PASS |
| Regresión | Google + SAKBÉ + enlace + readiness + ruta pública + compositor | **226/226 en seis archivos PASS, 49 nuevas** |
| Compilación | Typecheck API, CLI y test explícitos (ESNext/Bundler para scripts import.meta) | PASS |
| Privacidad local | git check-ignore archivo de clave, expediente/caso/detalle previos con hashes, diff check | PASS |

Inicialmente se corrigió el harness de casos vacíos de `it.each`; no se ocultó el fallo. El primer comando Vitest apuntó al node_modules incorrecto y se corrigió al root existente, sin instalar nada. Un primer typecheck de scripts usó NodeNext/CJS y falló por import.meta; el perfil explícito ESM pasó tras ajustar tipos del harness. Son errores locales resueltos, no fallos externos.

En el corte inicial no se probó API Google real, mapa visible, persistencia, suite general, release o producción. La consulta real posterior se registra abajo, sin convertirla en prueba de UI/SaaS. **B1/E1 abiertos, B2 parcial, cero adopciones, 0/4 gates**; no termina economía del MVP.

## Siguiente único, gobierno y rollback

**Validación real posterior completada, 2026-09-30 (hora local México):** tras `adelante`, comprobación sin secretos confirmó clave no vacía en archivo privado y sin override de proceso. Una sola invocación `--execute` devolvió `CANDIDATE_NOT_TRUCK_VALIDATED`, proveedor Google Maps Routes, `attemptsThisClient:1`, sin reintentos. El cliente validó distancia/duración/GeoJSON en memoria; la salida no contiene geometría, distancia ni tiempo. [Recibo no cartográfico](B2_GOOGLE_BASIC_LIVE_RECEIPT_2026-09-30.json) conserva estado, perfil y pin de solicitud, no datos de Google ni clave. Se resuelve el bloqueo de clave vacía descrito históricamente abajo; no se certifica facturación cero, pertenencia de la credencial a un proyecto mediante la respuesta, mapa visible, aptitud de camión ni recorrido autenticado SaaS. Handoff conserva cuatro null, `quoteReady:false`, DB no usada, cero adopciones. No cambios de código ni repetición de las 226 pruebas del corte anterior; no se creó credencial, envió formulario o cambió configuración cloud/Auth/producción. Modelo recomendado: GPT-6.1 Sol · medio, sin cambio de selector ni consumo de tokens medido. Siguiente: consumidor transitorio Google Maps con wireframe MARKSMAN; una nueva consulta requiere presupuesto y alcance explícitos, no reusar un resultado que ya fue descartado. Rollback de esta validación: retirar sólo recibo y notas de este corte; la solicitud consumida no es reversible. Preservar la clave privada del usuario.

Validación real solicitada posteriormente el 2026-09-30, tras `listo adelante`: una invocación local con `--execute` devolvió `BLOCKED / MISSING_API_KEY` antes de llamar a Google. Diagnóstico sin valores: archivo privado existente, variable `GOOGLE_ROUTES_API_KEY` presente pero vacía en disco; variable de proceso ausente, por lo que no ocultaba una clave del archivo. **Cero solicitudes externas**, no rechazo del proveedor ni prueba de credencial/ruta. Pendiente guardar el valor de la clave existente en ese archivo. No reintento, cambio de código o repetición de las 226 pruebas locales anteriores; su evidencia sigue siendo del corte previo. Modelo recomendado para esta comprobación: GPT-6.1 Sol, esfuerzo medio, selector no cambiado. Archivo privado no modificado por el agente. Rollback de esta comprobación: retirar sólo este párrafo y su nota de estado; sin efecto remoto que revertir.

**Clave existente privada -> prueba básica única -> consumidor temporal Google Maps para inspeccionar candidato**, con wireframe antes de UI. No enviar interés LVR ni cambiar cuentas como prerrequisito de este alcance. Después validar trazado para camión y sólo las casetas de ese itinerario antes del handoff económico. Si la clave está restringida para navegador u otro API, reportar rechazo; no quitar restricciones ni crear otra sin autorización puntual.

Modelo recomendado único: **GPT-6.1 Sol, esfuerzo alto** para integración y seguridad. Sin cambio de selector, Astra ni subagentes.

Rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, worktrees y AGENTS aplicables verificados, D: explícito. Cambios ajenos conservados, package.json previo intacto. Sin commit/push, deploy, Auth/Neon/DB, migraciones, usuarios, infraestructura, negocio ni IA de aplicación. Seis originales Google/tarifas y pins anteriores conservados. Rollback no ejecutado: retirar sólo cliente/CLI/test/borrador/documento de este corte y sus dos párrafos nuevos de estado/plan. **Preservar archivo privado si el usuario ya introdujo su clave**, así como SAKBÉ, expedientes y cambios ajenos; no hacer limpieza remota.
