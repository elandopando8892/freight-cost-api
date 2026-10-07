# B2: fronteras de mantenimiento y compensación US

## Antes y ahora

Antes, el piloto usaba mantenimiento TTI0.212 USD/milla como componente parcial porque no acreditaba lubricación. Ahora [el compositor existente](../../apps/api/scripts/compose-public-pilot-cost.ts) admite `usMaintenanceBasis: "ATRI2024_ALL_RM_PLANNING"`: sustituye ese importe por una referencia histórica original de mantenimiento y conserva las veinte identidades económicas. La opción es explícita; ausencia o `TTI_UNRESOLVED_LUBE` mantiene el camino anterior sin cambios.

El objetivo permanece: costo completo D2D México DF–Fort Smith, caja seca53′, PuenteIII, relevo propio MX/US, caja y administración cargadas una vez. No se declara B2 terminado con un agregado o subtotal.

## Benchmark y elección

Alternativas revisadas: mantener TTI parcial; adaptar la referencia original ATRI como hipótesis pública completa de esa familia; reconstruir microprecios. Se elige la segunda como alternativa local explícita. Se rechaza la tercera: no hace falta inventar aceite/filtros para estimar la familia. No se cambia arquitectura, infraestructura ni método de asignación.

ATRI2025, Table8, impresa15/física18: R&M2024=0.198 USD/milla. El formulario Q3, impresa57/física60, pide mantenimiento/reparación de tractores y remolques, incluidos trabajo y reparación en carretera; separa llantas. **No nombra explícitamente lubricantes**. Incluir lubricación rutinaria en el agregado es una inferencia de planeación declarada, no un desglose medido ni prueba de cómo clasificó cada participante.

Se aplica `km_US_adheridos / 1.609344 × 0.198`. Reemplaza TTI, no se suma a él. No añade aceite, desgaste de caja, llantas ni DEF nuevamente. Llantas conserva su referencia anterior y DEF sigue separado. Es una transferencia entre poblaciones/períodos, no un conjunto observado para Cascadia usada/caja53′ ni una actualización por inflación a2026. No se certifica precio actual, cobertura fiscal homogénea o límite conservador.

El [expediente nuevo](B2_US_MAINTENANCE_PLANNING_2026-10-03.json) queda fijado por SHA256 `0eab0a22dbf81f074080f305ae44afbe9a1c14f106b920e2544c9e4c637306a1`. El runtime verifica ese documento y el PDF original `581b91b68a76f232102a63f543eff92bb59c9478556b164d84d2be85118902f8`. La salida añade un pin,80 frente a79; no altera los históricos.

## Compensación: costo realmente pendiente

El formulario Q5-Q6, impresa58/física61, excluye incentivos/bonos del agregado de salarios/prestaciones; per diem está dentro de beneficios. Table17, impresa26/física29, reporta promedios anuales por receptor2024: seguridad1680, incorporación2122, retención1832 y recomendación1738 USD. Se registran como observaciones, **no se suman como paquete ni se multiplican por prevalencia de carriers para inventar elegibilidad del piloto**. Falta la hipótesis de plantilla/eligibilidad/exposición y la frontera fija-variable adecuada; no se cargan a CVU arbitrariamente.

