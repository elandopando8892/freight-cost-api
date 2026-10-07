# B2 · Evidencia SAKBÉ enlazada al preflight D2D

## Entregable terminado

El caso **México, DF → Fort Smith, AR 72916 vía Nuevo Laredo/Laredo** ahora admite un adjunto de evidencia de ruta separado de sus inputs calculables. Se reutiliza el preflight existente: no hay otro motor, catálogo ni copia automática de observaciones a parámetros. El adjunto verifica por SHA-256 **caso + solicitud + detalle**, y la correspondencia de corredor, sentido, destinos, clase por ejes, fecha y filas.

Salida reproducida offline: [revisión del preflight enlazado](B2_D2D_LINKED_PREFLIGHT_REVIEW_2026-09-30.json). Manifiesto de enlace: [JSON](B2_D2D_SAKBE_ROUTE_LINK_2026-09-30.json). Investigación real antecedente: [validación SAKBÉ](B2_SAKBE_MX_LIVE_VALIDATION_2026-09-30.md).

**Terminó el enlace local de evidencia; no terminó la calibración ni el MVP.** Se mantienen B1/E1 abiertos, B2 parcial, cero adopciones y 0/4 gates de negocio. El adjunto no elimina los 41 faltantes originales ni cambia `readiness.lineage`. México conserva 125 claves requeridas y EE. UU. 124 para las tasas de tracto solamente; son obligaciones de evidencia, no valores incorporados ni el conteo de la unión canónica de otra configuración.

## Lo que ahora distingue la revisión

| Etapa | Sustento disponible | Falta concreta / campo que impide usarlo |
| --- | --- | --- |
| MX · detalle | 67 segmentos, 14 puntos de caseta; sumas observadas 1,124.576421 km / 709.882992 min ideales / MXN 4,770 | Resumen/geometría y conciliación; `mx.trip.loadedKm` sigue null |
| Ruta y equipo | Zócalo id 2656 → Puerto Fronterizo Nuevo Laredo III id 301105, cinco ejes, sólo investigación | Domicilio operativo, puente/acceso, equipo y restricciones; no sustituir los puntos nominales confirmados |
| MX · peajes | Importes por segmento y La Carbonera cero no verificado | Vigencia/movimiento/inclusiones/IVA/pago; `mx.trip.tollsUsd` sigue null, sin FX automático |
| Cruce e intercambio | Nombre del puerto como referencia, no tránsito ni cobro de puente probado | `borderCharges.CROSSING` e `INTERCHANGE` sin importe/evidencia compatible; no rellenar cero ni duplicar paquete |
| EE. UU. | Destino nominal confirmado: Laredo → Fort Smith, AR 72916 | Ruta para camión y peajes US; `us.trip.loadedKm` y `tollsUsd` siguen null |
| Ciclo físico | Ninguna duración operativa ni vacío adoptados | Vacíos, carga/descarga, descanso/esperas y remolque una vez por ciclo; minutos ideales no son `cycleDays` |
| Fecha/moneda | Recuperación mexicana fechada, observaciones MXN | Fecha del servicio y FX gobernado para inputs USD; fecha de recuperación no es vigencia tarifaria |

Son **siete paquetes de faltantes de ruta**, no siete nuevos sprints, no 48 parámetros pendientes ni una sustitución de los faltantes económicos de las 13 secciones. El reporte conserva las acciones y campos afectados, con cobertura MX `DETAIL_ONLY_NOT_OPERATIONAL`, frontera `UNVERIFIED`, US/ciclo `NO_EVIDENCE`. Cada valor del adjunto sigue `adoptionEligible:false` y `tripInputsChanged:false`.

## Implementación y reutilización

- `apps/api/src/modules/routing/d2d-route-evidence-link.ts`: revisión offline del adjunto; reutiliza esquema/clase de solicitud SAKBÉ y separa observaciones, aprobación y gaps. Recalcula las sumas desde las filas para comprobar integridad, no para cotizar. Rechaza pins alterados, documentos de otro caso, perfil/sentido distinto, secuencia/costos/geométricas inválidos, fechas futuras y promociones de aprobación.
- `apps/api/scripts/prepare-d2d-readiness-case.ts`: tercer argumento opcional de enlace; añade `readiness.supportingRouteEvidence`. Mantiene iguales los inputs, issues, bases nulas y costos nulos. Sin enlace conserva el comportamiento anterior, incluido el sentido inverso sin adjunto MX→US inapropiado.
- `apps/api/scripts/run-d2d-readiness-case.ts`: segundo archivo opcional, limitado a `docs/research`. Conserva bootstrap CLI con datasource deliberadamente inalcanzable antes del import legado. No cambia el entorno del API en ejecución, no carga el token ni llama al proveedor.
- `apps/api/tests/d2d-route-evidence-link.test.ts`: 27 pruebas nuevas; manipulan documentos en memoria para probar tanto integridad de hash como controles semánticos después de recalcular un pin. No modifican fuentes ni se promueven fixtures a bases.

