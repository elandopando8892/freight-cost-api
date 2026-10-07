# B2 — contado y financiado sobre el mismo viaje

## Resultado de negocio de este corte

Antes: las referencias de capital financiado US/MX/caja estaban calculadas por separado, pero el componente CFU conectado al viaje sólo usaba capital de contado.

Ahora: ambos modos se comparan sobre idénticos recursos, perfiles, distancia, reloj, capacidad, operador, carretera/frontera y administración. Se reemplazan **tres renglones de capital**, no se añade principal ni mensualidad completa a depreciación. El resultado local desglosa el incremento por tractor MX, tractor US y una sola caja; CVU conocido no cambia por financiar el activo.

**Sigue sin ser un costo D2D completo, una cotización de crédito, un intervalo de mercado ni una tarifa comercial.** Todas las salidas completas siguen `null`: jornada/espera, territorio/custodia, compañía/permisos, bobtail/ralentí/DEF y términos financieros adicionales no se resuelven con una suma parcial. B2 continúa activo; B3 no iniciado.

## Benchmark proporcional previo

| Alternativa | Ventaja / problema concreto | Decisión |
| --- | --- | --- |
| Sumar la mensualidad del crédito al fijo previo | Visible como flujo de caja, pero duplica principal con pérdida de valor/depreciación | Rechazada |
| Pedir ofertas privadas o incorporar otro proveedor para hacer el cálculo | No necesario para una comparación pública prospectiva; ampliaría autoridad, datos y costo | No realizada |
| Reutilizar mercado/cronogramas existentes y sustituir sólo capital | Conserva metodología autorizada, costes por recurso y fuentes; permite aislar efecto del modo de financiación | Implementada localmente |

Capacidad estándar: cronograma de deuda y Zod ya existentes; sin nueva librería, infraestructura, pago o integración. Diferencial: asignación al mismo ciclo binacional y caja serial única, no otro sistema bancario. Sin modificación UI; B3 mantiene exigencia de wireframes MARKSMAN.

## Fuentes y condiciones

