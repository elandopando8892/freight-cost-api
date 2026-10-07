# B2 · moneda y cargos por valor: fórmulas sin precios inventados

Entrega local 2026-10-01. Antes: 35 jurisdicciones con componentes de registro, 24 sin integrar. Ahora: **45 bases de registro documentadas**, al integrar las diez canadienses en su moneda nativa, más **ocho fórmulas de cargos por valor contrastadas con el ejercicio oficial**. Quedan 14 bases US sin integrar y, separadamente, valores/cargos dependientes y conflictos pendientes. BC/MB/SK conservan cargo dependiente sin seleccionar. No son 45 tarifas completas/vigentes ni una calibración final: diez partidas completas, CFU/CVU/precios y total IRP siguen null, cero adopciones.

## Benchmark y alcance acordado

Se reutilizó la comparación del [IRP consolidado](B2_IRP_CONSOLIDATED_RULES_2026-10-01.md) y las condiciones del [lote por peso](B2_IRP_US_WEIGHT_RULES_2026-10-01.md), verificando hashes/estado Git. Alternativas: (1) convertir importes finales USD otra vez, rechazado por duplicar moneda; (2) reconstruir tasas desde facturas redondeadas, rechazado; (3) adaptar bases nativas y fórmulas oficiales con perfil/fecha explícitos, recomendado. No requiere proveedor, infraestructura o dependencia nueva. El diferencial binacional (relevo de dos tractores y caja única) no se modifica.

Objetivo/aceptación: preservar CAD, convertir una sola vez con referencia fechada, reproducir cargos/orden de redondeo del ejercicio y dejar importes de piloto null cuando no haya valor compatible. Se integra en el consolidado documental existente; no hay cambio UI, persistencia operativa ni nuevo wireframe. La UI futura conserva manual MARKSMAN y wireframes.

