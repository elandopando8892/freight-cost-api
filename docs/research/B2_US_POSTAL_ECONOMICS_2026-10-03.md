# B2 · ruta postal US incorporada a la cadena económica

## Antes y ahora

Antes:734.4mi/697min sólo estaban en un contraste aritmético; el consolidado seguía usando708mi/680min urbanos. Ahora el consolidado local usa la **referencia pública patioMetropolitan→punto postal72916** como supuesto prospectivo y recalcula toda su cadena: km cargados/vacíos, reloj US, caja serial, límite de capacidad, jornada MX y compromiso de recursos, nómina, efectivo/financiado, servicios, visibilidad, alimentos, DEF/ralentí y patioMX. La alternativa `LEGACY_CITY` queda reproducible, sin sustituir archivos originales ni sumar las dos rutas.

Objetivo del corte: convertir evidencia pública en una entrada que mueve costos y capacidad verificables. Alcance: script de investigación local y pruebas; no motor publicado, BD, interfaz, parámetros canónicos, Auth ni despliegue. B2 completo todavía requiere resolver los faltantes físicos y monetarios del cruce.

## Benchmark y decisión

| Enfoque | Ajuste funcional y costo | Decisión |
|---|---|---|
| Mantener sólo708mi urbanos | Reproduce análisis anterior, pero no refleja ZIP72916 ni referencia de patio | Conservar como contrafactual explícito |
| Adaptar el pipeline existente a734.4mi/697min | Reutiliza fórmulas MAX, capacidad y asignación por recurso; cero proveedor nuevo, ninguna consulta facturable | Implementado como referencia de planificación |
| Router/API truck nuevo | No resuelve por sí solo accesos del recinto ni asegura el extremo de entrega; agrega integración/operación | No introducir |

