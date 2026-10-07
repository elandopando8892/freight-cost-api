# B2 · seguro comercial del tractor mexicano durante el cruce

## Resultado y decisión

El seguro doméstico del tractor y el del tractorUS ya tenían escenarios públicos; la incursión del tractorMX enEE.UU. seguía sin una exposición económica delimitada. Ahora el consolidado calcula dos alternativas **excluyentes**, sin añadir una prima inventada: temporal por incursión(CVU), o anual por recurso(CFU). Se reutiliza el calendario ordinario existente; no se construye otro motor ni se modifica UI. B2 aún no entrega un costo completo.

El turno anterior fue progreso: la ruta postal734.4mi/697min movió toda la cadena económica. Este corte añade evidencia primaria y exposición concreta del seguro restante, no sólo un nuevo inventario de preguntas.

## Benchmark público previo

Lectura3oct2026UTC; eCFR muestra título49 al1oct2026. [49CFR387.7(b)(3)](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-387/subpart-A/section-387.7) permite cobertura24h o más para transportista domiciliado enMéxico, exclusivamente municipio/zona comercial fronteriza, con certificado part368, asegurador compatible387.11 y prueba fechada/MCS90 a bordo. Es una modalidad regulatoria, no prueba de autorización del piloto ni producto comprado. [387.9,tabla1](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-387/subpart-A/section-387.9) publica750000USD para carga general no peligrosa for-hire con GVWR10001lb o más: **suma mínima de responsabilidad, nunca prima**. Clasificación de mercancía y elegibilidad siguen como hipótesis, no hecho confirmado.

