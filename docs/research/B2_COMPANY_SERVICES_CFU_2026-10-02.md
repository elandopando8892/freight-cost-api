# B2 · Oficina, telefonía y patio conectados al CFU

2 octubre 2026, corte local. **B2 sigue activo:** se incorporan partidas económicas conocidas, no se declara costo D2D completo, factura real ni proveedor contratado.

## Qué cambió

La sensibilidad histórica presupuestaba siete membresías y siete teléfonos a partir de siete funciones administrativas. El modelo posterior distribuye el trabajo de una red administrativa y usa dos cuentas nominales de control; no acredita siete personas. Aquella sensibilidad permanece intacta, pero no se sumó al nuevo cálculo.

Se añadió una proyección explícita de **dos accesos reservados y dos líneas administrativas**, sin convertir el equivalente de personas asignadas en facturas fraccionarias. Es una hipótesis de capacidad reservada para los dos controles, no una dotación observada ni prueba de atención24/7. La nómina y las dos licencias TMS anteriores permanecen sin cambios.

| Alternativa revisada | Decisión |
|---|---|
| Heredar siete escritorios/teléfonos por siete funciones | No conectar: función no equivale a persona ni cuenta. Conservar como sensibilidad histórica. |
| Dos accesos nominales + dos líneas + bays separados | Implementar como proyección económica declarada. Reutiliza fuentes y asignación existentes, sin otro proveedor o infraestructura. |
| Facturar fracción de membresía o usar combo para equipos desacoplados | No inferir condiciones que los proveedores no publican. El acceso fraccionado exigiría un pool/denominador de red explícito; el combo se describe para conjunto unido. |

## Benchmark aplicado

