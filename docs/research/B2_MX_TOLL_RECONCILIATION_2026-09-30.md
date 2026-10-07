# B2 · Conciliación documental de peajes MX

Fecha: 2026-09-30. Trabajo local en D:, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. Se conservan los cambios ajenos. Sin commit, publicación ni despliegue.

## Resultado de negocio

Los **14 puntos de peaje** del detalle SAKBÉ existente están relacionados con un expediente verificable: **9 coincidencias numéricas** (6 con fecha publicada y 3 sin ella), **4 sin tarifa primaria aplicable recuperada** y **1 cero sin sustento**. Esto cierra la cobertura documental de esta lista, **no la aprobación del importe ni la calibración de la base**. Hay **0 puntos aprobados**, total aprobado `null` y ninguna adopción en el motor.

El caso solicitado es México, DF → Fort Smith, AR 72916, vía Nuevo Laredo/Laredo. El detalle de investigación usa Zócalo → Puerto Fronterizo Nuevo Laredo III y cinco ejes; esos domicilios, puente y equipo **no están confirmados por el usuario**. Tampoco hay fecha de servicio confirmada. No se certifica ruta apta para camión a partir de Google DRIVE.

## Revisión previa y decisión

Se reutilizó el expediente de ruta y el preflight existentes, en vez de reconstruirlos. Para esta capacidad se contrastaron tres opciones:

| Opción | Ajuste y límites | Decisión |
| --- | --- | --- |
| Anexo de fuentes primarias conectado al preflight existente | Conserva metodología, trazabilidad y bloqueos; exige confirmar clase, movimiento y vigencia. Sin nuevo proveedor o infraestructura. | Adoptar para este corte. |
| Adoptar automáticamente importes SAKBÉ o estimaciones de Google DRIVE | Un resultado numérico no prueba tarifa de camión, acceso concreto, fecha ni ausencia de doble conteo. | No adoptar. |
| Incorporar otro proveedor especializado de rutas para camión | Requeriría evaluar cobertura, licencia, costo e integración; no resuelve por sí solo la evidencia económica de cada movimiento. | Diferir; sin activación ni cargos. |

La consulta pública fue acotada. No se repitieron llamadas SAKBÉ/Google, no se restablecieron cupos y no se contrató ningún servicio. El flujo sigue siendo expediente de ruta → revisión documental → preflight bloqueado hasta completar evidencias → futura aprobación explícita; no se añadió UI ni cambió la dirección visual/wireframes existentes.

## Inventario conciliado

Las cifras observadas pertenecen al detalle histórico de investigación. Una coincidencia no selecciona automáticamente la alternativa correcta.

| Índice del segmento | Punto SAKBÉ | Observado MXN | Resultado documental |
| --- | --- | ---: | --- |
| 11 | México-Pachuca | 137 | Sin tarifa primaria aplicable recuperada para cinco ejes. |
| 14 | Tultepec | 454 | CEM: coincidencia sin fecha propia publicada; hay movimientos alternativos. |
| 16 | Jorobas | 642 | CEM: coincidencia fechada; confirmar acceso/salida, no añadir otra cobertura CAPUFE. |
| 19 | Palmillas (5) | 482 | CAPUFE: coincidencia fechada; no sumar agregado y plaza. |
| 23 | Chichimequillas | 121 | CAPUFE: coincidencia fechada; revisar cobertura del libramiento. |
| 29 | San Nicolás de los Jassos | 299 | SICT: coincidencia fechada del libramiento, identidad/movimiento por confirmar. Sin original local. |
| 32 | Ventura-El Peyote | 328 | Sin tarifa primaria contemporánea recuperada; no extrapolar 2025. |
| 36 | Matehuala | 144 | Sin documento primario verificado; descarga directa PASE fallida. |
| 40 | Los Chorros | 306 | CAPUFE: coincidencia fechada del tramo; no sumar intermedio y completo. |
| 43 | La Carbonera | 0 | Cero no respaldado; una celda vacía de otra plaza no prueba gratuidad. |
| 50 | Periférico | 338 | Operador/plaza/movimiento no identificados unívocamente. |
| 53 | Caseta Lincoln | 595 | REANL: coincidencia fechada para camiones; Principal/Auxiliar/Entronque son alternativas. |
| 57 | Sabinas | 658 | MRO: coincidencia sin fecha publicada; importe depende del movimiento. |
| 59 | Entronque Ex-Garita | 266 | VIAPASS: contraste numérico sin fecha; no prueba identidad con Caseta Monterrey. |