| Alternativa | Ajuste, evidencia y decisión |
|---|---|
| Temporal comercial de cruce | Modalidad soportada porCFR. Modelar cada intervalo de incursión y compararCVU; no precio de lista localizado en este barrido. No afirmar que todos los aseguradores venden bloques24h a tarifa lineal. |
| Anual comercial Crossborder | [QPI](https://www.qualitaspremier.com/Home/Products?lang=en) describe vehículos comerciales domiciliados enMéxico que entran aEE.UU., responsabilidad básica y daños materiales/carga adicionales. Delimitar responsabilidad sin repetir daños propios; no tomar descripción como cotización, disponibilidad de cuenta o aceptación de riesgo. |
| Reutilizar926USD/mes como RC extranjera | [Progressive](https://www.progressivecommercial.com/commercial-auto-insurance/truck-insurance/commercial-truck-insurance-cost/) declara promedio2025 por unidad motriz para responsabilidad **y** daños materiales, nuevas pólizas sin infracciones. Rechazado para esta fila: no separa RC ni demuestra elegibilidadMX; sumarlo al paquete doméstico duplicaría cobertura sin justificación. |

La búsqueda no demuestra que sea imposible hallar otro benchmark, sólo que estas fuentes no proporcionan una prima numérica compatible. Tablas para vehículoUS enMéxico, turista/boxtruck personal, mercados de otros países y agregados de primas sin unidad/exposición comparable se descartaron; no se ajustan mediante porcentajes arbitrarios. La guíaTIMI de cruce redirigió en lectura directa al landing doméstico: el texto de búsqueda cacheado no se convirtió en fuente numérica vigente. Sin formularios, contactos, cuentas, solicitud de póliza, IA auxiliar ni API facturable.

## Exposición y fórmulas conectadas

El intervalo comienza al inicio del cruce norte y termina al final del sur emparejado. Incluye handoff, pausas y noche intermedia; no suma sólo minutos trabajados. Es una envolvente prospectiva conservadora, puede contener colas ladoMX y carece todavía de aproximación gate–yard completa. No es permanenciaUS observada ni itinerario ejecutable; el planner permite tareas divididas entre jornadas.

| Escenario | Ventanas en el reloj del piloto | Bloques24h equivalentes condicionales | Fracción de prima anual asignada al servicio |
|---|---|---:|---:|
| Red/vacío esperado |30.831383→51.731383h;20.9h|1|0.010629995658961887|
| Dedicado/misma caja |primera20.9h;120→125.4h;5.4h|2|0.028389957061372432|

Para la hipótesis temporal lineal: `CVU_cruce = precio_24h × suma(ceil(horas_incursión/24))`. La norma exige duración mínima, no esta tarifa. Una ventana dividida en tareas no crea varios certificados. Cuatro movimientos del dedicado forman dos incursiones. Sus24h se modelan separadamente, no se supone una compra global óptima ni inicio obligatorio a medianoche.

Para alternativa anual: `CFU_cruce = prima_anual × MAX(km_MX_ciclo/km_MX_mes, días_MX_ciclo/24) /12`. Reutiliza asignaciónMAX existente, un tractorMX, no segundoUS/caja/admin. Es asignación condicional con km conocidos; no utilización anual observada. No se suma temporal+anual. La igualdad por servicio sería `precio_24h = prima_anual × fracción_anual / bloques`: coeficientes0.010629995659(red) y0.014194978531(dedicado), **no recomendación de compra de póliza para una flota**.

El margen inicial a24h es3.1h: una sensibilidad de5h de espera eleva esa ventana a2bloques. Completar la aproximación y recalcular el reloj es necesario antes de elegir cobertura. No congelar1/2 como requerimiento operativo real. Ambas primas/importes yCFU/CVU/costoD2D completos permanecennull. Los272comparativos parciales previos conservan sus importes; esta etapa no convierte el faltante en cero.

## Implementación y verificación

Adaptador `reference-crossborder-insurance.ts`, ficha fechada con cuatro referencias primarias/paráfrasis/locators y conexión como `supportingCrossborderInsuranceExposure` en el consolidado. **76pins**,75anteriores intactos. FichaSHA256 `cfce41e1d640f201038a47f971df1feb83d74b5a264c850670456f15f7d7aff5`. Lecturasweb primarias no archivadas como HTML: el pin fija la ficha y su interpretación, no garantiza identidad futura de la página. No atribuir archivo original que no existe.

**288pruebas/4archivosPASS** después de la última edición de código/pruebas: cruce11, consolidado235, jornada14, ciclo28. Typecheck estrictoESNext/Bundler de los4TSeditadosPASS. Readback local76pins, ventanas/coefs anteriores, seis outputsnull y todas accionesexternasfalse; `git diff --check`PASS con avisosCRLF previos. Los nuevos untracked se verifican por ejecución/tipos/lectura, no por ese último comando. Incluye fuente/precio/aprobación adulterados, topology/recursos duplicados, ausencia de movimientos, reloj inconsistente, espera25.9h, determinismo, no mutación y fixtures monetarias postales conservadas.

Primera corrida259/260PASS: una línea de fixture consultó `cashScenarios` inexistente en patioMX; se corrigió a `cash` y verificó el importe existente, no se modificó fórmula para pasar. Repetición final288PASS, proceso terminadoexit0 incluidaTSC. Fallo registrado; consumo no observable, no contado como cero. No buildsfrontend repetidos, UI, autenticación, persistenciaDB o prueba operativa atribuida.

## Ejecutor, consumo y alcance

Codex único escritor/verificador. Elección humana registrada `gpt-6.1-sol/high`2oct16:46:22UTC, mismaB2autorizada240h; runtimeprincipal/esfuerzo no expuestos por estas herramientas, selector sin cambio. Continuar contexto existente permite comprobar asignación/exclusión con pruebas; una llamadaClaude/Sonnet oFable no resolvería una tarifa no publicada ni acredita elegibilidad. No se invocan candidatos auxiliares, no acceso/condiciones de planClaude inferidos del catálogo histórico.

CuotaCodex lectura automática soportada3oct00:31:48UTC: uso semanal10%, ventana10080min, próximoresetUnix1791580450; ventana5h no disponible. Datos iniciales, no saldo final tras este trabajo. CuotasClaude5h/semanal/Fable y reposiciones actuales desconocidas, no se piden credenciales ni se instala lector. Sin porcentaje de reserva/ahorro/costo inventado ni conversión de tokens a cuota. Presupuesto contrato80pasos, contexto6000bytes de paquete auxiliar máximo(no usado), cero reintentos de proveedor y hasta2reparaciones antes de reevaluar; máximoB2de240h, no nuevo plazo obligatorio por corte. Una reparación local, cero inferencias auxiliares observadas; consumo de la sesión/Codex principal no cuantificado aquí.

Skill `claude-review` utilizada sólo para elección/checkpoint/lease; APP fijadochat-20261002T232232Z. Jobcrossborder-insurance-exposure, lease6a45ee2aeabe4cd7a6c147d915ac73ef. Modelo efectivo desconocido sólo afecta metadata de cierre del kit, no implica impasse del objetivoB2. No escritor concurrente ni procesos externos iniciados.

Raíz físicaD:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD4f5fc2de0c3d178dace917231e1092040dec21fd comprobados. Sin cambiosAuth/Neon/BD/usuarios/infra/migraciones/producción/deploy/commit/push/operación comercial. Cambios ajenos preservados. No wireframe nuevo porque no hay cambioUI; B3mantiene requisitoMARKSMAN.

Siguiente: resolver aproximación/bobtail y benchmark tractor-only, y seguir la prima comercial comparable mediante evidencia pública delimitada. No exigir contabilidad privada para la estimación pública ni sustituir este entregable por un inventario: B2activo y costo completo aún pendiente.

Rollback selectivo: retirar import, pin76, llamada y campo nuevo del consolidado; volver la expectativa de pins a75; conservar o retirar sólo adaptador/test/ficha/documento nuevos tras comprobar cambios posteriores. No tocar75pins originales, fixtures previas, narrativas fuente, archivos ajenos ni restaurar ficheros completos. Sin reset/checkout general ni borrado de directorios.
