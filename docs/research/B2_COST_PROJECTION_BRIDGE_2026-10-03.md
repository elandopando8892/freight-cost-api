# B2 — salida calculable por recurso, sin completar ficticiamente el benchmark

## Resultado y frontera

El objetivo B2 sigue siendo el costo D2D completo México DF → Fort Smith 72916 vía Puente III, relevo propio MX/US y una caja 53′, contado/financiado y red/dedicado. El corte previo fue progreso: contraste vial público real; no probó un costo completo.

Antes existían presupuesto mensual, asignación MAX y numerosos componentes proyectados, pero el consolidado no tenía una salida completa calculable desde un presupuesto por recursos con cobertura variable íntegra. Sus outputs nulos reflejan faltantes reales; no son un fallo de login ni un resultado aceptable de B2.

Ahora se añade un compositor local de cierre que recalcula el presupuesto original y aplica la asignación existente, sin aceptar CFU/CVU/totales enviados por el llamador. Con entrada íntegra emite cifras por recurso y suma; con un faltante emite el requisito concreto y conserva el total incompleto. La vía opcional del consolidado distingue explícitamente la entrada del llamador de las 79 fuentes del piloto. **No cambia ni completa el benchmark real por presentar una prueba sintética.**

## Revisión previa y decisión

Se releyeron ADR-007, la revisión de cierre B2, `benchmark-binational-budget.ts`, `fixed-cost-allocation.ts`, `benchmark-public-reference-components.ts`, `benchmark-owned-d2d.ts` y el consolidado vigente. La vía canónica existente requiere sus parámetros nacionales y contiene reglas de caja propia; no se fabricarán esos parámetros desagregando arbitrariamente el benchmark por bloques.

Opciones: (1) conservar sólo nulos/subtotales, insuficiente para la entrega; (2) adaptar la reconciliación mensual y MAX existentes a una salida económica estricta, elegida; (3) reemplazar por un total marginal ATRI/otro TCO, rechazado por solape y falta de composición binacional. No se adopta tecnología, dependencia, servicio, API ni base de datos nueva. La matemática/asignación son reutilizadas; el diferencial sigue siendo la composición binacional y caja/pool únicos.

## Contrato, fórmulas y criterios de cierre del código

- El presupuesto usa el contrato existente: identidad, perfiles, período, fuente, cinco familias fijas y pools conservados. No permite principal o payment total como depreciación/interés.
- Tres recursos únicos: tractor MX, tractor US y caja compartida. Para cada uno: `CFU = MAX(fijo mensual × km ciclo / km productivos mes, fijo mensual × días ciclo / días productivos mes)`. La caja se asigna una vez al ciclo completo; no se suma distancia más tiempo.
- CVU exige 20 conceptos de cobertura definidos por el compositor, no una lista vacía elegida por el llamador. Incluye combustible, ralentí/DEF, compensación integral, desgaste adherido/bobtail, peajes, puente, servicios, viáticos y alcance del seguro adicional de mercancía.
- Cada importe necesita evidencia del perfil/modelo, período, grupo y recurso. Un concepto faltante no es cero. La exclusión conserva importe `null`, motivo y evidencia; su contribución queda fuera de la suma, sin afirmar que el trabajo no cuesta. Un precio cero necesita explicación explícita.
- `costo = CFU + CVU` sólo cuando las dos coberturas están completas. Se distinguen datos sintéticos y planificación pública declarada. Contado/financiado son etiquetas declaradas de la entrada, no contratos observados; la cuota/interés debe provenir del presupuesto, no de la etiqueta.
- No certifica hashes de archivos externos ni aceptación comercial: el esquema comprueba declaraciones, no prueba por sí mismo la fuente o su calibración. `sourceStatus=DOCUMENTED_UNVERIFIED`, `quoteReady=false`, cero adopciones. Compra/venta siguen nulas.

No hay UI nueva, por lo que no se modifica branding ni wireframe. B3 sigue siendo selección, cálculo, persistencia y reapertura con su wireframe MARKSMAN.

## Pruebas y aceptación

Plan de pruebas de `engineering:testing-strategy`: aritmética positiva independiente, MAX temporal, conservación por recurso, orden/determinismo, falta de fuente, tarifa faltante, cero sin fundamento, exclusión, duplicados y ruta distinta. Integración local comprueba que el resultado sintético no sustituya los outputs del piloto ni sus 79 fuentes.