Consulta de capacidades previa: existían preflight, manifiesto D2D, lector restringido y CLI hermético; **adaptados**. La API SAKBÉ y el cliente no se vuelven a consultar para este enlace offline. Se **rechaza** un nuevo calculador/importador o un fallback de ruta que declare vigencia. No UI ni endpoint SaaS añadidos: esta capacidad aún no está en una pantalla/persistencia autenticada. Cuando se construya esa pantalla debe acompañarse de wireframes y marca MARKSMAN.

## Reproducción y validación

Desde `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`, con Node configurado y `node_modules/tsx/dist/cli.mjs`:

```text
apps/api/scripts/run-d2d-readiness-case.ts docs/research/B2_D2D_READINESS_CASE_2026-09-30.json docs/research/B2_D2D_SAKBE_ROUTE_LINK_2026-09-30.json
```

Exit 2 del proceso Node es **INCOMPLETE esperado**, no crash ni aprobación. La revisión compacta archivada se generó con las mismas funciones, comparando antes/después y guardando `sameLineage:true`, `sameIssues:true`. No es una transcripción de todo el stdout del CLI; las fichas económicas originales siguen enlazadas por el manifiesto del caso y sus pins, sin duplicarlas.

Guía utilizada: **`engineering:testing-strategy`**; concentró el plan en integridad, aislamiento y no-adopción:

| Área | Tipo / comprobación | Resultado |
| --- | --- | --- |
| Adjuntos y linaje | Unitarias offline; hash, contexto, destinos/sentido/perfil, fechas, sumas/secuencia, propiedades estrictas | 27 pruebas nuevas PASS |
| Aprobación/cobertura | Unitarias; handoff nulo, summary/geometry nulos, cero no gratuito, cruce/US/ciclo separados | PASS, sin flags de promoción |
| CLI integrado | Proceso con datasource inválido, token vacío y sin IA; exit 2, 41 issues y ocho trip inputs null | PASS |
| Regresión | Adjuntos + SAKBÉ + ruta anterior + readiness + compositor | **177/177 en cinco archivos PASS** |
| Compilación | Typecheck API y CLI/preparador/test explícitos | PASS |
| Expediente anterior | Pins de caso, detalle SAKBÉ y SICT intactos; diff check | PASS |

Evidencia **local/offline** de este corte. El token/API real fue probado en el corte anterior, con captura `2026-09-30T17:18:33.152Z`; no se acredita una consulta externa nueva, resumen recuperado ni tarifas refrescadas hoy por el enlace. Sin llamadas de red, consultas DB, negocio o IA de aplicación. No suite general, sesión, permisos remotos, frontend, persistencia ni producción certificadas aquí.

SHA-256:

- Manifiesto de enlace: `7364257720572f9471beb4da250ca2cb2917821419c2cc742f9147099dcf2053`.
- Revisión compacta: `a9aa369e99d6e61887ca6126e277d680814d2dec72e5bef067fe024345eccb54`.
- Caso previo: `a897778d6f907b1041895f9bcace01cd91654cd2cb51dc9abc0570369024d28b`.
- Detalle SAKBÉ previo: `731cb21c1f7bfe2196ab90b12d56a91d4ebd4b1ef5b698ce73209341958b2970`.
- Itinerario SICT previo: `e883e06421e3042d82bc3eaac2d29ba30b3c257ae245ef1fcf6b71ef16c7bbfe`.

## Siguiente salida única y modelo

**Obtener el expediente del tramo Laredo → Fort Smith mediante una API compatible con camión comercial**, junto con cobertura/costo/cuota/restricciones y faltantes de cruce. Antes de implementar algo bespoke, revisar proveedores y conexiones existentes; no activar una API facturable, aceptar suscripciones, cargar datos privados ni crear credenciales sin autorización puntual. Si no hay acceso real utilizable, entregar la elección mínima y el bloqueo concreto, no kilómetros/peajes de automóvil rotulados como camión. No repetir el mismo timeout SAKBÉ ni otra ronda de FX aislada.

Esto acercará el caso completo al cálculo, pero sigue siendo necesario cerrar tasas/inputs económicos nacionales, responsabilidad del remolque y ciclo antes de obtener CFU/CVU y costo productivo. Compra y venta permanecen decisiones independientes; no se inventan para cerrar gates.

Modelo recomendado único para enlace de contratos y siguiente evaluación/integración: **GPT-6.1 Sol · esfuerzo alto**. No cambio automático de selector, Astra ni subagentes en este corte.

## Gobierno y rollback

Verificados antes de editar: rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, lista de worktrees y políticas aplicables; trabajo realizado en D:. Cambios ajenos y otros worktrees conservados. Sin commit/push, deploy, Auth, Neon, usuarios, migración o infraestructura; `.env.sakbe.local` no leído ni modificado por este enlace.

Rollback no ejecutado: retirar sólo el import/argumento/adjunto/next condicional de `prepare-d2d-readiness-case.ts` y el segundo argumento de `run-d2d-readiness-case.ts`; retirar módulo/test/manifiesto/revisión/documento nuevos y sus párrafos de estado/plan. Preservar los archivos previos completos, el cliente SAKBÉ, sus evidencias, la credencial privada y cambios ajenos. El uso previo del CLI con un argumento permanece disponible; no hay escritura remota que revertir.
