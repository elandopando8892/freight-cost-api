# B2 · Acceso real SAKBÉ y detalle mexicano del corredor

## Resultado y alcance

Token propio aceptado en dos búsquedas y en `detalle_o`. **67 segmentos reales**, 14 puntos de caseta (13 con importe positivo y uno con cero), suma de filas **1,124.5764209526735 km, 709.8829924923754 minutos ideales y MXN 4,770**. No son una tarifa vigente certificada, un ciclo operativo ni el recorrido completo hasta Fort Smith. No hubo llamada al motor de precios ni adopción de inputs.

Consulta aceptada: **2026-09-30T17:18:33.152Z** (11:18:33 en Ciudad de México). Evidencia normalizada completa, con las 67 instrucciones y puntos de peaje: [JSON](B2_SAKBE_MX_LIVE_DETAIL_2026-09-30.json). Crédito: **INEGI — API de Ruteo SAKBÉ**, [documentación oficial](https://www.inegi.org.mx/servicios/Ruteo/Default.html). La documentación advierte que tarifas pueden diferir de las reales y que el tiempo omite tráfico/paradas; no acredita restricciones físicas del equipo de este caso. No se consultó su feed de combustible ni se sustituyó FUEL.

Worktree `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`; políticas aplicables, Git y worktrees verificados antes de editar. Trabajos ajenos conservados. Archivo del token excluido de Git y nunca impreso ni incluido en estos artefactos.

## Destinos realmente devueltos y selección sólo de investigación

- `Mexico, DF`, búsqueda aceptada a 17:06:55.082Z: diez candidatos. Zócalo/Plaza de la Constitución id **2656**, coordenadas `[-99.133203,19.432629]`; Ciudad de México id 310696 comparte coordenadas. No se eligió el primer resultado (aeropuerto).
- `Nuevo Laredo`, búsqueda aceptada a 17:11:27.499Z: diez candidatos, incluidos homónimos en otros estados. Puerto Fronterizo Nuevo Laredo III id **301105**, Tamps., `[-99.547021504,27.593265781]`. No se usó id 192383 del centro de la ciudad como si fuera el puente.
- Se eligió **2656 → 301105 / óptima / cinco ejes / cero excedentes / v=8**, sólo para contrastar el escenario público SICT Zócalo/Puente III ya documentado. No son domicilios privados, puente autorizado por el usuario ni configuración de equipo confirmada. El corredor nominal del usuario sigue siendo México, DF → Fort Smith, AR 72916 vía Nuevo Laredo/Laredo.
- [Solicitud óptima](B2_SAKBE_MX_COMPARISON_REQUEST_2026-09-30.json) independiente del borrador original, que mantiene IDs nulos. [Solicitud cuota](B2_SAKBE_MX_CUOTA_REQUEST_2026-09-30.json) sólo registra la alternativa ensayada; no tuvo resultado combinado aceptado ni fue seleccionada para operaciones.

Estas dos entradas de búsqueda son extractos de consultas observadas, no archivos de respuesta completos. El JSON de detalle sí conserva toda la salida normalizada aceptada. No se archivaron cuerpos brutos con propiedades arbitrarias.

## Diagnóstico, corrección y límite explícito

**Esperado:** `--route` obtiene resumen y detalle del mismo modo/perfil, compara ambas fuentes y conserva handoff nulo.

**Observado:** consulta combinada óptima termina con `TRANSPORT_ERROR` bajo el timeout original de 15 s. Diagnóstico secuencial de sólo lectura: `optima` agotó **45,148 ms**, sin respuesta aceptada; `detalle_o` devolvió **HTTP 200 / success=true / 67 filas en 484 ms**. La alternativa combinada cuota tampoco completó con el límite de 15 s; esa salida no identifica cuál de sus dos requests falló. Esto descarta falta de acceso como causa del detalle exitoso, pero **no permite atribuir la causa interna del timeout a INEGI, red o tamaño de geometría**.

**Corrección local:** timeout ahora produce `REQUEST_TIMEOUT`, sin texto/cause secreto. Se reutilizó el mismo normalizador validado de detalle en `detailCandidate` y el comando explícito `--detail=`. No hay reintento automático, aumento del límite normal, fallback oculto, cambio de proveedor ni debilitamiento de validación. `--route` sigue fallando cuando no obtiene ambas respuestas; el detalle parcial tiene otro tipo de artefacto, `summary:null`, `geometry:null`, suma de filas independiente y `SUMMARY_DETAIL_RECONCILIATION_PENDING`. La consulta explícita aceptada usó nuevamente `detalle_o`, esta vez atravesando el cliente real y sus validadores.

No se insiste en el mismo timeout. El servicio de resumen queda pendiente; el detalle sirve como expediente parcial y no obliga a volver a capturar 67 filas manualmente. Los ceros, ejes adicionales sin cobertura, puntos ausentes, moneda y ausencia de vigencia siguen expuestos.

Reproducción local (Node configurado + `node_modules/tsx/dist/cli.mjs`, desde el worktree):

```text
apps/api/scripts/query-sakbe-route.ts --detail=docs/research/B2_SAKBE_MX_COMPARISON_REQUEST_2026-09-30.json
```

Exit **2** del proceso Node significa evidencia `INCOMPLETE`, no crash ni costo aprobado; el envoltorio PowerShell observado lo reporta como exit 1. El detalle se consulta con POST y token privado sólo en cuerpo al origen HTTPS fijo. Nada de secretos en navegador/URL/repositorio. No se ejecutó otra consulta combinada después de cambiar la clasificación del timeout.

## Comparación: no son itinerarios idénticos

| Observación | SICT candidato anterior | SAKBÉ detalle óptima |
| --- | --- | --- |
| Distancia | Pantalla 1,119.170 km; filas 1,119.163 km | Filas 1,124.576421 km; resumen pendiente |
| Tiempo | Pantalla 668 min; filas 652 min | Filas 709.882992 min ideales; no ciclo |
| Peajes | MXN 2,770 / 12 plazas transcritas | MXN 4,770 / 14 puntos de caseta |
| Cobro Puente III | MXN 144, sin vigencia confirmada | No aparece como plaza cobrada; **cobertura no acreditada** |

Diferencia nominal de peajes **MXN 2,000**, no un incremento homogéneo de tarifas: hay tramos/plazas y cobertura distintos. No sumar plazas SICT a las SAKBÉ para completar el recorrido.

| Caseta indicada por detalle SAKBÉ | MXN observado | Contraste y límite |
| --- | ---: | --- |
| México - Pachuca | 137 | No figuraba en el itinerario SICT anterior; diferencia de acceso |
| Tultepec | 454 | SICT 112; coincide numéricamente con una variante CEM, movimiento aún por confirmar |
| Jorobas | 642 | SICT separaba 245 CM y 278 CAPUFE; CEM publica 642 Carga 5. No agregar 278 automáticamente |
| Palmillas (5) | 482 | Coincide con CAPUFE C5 del expediente previo; confirmar movimiento |
| Chichimequillas | 121 | Coincide con CAPUFE C5 del expediente previo; confirmar movimiento |
| San Nicolás de los Jassos | 299 | Coincide con SICT, no prueba independiente de vigencia |
| Ventura - El Peyote | 328 | Plaza adicional frente a la transcripción SICT |
| Matehuala | 144 | SICT 125; tarifa contemporánea pendiente de fuente del operador |
| Los Chorros | 306 | Hay observación CAPUFE del corredor; no igualar plazas/movimientos por monto |
| La Carbonera | 0 | Punto de caseta con cero: no demostrar gratuidad ni duplicar Los Chorros |
| Periférico | 338 | Plaza adicional; movimiento y vigencia pendientes |
| Caseta Lincoln | 595 | SICT 0; coincide con tarifa REANL Camiones 5/6 principal. Movimiento pendiente |
| Sabinas | 658 | Coincide con SICT, no prueba independiente de vigencia |
| Entronque Ex-Garita | 266 | Plaza adicional; inclusiones/movimiento pendientes |

Fuentes de contraste **ya archivadas**: CAPUFE, CEM y REANL en [expediente anterior](B2_D2D_ROUTE_ITINERARY_EVIDENCE_2026-09-30.md); no se afirma que fueron refrescadas nuevamente en este corte. Geometrías de caseta no sustituyen la línea completa de ruta.

Las últimas instrucciones transitan por Libramiento Nuevo Laredo II / Carretera Puente Internacional Laredo III e incluyen un retorno antes de llegar al destino. No se ha demostrado atravesar el puente hacia EE. UU.; no se infiere cruce gratuito ni se sustituye el cargo de intercambio. Falta verificar maniobras/acceso comercial del tractocamión, el límite físico MX/US y luego el tramo Laredo → Fort Smith.

## Integridad, pruebas y salida de negocio

Hashes SHA-256:

- Detalle nuevo: `731cb21c1f7bfe2196ab90b12d56a91d4ebd4b1ef5b698ce73209341958b2970`.
- Solicitud óptima: `0070b004c76c07fbe6eb2d0b7c68dd492885eee44bcdab3e5393bb4c2f932f74`.
- Solicitud cuota: `39994fc6d560af68555d19a11be5641c2c9897d883abc0928375033bbfb0697b`.
- Caso D2D anterior intacto: `a897778d6f907b1041895f9bcace01cd91654cd2cb51dc9abc0570369024d28b`.
- JSON SICT anterior intacto en este corte: `e883e06421e3042d82bc3eaac2d29ba30b3c257ae245ef1fcf6b71ef16c7bbfe`.

La guía `engineering:debug` separó búsqueda, resumen y detalle; `engineering:testing-strategy` priorizó integridad/secretos antes de reutilizar la evidencia. Plan y resultado:

- Unidad sintética: tres modos de detalle, una sola petición, perfil idéntico, resumen/geometría nulos, handoff nulo, cero/plaza sin ubicación/ejes faltantes, inputs/costos/geometrías inválidos, secreto ecoado y timeout distinguido. **44 tests SAKBÉ, siete nuevos**.
- Integración CLI sintética: token de entorno explícitamente vacío no usa la credencial humana; missing-token independiente de DB, exit 2. Sin red en la suite.
- Regresión de ruta/readiness/compositor: **150/150 tests en cuatro archivos PASS**, typecheck API y script/test PASS; sin consultas de DB ni cálculo con parámetros reales. Diff check PASS. Suite general, frontend y aceptación autenticada no certificados por este corte.
- Live: búsquedas y detalle aceptados por el proveedor con token real. Resumen/linea completa pendientes por timeout observado; sin prueba de login/persistencia del SaaS.

**B1/E1 abiertos, B2 parcial, cero adopciones y 0/4 gates de negocio.** No se alimentan las bases con 4,770 ni se obtienen CFU/CVU del detalle. Los cuatro inputs de handoff siguen null (`loadedKm`, `emptyKm`, `cycleDays`, `tollsUsd`).

Siguiente corte único: **enlazar este expediente parcial al preflight D2D como evidencia consultable**, con rechazo de adopción de datos incompletos y faltantes de cruce/US/ciclo individualizados. Después completar el recorrido US con proveedor evaluado; no activar HERE/Google facturables sin revisión de cuenta/cuota/costo y autorización puntual. No volver a una captura manual genérica ni perseguir el mismo timeout como criterio de cierre económico. Si se toca UI, wireframes MARKSMAN antes de implementación. Modelo recomendado único para diagnóstico, integración y validación: **GPT-6.1 Sol · esfuerzo alto**; no selector cambiado ni agentes.

## Rollback

No ejecutado. Retirar únicamente `detailCandidate`/helpers compartidos/`REQUEST_TIMEOUT` y sus cambios focalizados de CLI/tests de este corte; recuperar el comportamiento anterior de ruta/respuesta de timeout, conservando cliente previo. Retirar los dos requests comparativos, evidencia nueva y este informe/párrafos de estado/plan si se descarta la investigación. Preservar `.env.sakbe.local`, borrador anterior, expediente SICT, caso D2D y cambios ajenos. Sin commit/push, despliegue, migración, cambios Auth/Neon/usuarios/infraestructura, proveedor facturable, operación de negocio ni IA de aplicación; no hay escritura remota que revertir.
