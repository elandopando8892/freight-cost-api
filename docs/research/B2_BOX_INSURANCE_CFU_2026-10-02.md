# B2 · componente de seguro de la caja conectado al CFU

Corte local 2oct2026, 20:46UTC. Caso México DF → Fort SmithAR72916/PuenteIII, caja seca53′, relevo propioMX/US y misma caja. B2 permanece activo: no costo íntegro, contratación ni cotización comercial.

## Antes → ahora

La guía de seguro de caja estaba documentada pero no afectaba al costo del ciclo. Ahora sus dos referencias monetarias se asignan al mismo recurso compartido y aumentan el CFU conocido en contado y financiado. Se conservan CVU, administración, caja y capital previamente calculados. Una prima por activo, no una por tractor, país o relevo.

Se distingue capacidad de cobertura, precio público y póliza real. No se presume que pertenecer a una empresa binacional implique el mismo asegurado legal ni que el benchmark US cotice una póliza mexicana/binacional. La proyección monetaria es una transferencia prospectiva declarada, no calibración territorial ni aprobación de cobertura.

## Benchmark y decisión

Reutilizar guía de caja propia, asignación MAX distancia/tiempo, ciclo ordinario y comparaciones contado/financiado. No nuevo motor/stack/proveedor ni UI; B3 conserva los wireframes MARKSMAN cuando lleve el cálculo al SaaS.

| Alternativa | Decisión |
| --- | --- |
| Sumar una póliza completa por país o una cobertura interchange por cada relevo | Rechazada: puede duplicar el mismo daño físico y confundir custodia con propiedad. |
| Convertir el precio de compra en valor asegurado y sumar también porcentaje anual | Rechazada: valor asegurado no demostrado; son representaciones alternativas. |
| Una partida de caja, dos importes públicos separados y alcance explícito | Implementada como componente parcial; no seleccionar mínimo, máximo o punto medio como prima real. |

Fuentes revalidadas:

