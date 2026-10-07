# B2 · comparación de capital US contado/financiado, no cierre artificial de la familia

2 octubre 2026. Objetivo íntegro B2: costo D2D reproducible México DF–Fort Smith vía Puente III, relevo propio MX/US y misma caja seca53′, contado y financiado. No sustituirlo por esta comparación parcial. Rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`; trabajo en D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927. AGENTS/Git/worktrees revisados; cambios previos conservados.

## Antes y ahora

Antes había depreciación condicional por uso e información APR, pero no comparación US conectada al mismo uso con intereses separados de la mensualidad. Ahora hay cinco alternativas reproducibles; mismo activo y kilometraje en depreciación/divisor. Ninguna alternativa se selecciona ni se suma con otra. Se conserva el presupuesto parcial anterior: una prima US modelada, nueve familias con importe desconocido; capital no pasa al presupuesto.

## Benchmark previo y decisión

| Enfoque | Ajuste y límite | Decisión |
| --- | --- | --- |
| Tratar precio anunciado y APR como costo total y tasa nominal | Fácil, pero omite cargos publicados como excluidos y convierte conceptos financieros distintos | Rechazado |
| Valorar prospectivamente un tractor ya existente desde su valor de mercado | Puede servir para estimación, pero cambiaría la base de adquisición y el alcance económico | No adoptado en este corte; requeriría decisión metodológica explícita |
| Reutilizar pérdida de valor/capacidad, cronograma de deuda y puente de correcciones | Conserva metodología, identifica importes calculables y faltantes sin inventarlos | Implementado como investigación, no costo completo |

Reutilizados `reference-debt-schedule.ts`, método ANL y escenarios de exposición existentes. Sin otro motor, dependencia, proveedor ni infraestructura. No UI modificada; B3 mantiene wireframes MARKSMAN obligatorios.

[Ryder stock526505](https://www.ryder.com/en-us/used-trucks/inventory/oklahoma/oklahoma-city/tractor/tandem-axle-sleeper-tractor/2021/freightliner-mercedes/new-cascadia-px12664/526505) publica40495USD sin impuestos/cargos; anuncio y mantenimiento no certifican disponibilidad, estado, supervivencia ni odómetro actual. ANL21/4 conserva coeficientes históricos de anuncios2019 US, no tasación2029 ni método transferido a MX/caja. Capacidad PAMT es proxy combinado condicional, no observación conjunta del VIN ni futuro US-only.

[Trucker To Trucker](https://truckertotrucker.com/sell-your-commercial-truck) publica49USD por anuncio único, sin comisión/mensualidad. Sólo se modela ese componente de una alternativa de venta directa; no todos los costos de disposición, precio realizado, impuesto, reacondicionamiento o tarifa futura garantizada. GET directo bloqueado por Cloudflare: contenido revisado mediante lector web, sin archivo original ni hash inventados. No crear anuncio, pagar, contactar ni vender.

[USMFCU](https://www.usmfcu.org/auto-loans) publica9% APR desde,10%enganche y hasta72meses para semi usado. No publica tasa nominal/cargos completos ni demuestra elegibilidad binacional. La sensibilidad **9% nominal** de este corte es una hipótesis analítica declarada, **no conversión del APR ni tasa contratada**. El cronograma usa principal sobre precio anunciado, pagos mensuales nivelados, sin gracia/balloon como hipótesis; impuestos/cargos financieros del principal no resueltos. Un cero auxiliar excluye cargos del cronograma aritmético: no dice que el prestamista cobra cero. Cargo financiero económico/prepago desconocido permanece null fuera del cronograma.

## Resultado reproducible

`q=.9071^(N/12) × .999^(kmMes/1.609344 × N/1000)`; residual bruto=`40495×q`.

`Capital=(40495-residualBruto+ajusteAdquisición+49+otrosCostosDisposición)/N + interesesDelEscenario + asignaciónComisiones`.

N=36 es ventana de comparación, **no vida remanente acreditada**. No agregar odómetro actual al exponente incremental. Descuento de adquisición documentado puede producir ajuste negativo: los componentes no son piso de costo/CFU.

Ejemplo condicional H12026:11307.27187594km/mes; pérdida de valor472.99180877USD/mes y anuncio49/36=1.36111111. Componente contado **474.35291988USD/mes**. Sensibilidad de deuda: principal36445.50, interés promedio primeros36meses **218.43498551USD/mes**; componente financiado **692.78790539USD/mes**. Pago656.94971487USD/mes es flujo de caja, NO costo que se agregue a depreciación. Saldo al mes36:20658.96974328USD, liquidación de principal no segunda depreciación; costos de prepago no acreditados. No calcular interés mensual multiplicando directamente el APR por deuda estática.

Estos importes son componentes, no capital completo ni CFU/CVU ni cotización. Ajustes de adquisición/disposición/comisiones siguen null. Costo de oportunidad del capital propio sigue pendiente separado, no implícitamente cero. Cinco alternativas no forman un rango estadístico y no se suman.

Ficha SHA256 `bb5145b51dc22afc7e6d0faa2f1150ffd1223d280587926149c9459efc5e43bc`,46pins. Original worksheet sigue `63629b174897277ce5501f833e9c24a40fdd24e4c2e323e8663366e2a1a24b80`. `supportingUsCapitalComparison` enlaza fuentes/hipótesis/capacidad y comparación; `US_TRACTOR_CAPITAL` sigue null. Las seis salidas finales siguen null; B2 abierto, cero calibraciones/adopciones.

## Verificación y límites

369pruebas PASS en8archivos: raíz197, exposición35, presupuesto30, deuda25, seguro patronal33, nuevo capital16, primaUS15, caja18. APItypecheck PASS. Typecheck estricto adicional de helper/script y ambos archivos de pruebas PASS (tsconfig API habitual sólo incluye src, no confundir sus alcances). Readback local46pins/cinco alternativas/una fila modelada/seisoutputsnull, diff-check PASS. Pruebas cubren no doble principal, saldo, mismo activo/uso, null vs0, tasa0, fin de deuda, descuento, entrada inválida y recálculo sin mutar. Skill `engineering:testing-strategy` guió selección por riesgo financiero. No prueba autenticada ni flujo real de compra/crédito/venta/cotización.

Incidentes preservados: búsqueda de rutas documentales con nombre/glob inexistente dioexit1; se resolvió con inventario, sin editar objetivos antiguos. Captura original nueva bloqueada, no bypass ni archivo falso. Primera prueba nueva usó nombre de campo inexistente; corregida a `completeAmountUsdPerMonth`, rerun PASS. Ampliación de pruebas detectó expectativa histórica0filas/15condiciones en prueba de deuda: actualizada a prima existente1/12 y chequeo capitalnull, rerun completo PASS. Un nombre de suite antiguo no correspondía a archivo; ejecución final usa nombre real. No atribuir consumo0 a fallos. Advertencia CJSVite/lineendings no errores de negocio. Sin cambios de implementación tras último rerun.

## Responsable, modelos y consumo

Codex único responsable de escritura/integración/verificación. OpenAI GPT‑6.1Sol/high recomendado para investigación y puentes financieros; modelo principal/esfuerzo exactos no observables por herramienta, selector no cambiado. Sin agente/CLIClaude. Aritmética verificable y contexto ya local no justifican duplicar consulta; no afirmar contribución de Claude. Fable no se invoca para resolver falta de datos públicos.

Lectura automática Codex06:42:37UTC/00:42:37MX2oct: ventana observable10080min100%utilizada, siguiente reposición6oct13:08MX; ventana5h no observable, crédito disponible y consumo continuado previamente autorizado, sin activar facturación. ClaudeMaxx5 es declaración histórica; cincohoras/semanal/Fable/reposición/ruta suscripción/uso extra actual desconocidos, no llamadas. Tiempo límite25min hasta07:07:37UTC, un reintento por fallo tras diagnóstico. Costos reales, tokens de este corte y porcentaje de cuota consumido no observables; no inventar ahorro ni reserva cuantificada. Mantener tiempo/contexto/reintentos acotados; no escalar por fuente bloqueada o dato faltante.

## Pendientes y rollback

Capital US necesita alcance de adquisición/disposición y financiación públicos compatibles antes de llenarse como modelo completo. No exigir contrato privado para estimación, pero tampoco usar tasa/cargo desconocido como cero. Continuar familias MX/caja/pool único y capacidad/ciclo completo para costoD2D; luego B3 calcular/guardar/reabrir. No cerrar sprint por cantidad de pruebas o fichas.

Sólo cambios locales D:, sin DB/Auth/Neon/usuarios/migraciones/infraestructura/producción/deploy/Google/IAaplicación/operaciones de negocio. Sin commit/staging ni selección real de financiación/venta. Rollback por hunks: quitar import/pin/conexión/refs nuevos de raíz, nuevo helper/test/ficha y párrafos de estado de este corte. En prueba deuda, retirar sólo actualización de conteo si también se retira prima anterior; no restaurar archivos completos ni perder cambios ajenos. No se modificó worksheet original ni motor de cotización.