La [Publicación15 del IRS2026](https://www.irs.gov/publications/p15), secciones9/14, confirma cargas patronales y condiciones/topes de crédito FUTA. Esto no demuestra si el agregado ATRI ya contiene cada impuesto. No se aplica un porcentaje general a salarios+beneficios ni se da por acreditada la carga patronal. Consulta TWC directa devolvió contenido insuficiente; no se adopta una tasa estatal desde ella. Revisión pública sin credenciales o llamadas facturables.

## Lectura real, no total completo

Hipótesis previas conservadas: contadoNET_PLUS_VAT, cajaPUBLIC_GUIDE_LOW, patioNET_PLUS_VAT_RESERVE, descanso excluido de tarifa, DEF4%, aproximación fronteriza pública y bobtailIMT_C3. La nueva opción cambia sólo mantenimiento US.

| Escenario | Mantenimiento US | Variación frente a TTI | Componentes variables conocidos | Suma de componentes conocidos |
| --- | ---: | ---: | ---: | ---: |
| Vacío esperado de red | 157.388461954757 | -11.128477107913 | 3577.879837225878 | 4562.351292749036 |
| Retorno vacío dedicado | 290.822400000000 | -20.563200000000 | 6787.963379236404 | 9030.407149808703 |

USD; ninguna columna es costo completo, tarifa, venta ni límite inferior certificado. CFU conocido permanece984.4714555231577/2242.4437705723003; caja/administración no cambian. El origen usa seis conceptos variables parciales; el escenario explícito usa cinco. Permanecen tres sin importe y seis remanentes fijos. `cfuUsd`, `cvuUsd`, `productiveCostUsd` completos siguen null; `quoteReady=false`, `calibrated=false`, cero adopciones.

La matriz de135 claves sigue siendo la conciliación histórica/canónica, no se sobrescribe con esta alternativa ni se presenta cada microclave como calibrada. Flujo local: elegir hipótesis → leer documentos fijados → sustituir una familia → aplicar ambos ciclos → verificar diferencias y pendientes. No cambia UI; no corresponde un wireframe nuevo.

## Verificación y siguiente trabajo económico

Último código: **72 pruebas PASS/cuatro archivos**,21piloto (siete nuevas),21compositor,18matriz,12presupuesto;5.46s reportados. Sustitución/delta, ambos ciclos, financiación/DEF/descanso, fuentes/hash adulterados, camino anterior intacto, no mutación y ningún cierre falso de operador. Typecheck estricto dirigido PASS. CLI real sin DATABASE_URL/STAGING_DATABASE_URL: salida2 esperada,80pins,20conceptos/ciclo, cinco parciales/tres sin importe, números anteriores. PDF de tabla, alcance y bonos renderizado e inspeccionado, sin editar la fuente.

No se prueba aceptación de un carrier, fecha real, sesión, persistencia, despliegue o producción. No código/calibración de microinputs ni operación de negocio. B2 permanece activo: sigue conciliar compensación/viáticos con exposición y remuneración fija-variable, cerrar la canasta fija y cargos agregados del viaje, luego obtener el costo completo. No abrir investigaciones de casetas.

## Ejecutor y recuperación

Codex único escritor/integrador/verificador, elección registrada gpt-6.1-sol/high del2oct16:46:22UTC. Principal efectivamente servido desconocido; no selector cambiado. Claude viable no elegido; Fable no aporta los datos faltantes y no se invoca. Skills PDF/trazabilidad/pruebas provocan revisión visual de fuente, pin/lease y pruebas económicas, no nuevas herramientas.

Cuota automática3oct04:26:34UTC: CodexPro uso permitido, semanal17% usado/10080min, resetUnix1791580450;5h, Claude/Fable y consumo/cargos atribuibles desconocidos. No pago activado, porcentaje de reserva ni conversión de créditos a dinero inventados. Global240h autorizado; contrato80pasos/contexto6500bytes, cero retries de proveedor, dos reparaciones diagnosticadas antes de reevaluar (ninguna necesaria en código), sin deadline nuevo. Lectura fallida de nombre local inexistente registrada, sin consumo declarado cero.

Registro `us-economic-aggregate-coverage.json`, sprint `b2-closure-240h-20261002`, lease `4ccbd6b518184bdfad84f866868e4c0b`; cierre con pruebas observadas y modelo desconocido. Su limitación de recibo de modelo no bloquea el objetivo.

Checkout físicoD:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD4f5fc2de0c3d178dace917231e1092040dec21fd, revalidados. Sin DB/Auth/Neon/usuarios/infraestructura/despliegue/ramas/PR/commit/push. Cambios previos preservados.

Rollback: revertir sólo nuevos hunks de opción/lector/sustitución/test y retirar estos dos archivos nuevos si no tienen cambios posteriores. No restaurar compositor/test enteros: ya tenían trabajo anterior no versionado. SHA previo del compositor `b928712758882a97405982073998638119d494b4e9306e3c593d847e5fd7b857`, test `4dfe2a67677c92a63ae88503c879b0a059dadb2e098a5c1fff3aa859763c254f`. Fuentes y matriz intactas; sin rollback externo.