Fuente: [IRP Fee Test Guidelines 2026](https://www.irponline.org/resource/collection/A35CA2A0-300D-4785-B21C-329509828DD9/2026_Fee_Test_Guidelines__06_08_26.xlsx), original local `sources/IRP_FEE_TEST_GUIDELINES_2026_REVIEW_20261001.xlsx`, SHA-256 `5db191bc435844030366c5edd0b44401b7f832f73edc67ef587b30475b3f9df1`. Se reutiliza el perfil/FX ya documentado del ejercicio: enero 2026, CAD→USD 0.7235, USD→CAD 1.3821. No son tasas actuales ni recíprocos exactos. Publicación junio no acredita vigencia octubre. Sin refresh web/llamadas facturables. Celdas, relaciones, métodos y discrepancias en `B2_IRP_CURRENCY_VALUE_RULES_2026-10-01.json`, pin 22, SHA-256 `e454640050b4184c3f8239f5d637497d396c8d632712e5234e101959dac295ee`.

## Economía integrada

AB, BC, MB, NB, NL, NS, ON, PE, QC y SK conservan base anual CAD. La columna anual USD del consolidado es sólo su equivalente analítico con FX histórico; no una cuota publicada USD ni una factura redondeada. El reparto APVD produce componentes sin redondear para contraste, no se extrapolan instrucciones de un ejercicio a facturas futuras. Cero distancia de NL permite componente repartido cero, pero no exención ni permisos totales cero.

| Ejercicio | Orden de operaciones observado | Resultado, no tarifa del piloto |
|---|---|---|
| AB | 30.66255 CAD → 31 CAD → conversión → dólar USD cercano | USD 22 |
| ON | 44.12085 CAD → 45 CAD hacia arriba → conversión/céntimos | USD 32.56 |
| QC | 48.96855 CAD → múltiplo de 0.25 (49 CAD) → dividir por 1.3821 | USD 35.4532957, no el reporte Texas 34.75 |

NB incluye otro FX en su ejemplo; NL otro porcentaje. Ambas discrepancias y la de Quebec quedan sin resolver, no corregidas silenciosamente. PE no acredita redondeo USD; SK requiere cálculo diario para factura real. La columna USD ya reportada del ejercicio no vuelve a convertirse.

Se evalúan productos de valor/factor/participación del ejercicio para BC, MB, SK, CO, ME, NV, SC y WV. CAD sólo se convierte para SK una vez; los valores ya USD permanecen USD. NV compara fábrica/tabla y redondea su cargo anual antes del reparto. SC separa multiplicador de valor 0.9 de duración (doce meses), no lo llama factor temporal. CO exige MSRP para usado, no precio de compra. Los factores por año y precios fiscales no se reemplazan por el anuncio Ryder USD 40,495. Cada fórmula devuelve `pilotValueChargeUsd:null`, sin selección/adopción.

Faltantes US: CA, CO, FL, ID, KY, ME, MS, NE, NV, SC, UT, VT, WV, WY. Documentar una fórmula de valor no resuelve automáticamente su base de registro, sus condiciones o conflictos. Total permisos sigue null; todas las jurisdicciones necesitan vigencia/perfil/registrante/cargos completos. Próximo trabajo agrupado: base de valor pública compatible del tractor y factores/fechas → resolver discrepancias y registro pendiente → presupuesto fijo/exposición/ciclo/variables. No crear nuevos sprints por factor ni solicitar históricos privados.

## Ledger de actividad y consumo

Responsable único: Codex. Inicio 17:43:27 America/Mexico_City; presupuesto anunciado doce minutos y una reparación máxima. Recomendación: OpenAI **GPT-6.1 Sol high** para base fiscal/moneda; **medium** para integración/QA. Ejecución en el modelo principal actual, sin cambio del selector o prueba del ID ejecutado. Catálogo desktop admite low/medium/high/xhigh/max/ultra, no prueba acceso vigente. No se asignó Claude: cotejo determinista acotado no aporta una pregunta independiente. Fable no se invocó ni seleccionó; no hubo necesidad demostrada que justificara añadir contexto o revalidar condiciones de una llamada no prevista. No se instaló puente/lector ni se usaron credenciales/sesiones privadas.

Cuota automática Codex (`get_usage_limits`) entre 17:43:27–17:43:30: semanal 10,080 minutos **95% utilizado**, reposición indicada 2026-10-06 13:08:00 -06:00, ventana secundaria no disponible. Cuota de cuenta compartida, no consumo del sprint; puede variar concurrentemente. Claude Max x5 es declaración del usuario; cinco horas/semanal/Fable/uso extra/reposiciones actuales desconocidos, sin evidencia manual reciente. Reserva por actividad no cuantificable: tiempo/contexto/reintento acotados, no llamadas duplicadas ni build general. Tokens, list-price, cargos reales/consumo de esta actividad no observables. Menor contexto/latencia esperados frente a doble revisión no equivalen a ahorro medido ni garantía de costo.

Un intento de cotejo falló al leer `.03294`: se reparó sólo el patrón numérico del comando temporal, incluyendo decimal sin cero inicial; segundo cotejo PASS. Intento preservado aquí, consumo desconocido, no contado como cero. Ningún fallo de modelo ni llamada auxiliar. No se escaló el principal. Al cierre, conservar el alcance económico y usar capacidad suficiente para integración verificable; reevaluar si falta criterio para valor/fecha, no encadenar búsquedas o inferencias de acceso.

## Verificación y rollback

- **172/172 pruebas**, consolidado 121, presupuesto 30 y registro 21; diez bases CAD, ocho fórmulas, secuencias de redondeo, discrepancias/no adopción y hashes incluidos. Después de la última modificación de código.
- Typecheck estricto PASS, sin reparación de implementación. Un único ajuste del cotejador temporal; no se agregó parser permanente.
- Cotejo independiente: diez relaciones de hojas, diez bases CAD y dieciséis valores/factores originales; cero diferencias tras reconocer decimales abreviados. No ejecución de macros/fórmulas del XLSX.
- CLI salida 2 esperada por economía incompleta: 22 pins, 45 componentes de registro, 14 bases pendientes, ocho contrastes de valor y BC/MB/SK sin cargo seleccionado; cero partidas completas/adopciones y seis salidas null.
- `git diff --check` PASS, advertencias previas CRLF preservadas. Evidencia documental pública y cálculo local; sin prueba autenticada, persistencia productiva, despliegue o aceptación operativa.

Workspace `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, verificados antes de editar. Sin Auth/usuarios/DB/Neon/migraciones/infraestructura/producción/operaciones o consumo IA de aplicación. Cambios ajenos y originales preservados; ningún archivo eliminado.

Rollback por hunks: retirar pin/referencias `irpCurrencyValue`, lectura/proyección CAD/valor/redondeo y pruebas añadidas; reponer NL desconocido, 24 bases faltantes y 35 conocidas en las expectativas previas. Conservar primero JSON/expediente. No revertir archivos completos ni reset/checkout: contienen entregas anteriores. Sin rollback externo.