- [MileOne servicios](https://www.mileoneinc.com/services/): coworking100USD/mes por membresía, con WiFi e impresión/escaneo. Dos accesos producen200USD/mes; no se añade otra factura de internet o impresión. [FAQ](https://www.mileoneinc.com/faq/): cada trabajador necesita acceso; no incluye telefonía, y la dirección comercial requiere otro plan/eligibilidad. Acceso al espacio no equivale a personal de guardia.
- [T-Mobile Broadband Facts](https://www.t-mobile.com/business/wireless-business-plans), CoreMobile: **dos líneas100USD totales**, más4.49por línea de cargo del proveedor →108.98USD/mes conocidos. No100por línea, ni precio promocional de seis/siete líneas. Otros recargos/impuestos, dispositivos y conectividad de operadores no están resueltos; conexión35por línea es evento único, no renta recurrente. No se afirma roaming continuo MX.
- [Outpost Metropolitan](https://outpost.us/locations/laredo-metropolitan/): tractor150 + remolque175USD/mes →325USD. Son dos reservas que permiten representar equipo separado; **no se suman además los200del combo**. Tarifas introductorias según ocupación, duración y precio de renovación no publicados. No prueba disponibilidad, dimensiones efectivas de unidades, aprobación de maniobras o custodia.

La caja continúa siendo **una sola**: el bay de remolque se asigna a `SHARED_TRAILER`, no se crea otra caja mexicana/americana. El bay de tractor va a`US_TRACTOR`; oficina y telefonía se conservan como un pool común y se reparten una vez entre los dos tractores, igual que la administración existente.

| Componente conocido mensual | MX tractor | US tractor | Misma caja | Total USD |
|---|---:|---:|---:|---:|
| Oficina y telefonía |154.49|154.49|0|308.98|
| Reservas de patio US |0|150.00|175.00|325.00|
| **Total de estas partidas** |**154.49**|**304.49**|**175.00**|**633.98**|

Los ceros de la tabla son **asignaciones de estas partidas específicas**, no costos desconocidos declarados cero. El total no es el costo mensual completo de empresa.

## Paso al costo del mismo viaje

Cada componente se incorpora como fijo con la exposición ya calculada para su recurso:

`incremento CFU_recurso = mensual_recurso × MAX(km_ciclo / capacidad_km_mensual, días_recurso / 24)`

Conservar el mismo ciclo/recurso entre alternativas fiscales y contado/financiado; no usar tres veces el reloj de la caja, ni agregar otra cuota de patio por viaje por la misma reserva mensual.

| Ciclo | CFU MX añadido | CFU US añadido | CFU caja añadido | CFU total añadido USD |
|---|---:|---:|---:|---:|
| Red, vacío proporcional |19.706736|33.210268|28.117950|**81.034954**|
| Dedicado, retorno vacío misma caja |52.631574|61.365933|59.618910|**173.616416**|

Readback de la alternativa de contado `NET_PLUS_VAT` y pago MX `RATE_EXCLUDES_WEEKLY_REST`, conservando las dos referencias de seguro de caja: subtotales conocidos **4095.902507 /4115.986757USD** en red y **8044.350959 /8086.935895USD** dedicado. Primer contraste financiado red: **4205.649947 /4225.734196USD**. No son bandas estadísticas, costo completo, tarifa de compra o venta. CVU permanece3208.411732/red y6040.121692/dedicado; sólo cambia CFU.

## Faltantes y límite de investigación

El [anuncio primario de Patio Anáhuac](https://inmobiliarialaredo.com/patio-anahuac), leído completo, presenta1ha, oficinas, barda, concreto,4,000Dls y depósito, **sin periodicidad ni capacidad de bays publicada**. No se convierte en4,000por mes ni se divide la hectárea por una capacidad inventada. Tampoco se sustituye por corralón municipal o estacionamiento de autos. La consulta adicional no dio precio primario compatible por espacio en MX.

Permanecen pendientes: patio/acceso MX y maniobras, costos de telefonía/dispositivos de operadores, impuestos/recargos/comisiones aplicables, condiciones no promocionales del patio, monitoreo y componentes restantes de empresa. La falta de contrato o proveedor real no se confunde con falta de estimación: la hipótesis pública de este corte es válida como componente prospectivo, pero no convierte los importes todavía no sustentados en cero ni cierra toda la familia.

## Implementación y verificación

- Nuevo `reference-company-services-cfu.ts`, política JSON de este checkpoint, salida `supportingCompanyServicesCfu`; **68 pins** en el consolidado. Versiones anteriores conservadas.
- Seis líneas mensuales conservan el pool y dos bays. Aplicación a8composiciones contado y128financiadas, cada una con dos alternativas previas de caja; no se crean nuevos escenarios económicos ni se altera capital/nómina/TMS/seguro/CVU.
- **274 pruebas aprobadas/4archivos** después de la última modificación:15serviciosCFU,12escalaadmin,20segurocaja,227consolidado. Incluyen números independientes del piloto, conservación/duplicación, mezcla de bases/ciclos/pagos, fuente alterada y no mutación.
- **TypeScript estricto/noEmit aprobado**, readback y rollback selectivo en memoria. Primera corrida273PASS; segunda274PASS tras añadir una regresión monetaria. Ningún fallo de prueba.
- Descarga directa de servicios MileOne y T-Mobile:403, sin repetición ni archivo falso. Sus precios se verificaron con lector web primario y se registran como tal, no como HTTP original archivado. FAQ sí archivado y su contenido comprobado; Outpost reutiliza archivo1Oct con hash y precio revalidado2Oct. El JSON distingue esos niveles.
- FAQ SHA256 `26e999afac2dd7781d0904cc27e314ea3ea61564e0d7c6bdb80606689524c6bc`; Outpost `016a154ca9f4b526990adca3174f4a3cde90f82d1c1461e70bc1356e6f0f1afa`.
- No UI ni B3/persistencia modificados. No publicación, reservas, contacto comercial, IA externa, pagos, DB/Auth/Neon/usuarios/migraciones/infraestructura. No se afirma aceptación operativa.

Pruebas:

```text
node node_modules/vitest/vitest.mjs run apps/api/tests/benchmark-company-services-cfu.test.ts apps/api/tests/benchmark-admin-scale.test.ts apps/api/tests/benchmark-box-insurance-cfu.test.ts apps/api/tests/benchmark-binational-reference-budget.test.ts
node node_modules/typescript/bin/tsc --strict --noEmit --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler apps/api/scripts/lib/reference-company-services-cfu.ts apps/api/scripts/consolidate-binational-reference-budget.ts apps/api/tests/benchmark-company-services-cfu.test.ts
```

## Modelo, continuidad y rollback

Codex investigador/implementador/integrador/verificador único en `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`. Rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, revalidados; AGENTS D vigente revisado previamente y mtime sin cambio. Trabajo existente preservado; no se toca fachada C/repo principal.

Elección humana histórica `gpt-6.1-sol/high` de16:46:22Z, conservada en el mismo B2; runtime exacto/modelo/esfuerzo actuales no observables, ningún selector alterado. No invocación Claude/Fable/agentes. Guía`claude-review` usada para único escritor; release fijado`chat-20261002T210626Z`, job`company-services-cfu`. Mantener contexto evita traspaso sin beneficio demostrado; no se cuantifica ahorro. Cuotas5h/semanal/Fable, consumo atribuible y cargos desconocidos, no cero; no nueva lectura ni evidencia vieja restampada. Estimación25–40min, máximo240h del usuario sin cargos adicionales, cero reintentos de proveedor y reevaluación tras dos reparaciones fallidas; no deadline adicional impuesto.

Rollback en memoria recupera exactamente el consolidado previo `5fbd146c04d5ff6a7326002f4a7cc35fd81fcf3bc51266dca42df11c56e8d55f` y prueba `ec02bff778df3b378eec279bd94e95f919102cc81a47866a87824721efa7b5f6`: retirar sólo import/pin/cálculo/hash-loop/salida`companyServicesCfu` y cambiar test68→67. Conservar módulo, JSON y fuentes desconectados; retirar sólo las dos entradas documentales de este corte si se revierte. No se restauraron archivos ni se borró trabajo ajeno.

Siguiente: cerrar comunicaciones/monitoreo y las partidas económicas restantes de empresa, separando costo público calculable de requisitos de una futura contratación. Mantener RC de cruce y alcance del seguro adicional de mercancía pendientes; B2 exige costo íntegro antes de B3 seleccionar/calcular/guardar/reabrir con wireframes MARKSMAN.
