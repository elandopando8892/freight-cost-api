# B2 · primera partida de prima US modelada en el presupuesto

Corte2oct2026,00:39MX. WorktreeD:\andre\worktrees\freight-cost-model\cost-tires-release-20260927; rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, Git/worktrees/AGENTS comprobados. Cambios ajenos preservados. Corte anterior fue progreso: ficha mexicana y integración verificadas; no bloqueo ni espera de proceso imaginado.

## Objetivo y aceptación de este corte

Pasar de componentes aislados a **una partida de prima de planificación US** con importe, alcance, perfil, período y evidencia compatible con el contrato existente. No cerrar B2 ni sustituir su objetivo de costoD2D completo contado/financiado. Cierre del corte: derivación reproducible, fila admitida por auditor, nueve importes desconocidos conservados, original intacto, recálculo sin duplicar referencias y pruebas afectadas PASS. Sin UI nueva: B3 conserva wireframes obligatorios.

## Benchmark y recomendación

| Alternativa | Capacidad concreta / limitación | Decisión |
| --- | --- | --- |
| Progressive solo | Media de prima para responsabilidad y daño físico por power-unit; cargo no resuelto | No tratar como todo el programa |
| Paquete genérico dryvan de Truck Writers | Modelo comercial agregado2026 sin separación suficiente de activo/caja; no observación emparejada | Contraste, no importe adoptado |
| Media Progressive + mediana de cargo Insureon | Publicaciones directas con metodología; hipótesis explícita por unidad/póliza y sin duplicar auto | Escenario de planificación seleccionado localmente |