Fixture sintético, no benchmark: presupuesto mensual 1,000 USD, repartido 360/330/310. Exposiciones dan CFU 72/165/77.5 = 314.5; 20 conceptos sintéticos de 10 USD dan CVU 200; costo 514.5. Con diez días de caja domina tiempo y CFU cambia a 392. Estos importes no se trasladan a una base, fuente pública, cotización o cliente.

Validación final después de la última modificación de código/pruebas: **289 pruebas PASS en tres archivos (21 nuevas, 30 de presupuesto y 238 del consolidado), salida 0, 12.06 s**. Typecheck dirigido `--strict --target ES2022 --module ESNext --moduleResolution Bundler --skipLibCheck --esModuleInterop`, PASS, salida 0. Readback real del consolidado por defecto PASS: 79 fuentes fijadas, proyección opcional no suministrada, outputs del piloto incompletos y efectos externos `false`. `git diff --check` y comprobación de espacios finales de los archivos nuevos PASS. No se ejecutó build web ni autenticación/persistencia/producción porque no cambiaron.

Las primeras 19 pruebas nuevas y 238 de consolidación pasaron; una suite heredada no colectó por falta de `DATABASE_URL` al importar Prisma. Se revisó el arranque y los tests, y se repitió con URL sintética local a puerto 1 sólo en el proceso hijo, sin credenciales reales ni llamadas SQL. Resultado intermedio: 287 pruebas PASS en tres archivos. El primer typecheck usó configuración no estricta y falló en inferencia Zod de dependencias anteriores; con `--strict` conforme al tsconfig del proyecto, PASS. Dos problemas de configuración diagnosticados, dos reparaciones locales; no cambios a esos archivos previos, escalamiento de modelo ni reintento de proveedor. Los fallos se conservan, no se cuentan como consumo cero.

La versión final amplía el caso positivo a las cuatro combinaciones contado/financiado y red/dedicado mediante entradas **sintéticas**, no una regla de multiplicación aplicada al piloto. El cierre de B2 requiere además el benchmark público suficiente y los cuatro escenarios reales del alcance, todavía no demostrados.

## Modelo, consumo y continuidad

Responsable/escritor/integrador: Codex, elección humana 2 oct 2026 16:46:22 UTC `gpt-6.1-sol/high`, sin selector principal cambiado ni runtime efectivo observable. Se reutiliza la elección para la misma entrega B2. Claude Sonnet puede realizar este compositor verificable, pero no está elegido; Fable no tiene ventaja demostrada para suplir fuentes faltantes. No se invoca ninguno ni subagentes. La skill `claude-review` aporta registro/snapshot/lease, no inferencia.

Máximo global autorizado: 240 horas; no se impone deadline nuevo por corte ni se promete consumirlo. Límite del incremento: 80 pasos, contexto mínimo 6,500 bytes del registro, cero retries/fallback de proveedor, dos reparaciones locales antes de reevaluar. Cuota efectiva del corte y consumo/cargos son desconocidos; la lectura semanal 11% utilizada de 3 oct 01:58:47 UTC es anterior, no restampada como actual. Ventana 5h, Claude/Fable y reserva cuantificada desconocidos. No activación de uso extra, API ni pago. El presupuesto de contexto del registro no limita el contexto interno de este chat.

## Pendientes y rollback

No hay un costo piloto completo: peajes por el mismo itinerario, tarifa actual Carbonera y otras inclusiones/transferencias siguen requiriendo respaldo y conciliación. Una entrada sintética completa no resuelve esos requisitos ni autoriza operación, infraestructura o producción. La siguiente actividad económica deberá llenar el contrato con el presupuesto y el ciclo públicos reconciliados, no entregar otra pantalla ni sustituir una tarifa ausente por cero.

Workspace físico `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, trabajo ajeno preservado. Tres archivos nuevos y cambio aditivo del consolidado; no commits, branches, despliegues, DB/Auth/Neon/usuarios/infraestructura o negocios. El timestamp 02:34 UTC del campo `context_review` en el contrato fue introducido manualmente y resultó posterior a la ejecución observada de las 02:29 UTC: no usarlo como hora fiable de revisión. Los eventos del kit y salidas reales conservan la evidencia; se registra la discrepancia sin restampar el contrato sellado.

Rollback selectivo: retirar el import, octavo argumento opcional y dos campos de proyección de este incremento, preservando el resto del consolidado y sus cambios previos. Retirar los dos archivos nuevos de código/pruebas y esta ficha sólo si no tienen cambios posteriores. Ningún importe operativo/runtime activo ni las 79 fuentes necesitan restauración. No usar reset global.