- [Logrock, guía de caja propia](https://www.logrock.com/commercial-truck-insurance/truck-trailer-insurance-2/),19feb2026: orientación25–150USD/mes por caja y regla alternativa por valor. Se retienen los extremos separados; no distribución auditada, intervalo de confianza ni límites del costo real. Publicación/relectura web, no oferta al piloto.
- [Catálogo vigente Quálitas](https://www.qualitas.com.mx/web/qmx/conoce-todas-las-condiciones-generales), producto de carga residente QJ/01 0626-CC. PDF primario archivado: texto páginas físicas16,19,20,27,134 y visual16,20,27,134. La definición exige identificar el semirremolque nombrado; robo desenganchado requiere resguardo cercado propio o con relación contractual. La cláusula territorial extiende determinadas coberturas físicas/robo aUS/Canadá, no toda responsabilidad civil. Son condiciones para cobertura contratada, no evidencia de prima, elegibilidad o póliza del piloto. No se afirman revisadas las162páginas completas.
- [Progressive, trailer interchange](https://www.progressivecommercial.com/coverages/trailer-interchange/): la distinción depende de caja ajena y acuerdo escrito; un relevo dentro de un grupo no acredita por sí solo su necesidad, inclusión o ausencia. No se traslada su ejemplo de deducible al piloto.
- [Timi, prima de tractocamión](https://timi.mx/guias/cuanto-cuesta-seguro-tractocamion): la referencia del tractor excluye caja y mercancía. No multiplicar esa prima ni interpretarla como paquete integral.

## Cálculo y resultado parcial

Por alternativa, `componente CFU = MAX(prima mensual × exposición distancia caja, prima mensual × días caja/24)`. Se reutiliza la capacidad compatible recalculada, no el divisor antiguo. La misma exposición produce el mismo incremento en contado/financiado; prima financiada, cargos y retención de pérdidas permanecen sin determinar, no cero.

| Ciclo | Prima25USD/mes: incremento CFU | Prima150USD/mes: incremento CFU |
| --- | ---: | ---: |
| Vacío de red |4.01684996USD|24.10109975USD|
| Regreso dedicado |8.51698712USD|51.10192271USD|

Ejemplo no seleccionado: caja precio neto+IVA y pago/km excluyendo descanso. Suma parcial contado red4014.86755 o4034.95180USD; dedicado7870.73454 o7913.31948USD. Primera alternativa financiada red4124.61499 o4144.69924USD. No son intervalos de costo íntegro, mínimos garantizados ni cotizaciones. Los seis outputs finales siguen null; ninguna base activa modificada.

Faltan otros componentes del piloto y correspondencia económica completa de coberturas. No exigir póliza/factura privada para el benchmark público: la falta de observación real se distingue de la suficiencia de una hipótesis prospectiva. Próximo importe prioritario: mercancíaMX y RC del tractorMX al cruzar, con fuente pública, exposición y supuestos compatibles; luego integrar restantes gastos físicos/monetarios antes de declarar B2 completo.

## Pruebas y trazabilidad

313pruebas PASS/5archivos después de la última edición: caja20, consolidado225, jornada14, financiación21, seguro/employer33. TSC estricto PASS; readback confirma66pins, mismos ocho casos contado/128comparaciones financieras y un componente nuevo por alternativa, no nuevos sprints. Pruebas de duplicación, cambio de país/moneda/activo, correspondencia de ciclos/totales, conservación de inputs, ausencia de adopción y alteración del PDF/política. `git diff --check` PASS con advertencias CRLF previas.

Política SHA256 `dcb982c615b061dbe212e3388479a506e797c4f06d053ca6d36fa24b8baf6f5d`. PDF `sources/QUALITAS_RESIDENT_CARGO_TERMS_20261002.pdf`, SHA256 `beaa23a16d67a74fb79b92841086a14a273a58b6aed2d4ca61b4df137f0779e4`, conservado sin alterar. Sólo transformación local sobre evidencia pública: no UI/persistencia/autenticación/deployment ni prueba de póliza real. No solicitud de seguro, Google/SAKBE facturable, DB/Auth/usuarios/Neon/infra o datos de negocio.

## Ejecución, límites y recuperación

Codex único investigador/escritor/integrador/verificador; elección humana histórica `gpt-6.1-sol/high`16:46:22UTC conservada, runtime exacto/esfuerzo no observable, selector intacto. No Claude/Fable/agentes: transferencia de contexto a otro implementador no aporta ventaja demostrada para esta continuidad verificable. Cuotas5h/semana Codex y5h/semana/Fable Claude, tokens atribuibles/caché/razonamiento/cargos desconocidos; ninguna lectura histórica presentada como actual ni gasto adicional activado.

Máximo240h autorizado; estimación de corte35–50min, trabajo20:30–20:46UTC aprox, sin deadline impuesto o obligación de consumirlo. Cero reintentos de proveedor/fallback. Dos lecturas locales usaron rutas no existentes y se corrigieron mediante búsqueda; un retorno Path del kit se trató inicialmente como diccionario, quedó sólo preparado y se recuperó el mismo job tras inspección, sin duplicar ejecución. Pruebas/TSC exitosos; segundo pase se debió a añadir prueba de integridad del PDF y regresión numérica, no a ocultar un fallo.

Skills PDF para inspección visual; claude-review para registro y escritor cooperativo, sin invocar Claude. Kit fijado `releases/chat-20261002T201550Z/app`; job `box-insurance-cfu`, lease `b4c75d6f4ecf4da58c231b9c6913b603`. Cierre de identidad del modelo no acreditable se registra como tal en el kit, no se declara por ello B2 bloqueado ni completo.

RaízD:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, revalidados. Cambios previos preservados; sin ramas/PR/commit/push/despliegue.

Rollback selectivo: desconectar import/pin/verificación/call/campo nuevo del consolidado,66→65 en su test y retirar sólo las dos entradas nuevas de estado. Conservar módulo/test/política/PDF/documento como evidencia desconectada. Reconstrucción en memoria comprobada contra hashes previos: consolidado `263cdb246544354bc0df43653b6cd5ce5f57aaaea22eb7af4ed3fa5f0370dd2c`, test `69956fb478449f9a6a1d869d5ca2cf02e799d4e418d4abb15a6ab1e176051708`. Sin rollback aplicado ni eliminación de trabajo ajeno. PNG temporales regenerables eliminados tras revisión, fuentePDF conservada.
