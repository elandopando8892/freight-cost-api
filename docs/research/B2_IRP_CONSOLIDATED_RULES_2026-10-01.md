# B2 · IRP: matriz pública y reglas parciales compatibles

Fecha: 2026-10-01. Desarrollo local en `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. Se conserva el árbol con cambios anteriores; sin commit, rama nueva, despliegue, Auth, DB, migraciones, cuentas, solicitudes de inscripción ni consumo de IA de aplicación.

## Resultado y benchmark previo

Antes sólo estaba soportado el componente Texas sobre APVD 2026. Ahora existe una matriz oficial de contraste para las 59 jurisdicciones y dos reglas subyacentes adicionales (Arkansas y Oklahoma). Se reutiliza el consolidado económico existente, no un servicio nuevo. La distinción importante es **disponibilidad documental frente a compatibilidad económica**: 56 reglas quedan sin resolver en el escenario, no 56 fuentes públicas inexistentes.

Alternativas revisadas:

- Investigar individualmente 58 tarifas: útil para confirmar vigencia/excepciones, pero duplica búsqueda cuando ya hay reglas consolidadas oficiales.
- Adoptar/adaptar las reglas del ejercicio oficial IRP 2026: recomendada como referencia fechada y punto de partida para identificar dependencias; no certifica la factura del piloto ni vigencia a octubre.
- Reescalar las facturas redondeadas por 59 y APVD: rechazada. Redondeo, moneda, valor, operación y otros componentes impiden reconstruir así una tarifa íntegra.

Las herramientas comunes (lector local, ZIP/XML, hashes y consolidado) se conservan; la parte diferencial sigue siendo presupuesto/exposición coherente de dos tractores con relevo y una caja, no replicar un sistema de inscripción IRP. El criterio de cierre de este incremento es trazabilidad de la matriz y cálculo de reglas compatibles sin adoptar precios no sustentados.

## Fuentes originales y trazabilidad

El [índice oficial IRP Fee Tests](https://www.irponline.org/page/Fee_Tests) fue accesible en navegador público sin sesión, aunque el lector HTTP devolvía 403. La descarga del navegador agotó un intento; los enlaces exactos publicados permitieron conservar los originales desde el CDN del mismo organismo. No se crearon cuentas ni se ejecutaron instrucciones administrativas del documento.

- [Resultados 2026, publicados 21 julio](https://www.irponline.org/resource/collection/A35CA2A0-300D-4785-B21C-329509828DD9/2026_Fee_Test_Results_7_21_26.xlsx): archivo local `sources/IRP_FEE_TEST_RESULTS_2026_REVIEW_20261001.xlsx`. Tab `Fee Test 2`, relación con `sheet2.xml`, filas 7–65, columna BM (factura reportada por Texas, USD). Se conserva el encabezado interno desactualizado “Fee Test 1”; la pestaña y las reglas corroboran el caso 2.
- [Reglas 2026, publicadas 8 junio](https://www.irponline.org/resource/collection/A35CA2A0-300D-4785-B21C-329509828DD9/2026_Fee_Test_Guidelines__06_08_26.xlsx): `sources/IRP_FEE_TEST_GUIDELINES_2026_REVIEW_20261001.xlsx`. Relaciones de hojas verificadas, no inferidas por sheetId. Texas I27:I30; Arkansas C28:C33; Oklahoma E30:E36; California C48:C60. La plantilla genérica repetida no se usa como tarifa de una jurisdicción.
- [Instrucciones originales](https://cdn.ymaws.com/www.irponline.org/resource/resmgr/fee_test/2026_fee_test_instructions.pdf): `sources/IRP_FEE_TEST_INSTRUCTIONS_2026_REVIEW_20261001.pdf`, páginas 1–2 revisadas también visualmente. El caso 2 es transporte por cuenta de terceros, Kenworth usado 2022, 80,000 lb, doce meses, precio de compra USD 136,000. Distribuye 1,000 unidades de distancia a cada una de 59 jurisdicciones. Usa vigencia enero 2026 y un cambio fechado; no incluye los cargos administrativos/misceláneos del estado base. No equivale al activo Ryder ni a la fecha de servicio pendiente del piloto.

Hashes SHA-256 y localizadores están en `B2_IRP_CONSOLIDATED_RULES_2026-10-01.json`; este JSON se fija por hash como pin 19. Los XLSX se comprueban como binarios sin ejecutar macros ni fórmulas; lectura de XML/valores guardados. Fechas de publicación no sustituyen fechas efectivas.

## Qué se calcula y qué no

La columna Texas ya está en USD. Sus 59 importes suman **USD 2,021.47 únicamente para el ejercicio oficial**, sin otra conversión ni reparto APVD. Se conservan discrepancias entre reporteros, incluidas MB, NL, QC, UT y WA: cero en una columna no demuestra exención.

Para el escenario analítico Texas/80,000 lb/doce meses ya documentado, se aplican las reglas fechadas a la participación APVD, sin redondearlas como factura:

- Arkansas: base USD 1,553 × 2,897/82,631 = **54.447374 USD/año**. El cero explícito de impuesto del ejemplo no vuelve cero otros cargos desconocidos.
- Oklahoma: (base USD 948 + componente ARCS USD 100) × 2,681/82,631 = **34.002832 USD/año**. Se preserva por separado el componente; el ejemplo factura 17.70 con redondeos que no se extrapolan.
- Texas mantiene el componente condicional previo USD 393.380160/año con TERP; no se añade la factura de Texas del ejercicio oficial.

Los ejemplos de California dependen del valor del vehículo. Su VLF de prueba USD 885 no se traslada al anuncio Ryder de USD 40,495. Las reglas anteriores no prueban factura, registrante real, elegibilidad APVD, vigencia actual, presupuesto completo ni un piso de precio. Ninguna se asigna a la caja compartida ni se cobra otra vez por tramo nacional. Continúan 56 reglas compatibles, enmiendas vigentes, moneda/redondeo/cargos adicionales y perfil jurídico por resolver. IRP total, CFU, CVU y precio siguen null; cero adopciones.

## Verificación y siguiente entrega

- 113/113 pruebas en tres suites: consolidado (62), registro (21) y presupuesto binacional (30). Incluyen alteración de cada archivo fuente, ahora también XLSX, fórmulas AR/OK, moneda, valor, no adopción y presupuesto incompleto.
- Typecheck estricto de consolidado/tests PASS; sin reparación.
- Cotejo de las 59 celdas BM originales contra JSON: cero diferencias; subtotal coincidente.
- CLI: salida 2 esperada por economía incompleta, 19 pins, 56 reglas sin integrar, cero partidas completas, cero adopciones, seis salidas económicas null. La salida 2 no es fallo técnico ni cierre del MVP.
- `git diff --check`: PASS; advertencias previas de normalización CRLF, sin limpieza del trabajo ajeno.

El siguiente trabajo debe reutilizar esta matriz para resolver por grupos dependencias de tarifa/valor/moneda y sus cambios efectivos, dentro del presupuesto fijo B2. Después se cierra exposición/ciclo y variables para el recorrido SaaS. No abrir nuevos sprints por cada comprobación ni afirmar que el benchmark está calibrado por tener referencias.

## Modelo, consumo y rollback

Recomendación de esta actividad: GPT-6.1 Sol high para interpretación económica, medium para integración/QA. No se cambió el selector principal. Registro observado el 1 octubre: Codex CLI 0.159.2; Claude Code 2.1.286 con autenticación firstParty/Max; esto no acredita acceso a un modelo concreto, cuota ni excedentes. Catálogo desktop Sol 6.1 low/medium/high/xhigh/max/ultra no prueba inferencia ejecutada. Claude no se llamó: la pregunta acotada era verificable con fuentes y pruebas existentes. Evitar otro contexto auxiliar reduce consumo relativo esperado; tokens, precios y ahorro numérico no estimables. Fuentes con intentos limitados; descarga fallida no repetida y ninguna repetición de builds generales. Se detiene esta entrega tras cotejo e integración, sin expandir a 56 investigaciones individuales.

Rollback local por hunks únicamente: retirar pin `irpRules`, referencias y proyección añadida, restaurar expectativa anterior de 58 reglas pendientes y quitar las pruebas añadidas (cinco económicas más la verificación paramétrica del nuevo pin). Si se retiran, preservar primero JSON/expediente y tres originales como evidencia. No revertir completos el consolidado/tests/notas ni ejecutar reset/checkout: contienen cambios previos. No existe rollback externo porque no hubo efectos externos. Los dos PNG temporales de inspección se eliminan; originales conservados.
