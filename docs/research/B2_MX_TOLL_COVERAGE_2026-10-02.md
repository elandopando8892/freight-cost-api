# B2 · Cobertura de Jorobas y Carbonera, sin duplicar peajes

2oct2026. D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; rama codex/cost-tires-release-s14, HEAD4f5fc2de0c3d178dace917231e1092040dec21fd revalidado. Cambios locales únicamente, archivos ajenos conservados; ninguna operación externa, migración, Auth, infraestructura o publicación.

## Resultado y benchmark previo

Antes: el costo parcial4751MXN tenía una duda de cobertura adicional en Jorobas; Carbonera carecía de correspondencia oficial inequívoca. Ahora el consolidado incluye `supportingMxTollCoverage`: T0 se trata como referencia conjunta sin otro cargo automático; Carbonera/OjoCaliente se relaciona por coordenadas oficiales y no se sustituye por LosChorros. Los importes previos no cambian. No se declara el costo íntegro, cobertura vial completa o exención.

Comparación proporcional, antes de implementar:

- **Adaptar/reutilizar operador+CAPEFE+SICT:** [términos CEM](https://www.circuitoexterior.mx/wp-content/uploads/2026/03/VFO-TyCos-De-Regreso-con-Descuento.docx.pdf), cláusula3b/página2, explican que el monto T0 comparte una parte con CAPUFE por México–Querétaro. [Tabla CEM](https://www.circuitoexterior.mx/rutas-y-tarifas/) ya archivada da642C5 desde22mar2026; [CAPUFE2026](https://iave.capufe.gob.mx/assets/Doc/Tarifas-vigentes-2026.pdf) da278C5 para Jorobas(CEM). Recomendación: conservar642 una vez, no sumar278 sin acreditar otro movimiento independiente. No afirmar que la fuente publica el desgloseC5=364+278. La promoción no se aplica: el piloto es carga/flota y no acredita requisitos. Sin nuevas APIs/dependencias o costos recurrentes.
- **Rechazar suma de tablas sin tramos:** agregar642+278, tarifa completaMéxico–Querétaro999 o PalmillasBIS sobre Palmillas duplica potencialmente cobertura. La referencia conjunta no acredita entradas/salidas, sentido, impuestos CEM ni movimiento real de camión.
- **Rechazar completar Carbonera con306 o cero histórico:** [SICT Datos Viales2025](https://micrs.sct.gob.mx/images/DireccionesGrales/DGST/Datos_Viales_2025/33_DV2025_PlazasCobro2025.pdf), páginaPDF94/impresa1404, plaza159, identifica LaCarbonera(OjoCaliente), km12.360, MEX057D, [-100.868249,25.510948]. SAKBE punto43 está a7.114793m. LosChorros es plaza158 y movimiento diferente; sus306 ya están contados. El documento describe tráfico2024 estimado a partir de registros enero–agosto y variación estacional, no tarifas actuales ni aprobación de ruta.

La capacidad necesaria es estándar: conciliación de movimiento y fuente, no otro motor de rutas o algoritmo de precios. Se reutilizan los puntos y la economía existente. No hay cambio de UI; no corresponde fabricar un wireframe para una revisión de evidencia sin pantalla nueva.

## Evidencia histórica frente a vigente

[CAPUFE septiembre2024](https://pot.capufe.mx/gobmx/Transparencia/Doc/TransparenciaF/Tarifas/Vigentes/2024/Tarifas-Vigentes-2024.pdf), página1, FONADIN conIVA, OjoCaliente, muestra **0 numérico** C2–C9 con vigencia15nov2023. La publicación2026, página1, efectiva13abr2026, deja esas celdas **en blanco**. Se inspeccionaron visualmente encabezados/columnas/filas en ambos PDF. Blanco no equivale a0 y el cero observado de SAKBE no demuestra exención vigente. El dato actual permanece null; no se adopta el histórico ni se convierte ausencia en gasto cero.

Tres originales nuevos archivados sin modificación y SHA256 en política; reutilizados CAPUFE2026/CEMHTML también verificados. El PDF inicialmente indexado VF-TyCos respondió404; se obtuvo el VFO vigente accesible del mismo operador. La publicación de velocidades SICT excedió el lector web; se utilizó la publicación oficial específica de plazas, descargada y revisada. Fallos de acceso no se registran como evidencia de contenido completo.

## Flujo y criterios de cierre de este corte

Política fechada → hashes de originales → puntos SAKBE y selecciones previas → revisión de cobertura → consolidado. Valida claseC5, identidad, coordenadas,13selecciones únicas y suma4751, origen4770, cargoT0 único, Carbonera no valorizada, no descuento/desglose inventado. Fuente histórica no promueve tarifa vigente. Revisión no altera ninguna de las272comparaciones contado/financiado, CFU/CVU, caja ni administración. El campo previo `additionalJorobasCoverageMxn:null` se conserva como estado histórico de aquel cálculo; la nueva revisión evita interpretarlo como autorización para añadir otro278. Sigue pendiente confirmar los movimientos elegidos.

Pruebas finales: **272PASS/4archivos** (cobertura12, peajes17, consolidación233, patio10), TSCestricto/noEmit ESNext+Bundler PASS, readback74pins,4770/4751 preservados, Carbonera7.114793m/currentnull, seis outputs completos null. Pruebas de inmutabilidad, duplicación, punto sustituido, NaN, cargo añadido, promoción, histórico adoptado, corrupción de política/originales y regresión monetaria. No validación autenticada, carretera recorrida, facturas, HOS o producción. Primer TSC con NodeNext falló por modoCommonJS de scripts import.meta; se corrigió la invocación al patrónESM, no se cambió arquitectura/código para ocultarlo. Primera tanda260PASS y segunda271PASS; última272 después de reforzar geometría y subtotal.

## Pendiente y continuación B2

Este corte cierra el riesgo de **suma automática** en la referenciaT0 y la **identidad** de Carbonera, no sus movimientos reales/tarifa vigente. Quedan CarboneraC5 actual, trayectos MXbobtail de acceso al relevo, carreterasUS/retorno, servicios de intercambio, RCcomercial fronteriza y alcance de mercancía, además del resto de gastos aún no valorizados. Próximo trabajo: cuantificar aproximaciones y cruces por escenario sin adjudicar patio, ruta legal o tarifa contratada. B2 permanece activo, no abrir B3 ni declarar estimación completa con ceros.

## Modelo y rollback

Codex investigador/implementador/integrador/verificador único; elección humana6.1Sol/high16:46:22UTC conservada. Runtime/esfuerzo efectivos y cuotas/consumo actuales desconocidos, no0; no selector cambiado. Claude y Fable no ejecutados: un traspaso/reimplementación no aporta evidencia faltante ni ventaja demostrada para este join determinista. Skills claude-review sólo elección/lease/metadatos; PDF para verificar tablas visualmente. Hasta240h máximo autorizado, no obligación de usarlas ni gasto; estimación45–60min, hasta20llamadas agrupadas de fuentes,0retries/fallback de proveedor,2reparaciones antes de reevaluar. Observado14llamadasweb,3originales descargados; fallo metadata prepare por testargv vacío corregido antes de claim, error de modoTSC corregido; no nuevos servicios ni cargos activados. Fecha futura de borrador corregida y hash actualizado antes de prueba final.

Rollback selectivo: retirar únicamente import/pin/cálculo/hash/output mxTollCoverage,74→73pins en prueba, nuevos lib/test/política/doc/originales si no tienen consumidores posteriores, y esta entrada de estado. No restaurar archivos completos sucios ni retirar costos anteriores. Repetir pruebas afectadas. No hay estado externo que revertir.