Fuente primaria:[planificador público FreightSidekick](https://freightsidekick.com/tools/route-planner); observación del3octUTC, card `B2_US_POSTAL_ROUTE_REFERENCE_2026-10-03.json` y narrativa observada previamente fijada por hash. El proveedor ofrece CommercialTruck, pero advierte que no garantiza restricciones. Sin cuenta, cotización, optimización, IA auxiliar, claveGoogle, contrato o compra. Reutilización de investigación vigente, sin nueva consulta de ruta en este corte.

Dato frente a supuesto:734.4mi y697min son readout público redondeado; el código postal resuelto es un punto representativo. No conocemos el domicilio de entrega ni el patio contratado. Transferir tiempo a conducción nominal, aplicar el mismo vacío y simetría de retorno son hipótesis explícitas. **No es una ruta truck validada ni prueba de circulación real.**

## Resultado reproducible del piloto hasta los componentes conocidos

Escenario efectivo, capital `NET_PLUS_VAT`, remuneraciónMX `RATE_EXCLUDES_WEEKLY_REST`, reserva de patioMX neto+IVA y dos sensibilidades de prima pública de la misma caja. ImportesUSD por servicio/ciclo de referencia, no CFU/CVU por kilómetro.

| Operación | Fijos conocidos asignados | Variables conocidos | Suma conocida | Cambio frente a urbana |
|---|---:|---:|---:|---:|
| Red · prima caja baja |984.28|3552.09|4536.36|+68.73|
| Red · prima caja alta |1004.43|3552.09|4556.51|+68.79|
| Dedicado · prima caja baja |2238.97|6768.19|9007.16|+125.79|
| Dedicado · prima caja alta |2281.55|6768.19|9049.74|+125.79|

No son intervalos estadísticos, límites garantizados, costo completo, oferta de compra o precio de venta. No elegir automáticamente una prima o escenario de retorno. Se preservan8filas efectivo+128financiadas, cada una con2primas:272comparaciones; financiación usa valor-pérdida+interés, no deuda/principal cobrado nuevamente. La CVU conocida aumenta más que la sensibilidad de cuatro componentes del corte previo porque se recomponen fluidos y reservas compatibles. La CFU conocida se recalcula por distancia/reloj, no añadiendo sólo combustible a la suma antigua.

Capacidad nominal compatible actual: red6.203227 ciclos/mes; dedicado2.935310 ciclos/mes. Caja red3.868954d; dedicado8.176308d. MX red3.061439d y US1.857230d. El calendario ordinario mantiene el final dedicado8.176308d: absorber17min en una espera no implica que todos los relojes deban aumentar linealmente. Se recalculó, no se congeló el resultado. Una caja, un pool administrativo y MAX(distancia,tiempo) una vez por recurso. Cuotas24d/mes y productividad son hipótesis públicas transferidas, no disponibilidad contractual.

Para repetir desde la raíz físicaD con Node/tsx existentes:

```powershell
& C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe --import tsx --input-type=module -e "import {consolidateBinationalReferenceBudget as f} from './apps/api/scripts/consolidate-binational-reference-budget.ts'; console.log(JSON.stringify(f().supportingMxReservedYard,null,2))"
```

Contrafactual: llamar `f(readLocalDocument,readLocalDocumentBytes,'LEGACY_CITY')` con los lectores exportados por `assemble-economic-reference-cards.ts`. Esas dos variantes usan los mismos75pins; ninguna accede a red/BD. El CLI directo sin argumentos usa postal y conserva exit2 deliberado porque B2 está incompleto; no confundirlo con excepción o prueba fallida.

## Pruebas y límites

**756 pruebas /31 archivos PASS** después de la última edición de código/tests. TSC estricto ESNext/Bundler PASS sobre los12 archivosTypeScript editados; `git diff --check`PASS, avisosCRLF anteriores. Incluye ambos tipos de retorno, todos los cash/finance/primas, conservación de capacidad/caja, duplicaciones, fuente/archivo alterado, origen de referencia, determinismo y no mutación. Las fixtures numéricas históricas se etiquetan/corren explícitamente en `LEGACY_CITY`; las pruebas generales de asignación usan postal por defecto, más regresión numérica postal específica y contraste completo. No se hizo pasar la implementación postal por cambiar todo el test a datos anteriores.

Registro de fallos: primera nueva aserción buscó quoteReady en una fila que sólo lo contiene en sus alternativas; corregida. Primera corrida31archivos:746/755PASS,9fallos:8expectativas históricas sin identidad de ruta y1igualdad IEEE entre dos asignaciones equivalentes con diferencia≈1e-14. Se preservaron fixtures históricas y se usó tolerancia numérica, sin cambiar precios/fórmulas para satisfacerlas. Un patch rechazó el contexto de un filtro; no hubo edición parcial, se inspeccionó el texto real y reaplicó. Segunda corrida755PASS, seguida por nueva regresión postal; final756PASS. Tiempos finales Vitest23.69s; consumo/cuota no observable, no uso fallido contado como cero.

Integrado/probado **localmente con benchmark público y supuestos**; no desplegado ni usado por un transportista. Sin pruebas de cuenta, sesión, persistencia o UI porque no se modificaron en este corte. Los seis outputs completos del consolidado permanecen null y quoteReadyfalse: la evidencia contradice cerrarB2 todavía.

Falta para la estimación completa: aproximación/cruce/retorno bobtail del tractorMX con extremos y solapes compatibles; desgaste tractor-only sin doble caja; tarifaMX faltante de alcance correcto; cobertura/prima comercial del tractorMX al ladoUS y decisión compatible de carga. Lo privado no se exige para investigar una base pública, pero tampoco se inventa una prima como si fuera publicada ni se presenta lo no cubierto como costo cero.

## Ejecutor, controles y recuperación

Codex escritor/verificador; elección humana `gpt-6.1-sol/high`2oct16:46:22UTC, máximo240h autorizado paraB2. Modelo/esfuerzo efectivo principal y cuota5h/semanal desconocidos; no cambio automático del selector, lectura de credenciales o llamadaClaude/Fable. Seguir con el ejecutor elegido evita reproducir todo el contexto para una transformación verificable. No hay razón demostrada para escalar modelo: los fallos observados son fixtures/precisión, no insuficiencia de razonamiento. No se invoca otro modelo sólo por su catálogo o plan.

Skill claude-review utilizada sólo para elección/checkpoint/lease de un escritor; APPchat-20261002T232232Z. Job inicialpostal-route-economics se detuvo con resultados reales y devolviólease antes del contrato de validación ampliado. Leaseactual92cdb758445e4962b0e785d3c72202f1, con archivos de pruebas afectados declarados explícitamente; sin escritor concurrente. Presupuesto80pasos, contexto mínimo del contrato, cero inferencias auxiliares/reintentos de proveedor y dos reparaciones antes de inspeccionar alcance. Investigación fuente se reutilizó; no APIs pagadas ni providers activados.

Workspace físicoD:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD4f5fc2de0c3d178dace917231e1092040dec21fd. Cambios ajenos preservados. SourcecardSHA `1698466636bfd6f4b400c5c8193576d127b7fee3031eec1b2b5f40f00da4f1ed`; consolidadoSHA `017c3b2af04b8b6cc3087cde9765b7b8775ed994a52d6df745960a7cff1453c6`; cicloSHA `6b9f57a8acf26569b1ce9ad714d09a12955e3b1003d0bdb67d59247350cad083`. Nada de Auth/Neon/BD/usuarios/migraciones/infra/producción/commit/push/despliegue/operación comercial.

Rollback mínimo funcional: volver el default `usRoadBasis` a`LEGACY_CITY`, conservando ambos escenarios y fuentes; revisar/regresar sólo aserciones del defaultpostal correspondientes. No sobrescribir archivos completos ni tocar los74pins anteriores; si se retira el soporte postal, quitar selectivamente su pin, chequeo de narrativa, quinto argumento y campos/tests nuevos. Sourcecard/documento sólo retirables tras comprobar que no contienen cambios posteriores. Mantener íntegros la narrativa fuente previa y el originalSCT. No reset/checkout generales.