[Progressive](https://www.progressivecommercial.com/commercial-auto-insurance/truck-insurance/commercial-truck-insurance-cost/) publica926USD/power-unit-mes, transporte for-hire, pólizas nuevas2025 sin infracciones, responsabilidad y daño físico. [Insureon](https://www.insureon.com/trucking-business-insurance/cost) publica1553USD/año de cargo; metodología de medianas de sus clientes, actualización23jun2025. Su129USD/mes es presentación redondeada. Revalidados vía páginas originales este corte. [Truck Writers](https://truckwriters.com/blog/average-cost-of-commercial-truck-insurance/) publica un modelo comercial, no una póliza o muestra común a las anteriores.

Decisión acotada: una unidad de planificaciónUS, tractor de referencia2021 bajo autoridad propia, mercancía general y operaciónUS-only. La media nacional se aplica como proxy al tractor, no como observación de ese activo o Texas. La mediana por póliza de cargo se asigna una vez a esa unidad; no deriva tamaño real de flota de los dos tractores del viaje. La suma **no es media/mediana conjunta**, cotización, póliza binacional ni evidencia de límites/deducibles. Se conservan territorioMX y seguro de caja sin probar; un denominador power-unit no demuestra cobertura o exclusión de caja. Antes de completar B2, la caja necesita tratamiento coherente sin solapamientos. No se presume una segunda prima completa de auto, física de tractor o cargo por cada viaje/caja. Responsabilidad de locales y costo patronal permanecen en sus familias; desconocidos no pasan a cero.

Prima base idéntica para contado y activo financiado, conservando daño físico como hipótesis económica. No representa condiciones del acreedor ni financiación de primas. Prima publicada tampoco es factura itemizada: cargos/impuestos/endosos no observados y alcance real quedan sin certificación. Esto completa el **importe del modelo de prima definido**, no todos los riesgos y términos de un programa real.

## Resultado implementado y trazabilidad

`926 +1553/12 =1055.4166666667USD/mes`; presupuesto a centavos1055.42. Referencia anual12665USD; reconstruir anual desde mes redondeado suma0.04USD, diferencia explícita. No multiplicar129×12 en lugar del anual publicado.

Reutilizado `reference-insurance-employer.ts` y `reconcileBinationalFixedBudget`, sin nuevo motor/infraestructura. El adaptador aplica a una copia de worksheet y sólo llena `US_TRACTOR_INSURANCE` como `DOCUMENTED_PUBLIC_MODEL`; rechaza sobreescritura, otro perfil/mes, cambios de alcance y fuentes duplicadas. La salida incluye `reviewedPublicModelBudget` con evidencia y derivación completas.

Conciliación: **1/10 partidas modeladas**,0calibradas,0facturas emparejadas, nueve importesnull; doce condiciones pendientes, totalesfijos/CFU/CVU/costo/preciosnull. No interpretar1/10 como10%de avance del sprint. Readiness original sigue usando plantilla original vacía: es límite de integración, no prueba de cálculo completo. Se corrigió además la mutación de arrays de referencias: repetir conciliación produce mismas filas sin acumular refs.

45pins. Ficha SHA256 `060d813a21599e0864d26089227df79705c496f9c9e24b6887b4cdf057e4a80a`; HTMLInsureon nuevo `f8a7094abfa99376d3299a7365196b69d67ab331a2ff7ee7080933082228f6dd`; originalworksheet conserva `63629b174897277ce5501f833e9c24a40fdd24e4c2e323e8663366e2a1a24b80`. Progressive reutiliza original previamente archivado y revalidado; no se declara descarga nueva de esa fuente.

## Pruebas y límites

Última ejecución:326/326PASS en seis archivos (195conciliación,35exposición,30presupuesto,33normalización,15modeloUS,18caja). TypecheckAPI PASS. Readback real de45pins/1055.42/1fila/0calibraciones/docecondiciones/salidasnull; diff-check PASS con avisosCRLF preexistentes. Skill `engineering:testing-strategy` enfocó pruebas en aritmética, conservación, trazabilidad, reejecución y rechazos; no build general ni revisión UI innecesaria. No hubo uso operativo/authenticated/producción.

## Modelo, cuotas y ejecución

ResponsableCodex/OpenAI, recomendadoGPT-6.1Sol/alto para conciliación económica: suficiente con fuentes directas y pruebas verificables. Catálogo soporta esfuerzoalto; disponibilidad principal/modelo/esfuerzo exactos no observables independientemente, selector no cambiado. Claude no llamado: repetir investigación o implementación no aporta ventaja concreta aquí; Maxx5 histórico declarado,5h/semana/Fable/reposiciones/ruta incluida/extra actuales desconocidos. Fable no necesario para esta aritmética y delimitación verificable. Sin lectores de credenciales, agentes ni activaciones.

Cuota automática inicial06:18:40UTC/00:18:40MX: ordinario no disponible, principal100%usado/10080min/reposición6oct13:08MX, secundaria desconocida, créditos disponibles observados; continuidad previamente autorizada, no se activó facturación. Es lectura inicial, no medición final. Tokens/cargos/cuota exacta de este corte y ahorro relativo no observables; no inventar porcentajes/reserva independiente. Frente a doble modelo se evitó invocación/contexto duplicados, beneficio esperado no cuantificado.

Límite25min desde06:18:40UTC hasta06:43:40UTC, un reintento por fallo tras diagnóstico. Incidentes: URLProgressive incompleta devolvióerror; se usó URLoriginal existente. `rg`HTMLsinlímite devolvió línea grande, salida limitada y no repetida. Dos patches de pruebas con hunks fuera de orden fallaron antes de aplicarse; se inspeccionó estado y cambió mecanismo a hunks ordenados/locales, sin rollback ajeno. Ejecución ampliada detectó una expectativa vieja de transferenciafalse; actualizada a transferencia explícita de modelo y rerun completoPASS. Consumo de intentos fallidos desconocido, no cero. No escalamiento de modelo ni llamadas auxiliares.

## Pendientes y rollback

Siguiente prioridad: completar capitalUS contado/financiado con hipótesis públicas compatibles, luego restantes familiasMX/caja/admin único y capacidad/ciclo/vacíos/cruce hasta costoD2D completo. No exigir contratos privados para una estimación modelada, no adoptar ofertas/rangos como observaciones conjuntas ni prolongar fichas sin importes. B2 activo; no decisión nueva necesaria para este modeloUS. Matrícula de caja sigue pendiente sin bloquear otras familias.

Sólo localD:. Sin DB/Auth/Neon/usuarios/migraciones/infraestructura/producción/deploy/operaciones de negocio/APIcotizaciones/Google/IAaplicación. Sin commit/staging. Rollback: retirar funciones nuevas de modeloUS, ficha/pin/archivo de prueba/HTMLnuevo y conexión a auditor; restaurar sólo expectativas de conteo0/condiciones15 y bandera de transferencia de este corte. Se puede conservar fix de refs por valor si se desea; no restaurar archivos completos con cambios previos. Worksheet original nunca modificado.
