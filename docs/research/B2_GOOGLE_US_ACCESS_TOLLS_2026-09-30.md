# B2 - Google existente y peajes comerciales US

Fecha: 2026-09-30. Corredor del usuario: **Mexico, DF - Fort Smith, AR 72916 vía Nuevo Laredo / Laredo**. Decisión: conservar SAKBÉ para MX y evaluar **el proyecto Google existente antes de contratar otro proveedor**. [Manifiesto de evidencia y pins](B2_GOOGLE_US_ACCESS_TOLLS_2026-09-30.json).

## Resultado de la cuenta, no sólo documentación

Después de que el usuario completó la reautenticación, la consola autenticada confirmó proyecto `rateware`, nombre Rateware, **Routes API habilitada** y plan **Pay as you go**. ComputeRoutes: 3,000 solicitudes/minuto, diario Unlimited y por usuario/minuto Unlimited. Matrix: 3,000 elementos/minuto y diario Unlimited. No se cambiaron estas cuotas. El dashboard de un día mostraba dos solicitudes y 0% errores; no se atribuyen al FCM, a TRUCK ni a este corte. La cuota mostraba uso actual cero, otra ventana de observación. Ninguna cifra demuestra saldo gratuito.

**LVR/TRUCK provisionado: desconocido**, no deshabilitado demostrado. Habilitar Routes no acredita ese acceso especial. Las pantallas revisadas no dan un indicador concluyente de provisioning. [Google exige solicitar acceso por proyecto](https://developers.google.com/maps/documentation/routes/lvr). El formulario oficial [Expresar interés](https://developers.google.com/maps/documentation/routes/contact) fue leído autenticado: pide empresa, correo de contacto, proyecto, API y caso de uso; no fue rellenado ni enviado. La reautenticación ya no es el bloqueo. Pendientes: entitlement LVR, credencial backend utilizable y costo/permiso de prueba.

No se abrió la pantalla de claves ni se leyeron valores secretos. `gcloud` no apareció en PATH; nombres de variables de proceso Google/Maps/Routes/GCP y búsquedas limitadas al código/documentación FCM y dos ubicaciones Rateware no hallaron conector reutilizable. Esto **no demuestra ausencia de claves remotas o acceso LVR**. No se inspeccionaron archivos de secretos ni el token SAKBÉ.

## Separación de capacidades y economía

La captura del formulario vacío `sources/GOOGLE_LVR_FORM_REVIEW_20260930.jpg` conserva el aviso de contacto y botón de envío; SHA-256 en el manifiesto. Es una captura de revisión, no prueba de envío/provisioning. Incluir únicamente esta captura nueva en el rollback documental si ya no tiene referencias.

[LVR](https://developers.google.com/maps/documentation/routes/lvr) cubre los 48 estados contiguos US, no MX. Puede entregar distancia, geometría y ETA de camión usando `TRUCK`, `TRAFFIC_AWARE_OPTIMAL` y atributos reales en `vehicleInfo`. Antes de adoptar, revisar `routeRestrictionsPartiallyIgnored`; una respuesta best-effort no acredita legalidad operativa. No incluye precios de peaje para camión. No se copiaron dimensiones del ejemplo a nuestro equipo.

[Peajes ordinarios Google](https://developers.google.com/maps/documentation/routes/calculate_toll_fees) son estimaciones no comerciales: se rechaza convertirlas en costos del tractocamión. Precio ausente es desconocido, no cero. [Facturación por características y solicitud](https://developers.google.com/maps/documentation/routes/usage-and-billing): el plan y la cuota Unlimited no garantizan costo cero. No se acreditaron saldo gratuito ni SKU/precio efectivo de TRUCK; no se ejecutó ComputeRoutes/Matrix, no se habilitó API, no se solicitó provisioning ni se aceptó suscripción. La tabla pública de precios no sustituye la verificación contractual de la cuenta.

## Peajes: fuentes concretas, aún no gastos del viaje

Se archivaron seis originales públicos con SHA-256 en el manifiesto. La fecha de archivo no es fecha de vigencia. No hay todavía itinerario US, así que **ninguna plaza está seleccionada para este viaje**.

| Fuente oficial | Regla / control observado | Límite de uso |
| --- | --- | --- |
| [TxDOT CTTS](https://www.txdot.gov/discover/toll-roads-managed-lanes/txdot-toll-roads/central-texas-turnpike-system-toll-rates.html) | Tabla por ejes y Tag/no Tag, efectiva 1 ene 2026. Control Loop 1 Merrilltown cinco ejes: USD 5.44 / 8.16 | Multiplicador de este operador no universal; notas especiales SH130 1-4 / SH45 SE pendientes si la ruta los usa |
| [NTTA](https://www.ntta.org/plan-your-trip) | PDF comercial 1 jul 2025-30 jun 2027, columnas cinco ejes TollTag/ZipCash. Control PGBT Merritt MLG5: USD 8.92 / 17.84 | Mapa interactivo dos ejes no sustituye tabla comercial; TEXpress requiere operador propio |
| [SH130 South](https://mysh130.com/traveler-info/toll-rates/) | Segmentos 5-6 con clases por dimensiones/remolques. Control Skyline Class D: USD 13.12 / 16.18 | Class D no equivale automáticamente a cinco ejes; vigencia general no explícita. No sumar tarifas agregadas y sus plazas |

Guía **`pdf:pdf`** utilizada: render y revisión visual íntegra de las dos páginas del PDF NTTA; confirmó encabezados, vigencia y columnas por ejes/pago. Esas cifras son controles documentales, **no importes adoptables ni total de casetas**.

[PIKEPASS](https://pikepass.com/plan-your-trip/toll-calculator): índice de clasificación por ejes identificado, pero acceso web al calculador sólo expuso shell; no se recuperó precio ni se eligió Oklahoma como corredor. Estudios/propuestas históricos de Arkansas excluidos como prueba tarifaria vigente. No se infiere peaje cero en Arkansas ni se escoge un itinerario alternativo por cuenta propia.

## Entrega finita y siguiente salida

Terminada: revisión de cuenta Google existente y viabilidad por operador. **No terminada: ruta US real ni calibración económica**. Distancia/tiempo/geometría/peajes US, coordenadas operativas y perfil real del camión siguen null; preflight, tasas, ciclo, cruce/remolque y CFU/CVU no se modifican. B1/E1 abiertos, B2 parcial, cero adopciones, 0/4 gates de negocio. No nuevo sprint ni otra ronda genérica.

Siguiente único: **acreditar LVR y costo efectivo en `rateware`**. Si no existe confirmación de acceso, obtener autorización puntual para enviar el interés/consulta de provisioning a Google con empresa/correo/proyecto/caso de uso; no implica contratar ni aceptar cargos. Una prueba API requiere después credencial segura, puntos/perfil explícitos y límite de llamadas/costo autorizado. Tras una ruta útil, conciliar sólo sus plazas comerciales y conectar evidencia al preflight existente. No fallback silencioso a DRIVE, HERE ni parámetros ficticios para declarar cerrado B2.

Modelo recomendado único para revisión e integración: **GPT-6.1 Sol, esfuerzo alto**; selector no cambiado, sin Astra ni agentes nuevos. No UI tocada; una futura pantalla mantiene exigencia de wireframes MARKSMAN.

## Validación, gobierno y rollback

Rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, worktrees/políticas revisados; D: explícito. Fuentes y cuatro pins previos verificables por hash, PDF de dos páginas inspeccionado, JSON parseable, diff check. Evidencia de consola es observación autenticada manual normalizada, **no export original firmado ni prueba API TRUCK**. No se archivaron auth URLs, códigos o claves. Las 177 pruebas del corte previo no se reejecutaron ni se presentan como prueba de esta investigación; código del motor/conector no cambiado.

Sin commit/push, despliegue, Auth, Neon, migraciones, usuarios, DB, infraestructura, negocio o IA de aplicación. Conservados cambios ajenos y expedientes previos. Rollback no ejecutado: retirar sólo este MD/JSON, sus dos párrafos de estado/plan y los seis originales nuevos si no tienen otras referencias; conservar pins anteriores, módulos/clientes/evidencia SAKBÉ y archivo privado. No hay cambio remoto que revertir. Renders PNG temporales se retiran al finalizar la revisión; PDF original conservado.