- [BBVA Crédito Simple Pyme](https://www.bbva.mx/empresas/productos/financiamiento/creditos-a-corto-y-largo-plazo/credito-simple-pyme.html): lector primario consultado 2 oct 2026, límites fijos MXN 15–38%, apertura 1% + IVA, activo fijo 12–60 meses. CAT informativo 17.2% no se convierte en tasa. Vigencia publicada 27 dic 2026; no elegibilidad, aprobación, contrato o disponibilidad de una caja comprobados. No formulario, cuenta, contacto o contratación.
- [USMFCU](https://www.usmfcu.org/auto-loans), tabla con fecha 24 sep 2026 reconsultada 2 oct: usado semi APR desde 9%, 10% enganche/hasta 72 meses, condiciones y descuento. Se conserva **nominal 9% como hipótesis analítica independiente**, no APR convertido ni oferta propia. Interés medio de 36 meses sobre deuda de referencia existente, no nueva originación.
- [DTFS](https://www.daimlertruck-financialservices.mx/legales/terminosycondiciones): lector actual no devolvió términos extraíbles. Expediente histórico intacto, oferta vencida 31 ago 2026; nominales 11.5/15.7% continúan como hipótesis declaradas, no tasas de oferta vigente. No inferencia ni solicitud para suplir ausencia.
- Mercado/uso/residual/fuentes FX de US, MX y caja reutilizados con los hashes previos y ADR-010 aceptado por el usuario. No nueva tasación, disponibilidad, compra/venta, coeficientes US transferidos a MX/caja o actualización automática de periodos.
- Nueva política `B2_PILOT_FINANCED_CFU_2026-10-02.json`, SHA256 `bc01b7e12e8bc9c2a33fea8184f0b0cbbcfcc1bf24d72bff947de16fb46a9626`. **64 pins** ahora; cinco referencias internas resuelven a campos reales de los documentos fijados. Todas las políticas/archivos previos permanecen intactos.

## Cálculo y conservación

1. Mantener las dos composiciones contado con administración pública escalada. Identificar exactamente capital MX, US y caja y comprobar monto de contado contra cada modelo, identidad de recurso y conservación del presupuesto. No copiar gastos de siete personas a una pareja ni recomponer una flota diferente.
2. Capital financiado US 691.43 frente a contado 472.99 USD/mes. MX 1,440.32 o 1,603.71 frente a 1,016.84. Se mantienen los cronogramas/modelos anteriores: referencias existentes, no deuda XBF.
3. Caja: cuatro combinaciones por tratamiento del valor (dos tasas × dos niveles de deuda), con dos hipótesis independientes de IVA de comisión. Pérdida de valor + interés medio + comisión económica/24; redondear una vez el componente mensual a centavos antes de unirlo al presupuesto. No confundir efectivo de apertura, recuperación de IVA, deuda de adquisición ni gasto mensual.
4. Reemplazar los tres capitales. Mantener idénticos todos los renglones no capital: seguro, permisos parciales, administración/TMS y cuota fija EM del operador. Ninguna otra caja, principal o pago completo añadido. Los diferentes horizontes medios 24/36 meses permanecen explícitos; no son primera factura ni igual fecha de originación.
5. Por recurso, conservar exposición de distancia y tiempo del mismo ciclo; `CFU conocido financiado = SUM(MAX(fijoMensualNuevo × exposiciónKm, fijoMensualNuevo × exposiciónTiempo)) + cuotaEM`. No cambiar divisor/capacidad para reducir el incremento. `CVU conocido financiado = CVU conocido contado`; `diferencia = SUM(incremento capital mensual × MAX(exposiciónKm, exposiciónTiempo))`.
6. **32 presupuestos mensuales de sensibilidad, 128 comparaciones independientes** (dos ciclos/dos interpretaciones de descanso), contra ocho renglones de contado existentes. Son un grid calculado, no 128 sprints, compras, ofertas, rutas distintas o importes que se suman entre sí. Los límites incompletos del ámbito físico y económico se heredan; ninguna combinación se selecciona/adopta en una base.

## Readback real local, no ejecución operativa

Ejemplos elegidos para mostrar el efecto, no para seleccionar un transportista, préstamo o punto central de mercado:

- A: precio anterior de caja neto+IVA; MX nominal11.5%/US nominal9%; caja deuda80%/tasa15%/IVA de comisión recuperable supuesto. Fijo **parcial** mensual 7,505.27 USD; incremento capital por mes MX423.48/US218.44/caja198.56.
- B: alternativa anterior de valor bruto que incluye IVA; MX nominal15.7%/US nominal9%; caja deuda100%/tasa38%/IVA de comisión recuperable supuesto. Fijo **parcial** mensual 8,285.99 USD; incremento capital por mes MX586.87/US218.44/caja646.94.

USD por ciclo conocido. En esta tabla la interpretación del pago MX excluye descanso; la otra interpretación también está calculada, no se añade a ella. Cada columna es **suma parcial de componentes, NO costo D2D íntegro ni precio**.

| Ciclo / ejemplo | Contado parcial | Financiado parcial | Diferencia atribuible a capital |
| --- | ---: | ---: | ---: |
| Red/vacío esperado / A | 3,984.42 | 4,085.15 | 100.72 |
| Misma caja, retorno dedicado / A | 7,471.60 | 7,655.53 | 183.93 |
| Red/vacío esperado / B | 4,005.99 | 4,183.86 | 177.87 |
| Misma caja, retorno dedicado / B | 7,509.60 | 7,831.12 | 321.53 |

No afirmar rango de compra/venta, ahorro observado, piso de costo o tasa efectiva del préstamo. Completar cobertura sigue siendo requisito para usar un resultado integral B2.

## Evidencia de verificación

- Última ejecución después de cambios finales: **302 pruebas PASS, seis archivos**. Financiación piloto21, consolidado223, forecastMX28, ciclo físico9, capitalMX11, capitalUS10. Conservación/identidades/capital/IVA/MAX, no duplicados/cambios a originales; perfiles y agregados inconsistentes rechazados. Pruebas económicas locales/sintéticas, no Auth, persistencia, aceptación SaaS o facturación real.
- **TSC estricto PASS, exit0**, helper/consolidado/tests, después de última modificación. Intento previo falló por tipado del test inválido diez parejas sobre literal1: prueba corregida mediante nuevo objeto, sin ampliar el modelo válido. Se corrigió referencia de documentación a un campo inexistente y se añadió comprobación de los cinco pointers; se añadió rechazo de total físico inconsistente. No retries de inferencia ni fallos invisibles/consumo cero presumido.
- Readback real del consolidado: 64 pins, 32 presupuestos/128 filas, mismo CVU y ocho anclas contado intactas; seis outputs `null`; todos los flags externos DB/Auth/users/infra/deploy/business/applicationAI false. Una consulta diagnóstica inicial usó un nombre de propiedad incorrecto (`sensitivities` frente a `scenarios`); se corrigió la consulta, no la aplicación.
- `git diff --check` PASS; avisos CRLF previos, sin error. No build web innecesario ni UI editada.
- Worktree/ramas/HEAD comprobados: `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`, `codex/cost-tires-release-s14`, `4f5fc2de0c3d178dace917231e1092040dec21fd`. Sin commit/push/ramas/PR/previews/deploy, Auth/Neon/DB/users/infra/migraciones/proveedores ni operaciones de negocio. No se leyó historial privado.

## Modelo, presupuesto y límites

- Codex **gpt-6.1-sol/high**, elección humana existente 2 oct 16:46:22 UTC conservada; único investigador/escritor/integrador/verificador. No cambio del selector ni metadata runtime automática observable. Claude candidato equivalente con traspaso/contexto no usado; Fable no justificado por fallo de razonamiento. Sin agentes o llamadas auxiliares/instalaciones.
- Máximo240h continúa siendo autorización de tiempo, no gasto adicional, obligación de consumo, automatización ni garantía de ejecución24/7. Estimación inicial45–60min para este corte, no deadline/idle timeout impuesto; correcciones/QA dentro de actividad. Cero reintentos automáticos; una reparación diagnosticada y reevaluación ante fallos distintos o ampliación de autoridad. El registro de elección no se restampa como confirmación nueva.
- Skill `claude-review` guió elección única/escritor/contrato; release nuevo fijado `D:/andre/apps/codex-home/integrations/claude-review/releases/chat-20261002T191245Z/app`, manifest comprobado sin discrepancias, admisión scoped por raíz física. No modificación/instalación del kit ni llamada headless Claude. Nuevo job `.../data/handoffs/freight-cost-model/b2-closure-240h-20261002/pilot-financed-cfu.json`, lease `3aa37151ea714af9842a6e668174ef1b`, liberación al cierre tras comandos terminales comprobados. Leases no garantizan aislamiento OS de procesos ajenos.
- Cuota Codex no refrescada: observación soportada previa de2oct aproximadamente18:20UTC semanal100%/`ordinaryUsageAllowed=false`, reposición6oct13:08México; cinco horas no devuelta. No presentar como cuota fresca ni inferir capacidad/costo cero del hecho de que el host continuó. Claude Max5h/semana/Fable/usoextra desconocidos y no usados.
- Tokens/caché/razonamiento, cuota/cargo de esta actividad y ahorro frente a otra opción desconocidos. Reserva por alcance/pruebas, no porcentaje inventado. No créditos, resets, rutas API, recargas o cargos habilitados; intentos fallidos no se cuentan como consumo cero.

## Recuperación selectiva comprobada

No `reset/checkout` global ni restaurar archivos completos que ya tenían trabajo ajeno. Antes de revertir comprobar que sólo estén los hunks de este corte:

- Del consolidado retirar import `reference-pilot-financed-cfu`, pin `pilotFinancedCfu`, sus dos líneas de llamada y propiedad `supportingPilotFinancedCfu`; expectativa de pins64→63. La reconstrucción **en memoria, sin escribir** produjo exactamente SHA previo consolidado `d9065c125551d8bdf015fa7bc6ceec912ca04050f5a9971de0659032de91c55c` y test `cbc494297c1a48ca9f2fb134ee8e2d481d870787186e52ca74db1361d013086e`. Esto prueba reversibilidad de los hunks presentes, no de cambios futuros ni backup de todo el repo.
- Sólo los cuatro archivos nuevos helper/test/política/este checkpoint y sus dos párrafos de estado pueden retirarse después de preservar este entregable si se solicita rollback. No tocar otras investigaciones/helpers/tests ni archivos fuente anteriores.
- Hashes posteriores: helper `d6070ac738639346e46104719c8a3a834ba1fd6eefacca1eb57ab3f064c3702b`, test financiero `877c19d87eb2fb41aedbef59980babb419cc516af81eeba51e2453b17d1c1c68`, consolidado `eaaa093e57d0cbaa9dad873dd5dcb8dadff443a1be21a5ee5d3b626c8419b972`, test consolidado `167af0c236e4c70053909bd44c6679d97d2c73dfac462d36aff95bdc1250a2ab`. Comparar antes de aplicar cualquier reparación futura.

## Siguiente entrega B2

Valorar jornada/esperas y cerrar alcance físico/territorial/monetario pendiente con referencia pública compatible hasta **costo íntegro reproducible de ambos modos**. No otro grid o inventario como sustituto del objetivo. Después B3 seleccionar → calcular → guardar → reabrir, permisos/persistencia reales y wireframes MARKSMAN. Sin decisión menor pendiente; pedir autorización puntual ante gasto/efecto externo o cambio material adicional.