Los Chorros y La Carbonera comparten una advertencia de cobertura: **no se ha probado que sean cargos duplicados**. Ninguna alternativa se suma automáticamente. Las seis fechas documentadas no prueban aplicabilidad a un servicio cuya fecha todavía falta.

## Fuentes y calidad de la evidencia

- [CAPUFE, tarifas 2026](https://iave.capufe.gob.mx/assets/Doc/Tarifas-vigentes-2026.pdf): original local conservado; columnas C5 e IVA revisadas visualmente en páginas 1 y 4. Vigencia publicada 13 de abril de 2026.
- [CEM, rutas y tarifas](https://www.circuitoexterior.mx/rutas-y-tarifas/): archivo existente y lectura actual; fecha 22 de marzo de 2026 limitada a tabla T0, no atribuida a T1.
- [REANL, tarifas](https://reanl.com.mx/nosotros/tarifas/): archivo existente y lectura actual; camiones cinco/seis ejes, vigencia 8 de febrero de 2026. Tratamiento fiscal no certificado.
- [MRO, operador](https://www.mronoreste.mx/): nuevo original HTML archivado; sección Sabinas distingue MTY-La Gloria de SAB-La Gloria. Fecha, impuestos y medio de pago pendientes.
- [VIAPASS, tarifas](https://www.viapass.com.mx/Portal_web/tarifas): nuevo original HTML archivado; fuente de medio de pago, no sustituto de confirmación del operador/plaza.
- [SICT, Libramiento Oriente SLP](https://app.sct.gob.mx/sibuac_internet/ControllerUI?action=CmdTarifaRep1&radioSel=1&selectVia=43): lector web público, C5 con IVA y fecha 13 de abril de 2026. GET independiente agotó tiempo; se declara `WEB_READER_UNARCHIVED`, sin archivo ni hash inventados.

PASE indexado, fuentes secundarias y tarifas históricas no se adoptaron como importes actuales. Las transcripciones requieren revisión semántica contra la fuente: **un SHA verifica integridad de bytes, no demuestra por sí solo que la lectura sea correcta**. Este corte no garantiza que las tarifas sigan iguales después de la consulta.

## Entregable conectado y criterios de cierre

El manifiesto `B2_MX_TOLL_RECONCILIATION_2026-09-30.json` incorpora fuentes, movimientos alternativos, clase, fecha, tratamiento fiscal, cobertura y faltantes. El módulo `apps/api/src/modules/routing/mx-toll-reconciliation.ts` valida ese anexo y lo añade como `readiness.supportingMxTollEvidence` mediante un tercer argumento opcional del CLI. Los flujos anteriores de uno y dos argumentos permanecen disponibles.

Se comprueba integridad binaria de archivos, pin del caso y enlace de ruta, cobertura completa y orden de los 14 puntos, identidad de observaciones, referencias de fuentes, fechas y prohibición de adoptar/pagar. Los totales aprobados y el handoff económico siguen en `null`; no se invoca compositor ni persistencia.

Criterios de este corte cumplidos: 14 puntos clasificados, límites explícitos por fuente, anexo ligado al mismo caso, compatibilidad previa y ejecución local sin efectos externos. **B2 sigue parcial: 0 de 4 gates de negocio, 0 adopciones.**

## Validación y alcance real

- **71/71 pruebas dirigidas PASS**: 18 nuevas de conciliación, 27 del enlace de ruta y 26 de readiness D2D. Incluyen corrupción de hashes, omisión del cero, alteración de observaciones, fechas inválidas/futuras, duplicados y rechazo de promociones/importes pagables.
- Typecheck estricto de CLI, preparador y nueva suite (dependencias transitivas incluidas): PASS. `git diff --check`: PASS.
- Ejecución integrada del CLI con archivos reales archivados: salida esperada **2 / `INCOMPLETE`**, **41 faltantes económicos intactos**, `compositorInvoked=false`, `costs=null`, 14 puntos, 6 coincidencias fechadas, 3 sin fecha, 0 aprobados y total aprobado `null`.
- Comparación de preflight anterior y con anexo: mismos issues y lineage. Las mutaciones adversariales de las pruebas son simuladas; las fuentes públicas y archivos base son documentales reales. No es prueba autenticada de cotización, persistencia ni aceptación SaaS.
- Sin nuevo login, cambio de Auth, SQL, bases de datos, usuarios, migración, operación de negocio, llamada de mapas/rutas, consumo de IA de aplicación, build completo o deploy. No hubo cambio UI que justificara repetir pruebas visuales.

Reproducción local, desde la raíz física del repositorio con el runtime Node configurado:

```text
node node_modules/tsx/dist/cli.mjs apps/api/scripts/run-d2d-readiness-case.ts docs/research/B2_D2D_READINESS_CASE_2026-09-30.json docs/research/B2_D2D_SAKBE_ROUTE_LINK_2026-09-30.json docs/research/B2_MX_TOLL_RECONCILIATION_2026-09-30.json
```

El CLI usa configuración hermética no utilizable para servicios externos. El código de salida 2 significa expediente incompleto, no error a reparar llenando valores ficticios.

## Integridad y recuperación

| Archivo | SHA256 |
| --- | --- |
| Manifiesto de conciliación | `4c6e3f761068861f5becdf82795d4a7aa825d58fea5c603942f643ca60f30f3a` |
| Enlace de ruta existente | `7364257720572f9471beb4da250ca2cb2917821419c2cc742f9147099dcf2053` |
| Caso existente | `a897778d6f907b1041895f9bcace01cd91654cd2cb51dc9abc0570369024d28b` |
| Detalle SAKBÉ existente | `731cb21c1f7bfe2196ab90b12d56a91d4ebd4b1ef5b698ce73209341958b2970` |
| Nuevo HTML MRO | `78e1cac105159ac8a8d3150ef519792186487edd08ff62dcf9a0d60e42a7f66f` |
| Nuevo HTML VIAPASS | `ad77c970c7bd9fe2dba3eeb387dbb18e3f1b66055bb95cf6f69f78052c5c2368` |

Rollback de este corte: retirar únicamente el import/argumentos opcionales del preparador, tercer argumento/lector binario del CLI, nuevo módulo, nueva prueba, manifiesto, este recibo, nota superior de estado y los dos nuevos HTML de revisión. Revisar diff por hunk; **no restaurar archivos completos ni eliminar cambios ajenos**. Conservar caso/enlace/SAKBÉ, archivos primarios anteriores, credencial cifrada y marcas de presupuesto Google. No existe cambio remoto que revertir. Los renders temporales del PDF pueden retirarse sin tocar el original.

## Siguiente resultado, modelo y límites

Siguiente corte de negocio: resolver México-Pachuca, Ventura-El Peyote, Matehuala, Periférico y el cero de La Carbonera con fuente primaria aplicable; confirmar acceso/salida de las coincidencias y equipo/fecha/domicilios/puente del caso. Después cerrar cruce/intercambio, distancias aptas y ciclo, junto con los faltantes económicos antes de CFU/CVU. Resolver casetas por sí solo no cierra B2 ni el MVP.

Modelo recomendado: **GPT-6.1 Sol alto** para metodología e integridad; **medio** para extracción guiada, QA y cierre documental. No se invocó Astra ni agentes paralelos. No se puede cambiar el selector ni medir tokens/costo desde esta ejecución; no se afirma ahorro cuantificado. Las skills PDF y testing-strategy orientaron la lectura visual de columnas y las pruebas acotadas contra adopción indebida.
