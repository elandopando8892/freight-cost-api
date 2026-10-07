# B2 · reparto IRP sustentado con tabla pública

## Benchmark y decisión

Tres opciones: tarifa Texas aislada (no representa IRP), distancia real de la flota (método de operación con historial, no sustituible por este viaje), o tabla APVD oficial (alternativa sólo sin distancia en el periodo de reporte). Adaptamos el consolidado con la última como escenario público **no seleccionado**, sin nuevo servicio, librería, infraestructura o autenticación. No cambiamos la base legal del transportista por cruzar Laredo. El reparto por recurso/ciclo es nuestro componente específico; el método IRP es estándar y se adopta documentalmente.

La [tabla TxDMV 2025/2026](https://www.txdmv.gov/sites/default/files/form_files/MCD_APVD_2025_2026.pdf), revisión abril 2026, permite completar el reparto público en 59 jurisdicciones: total 82,631; Texas 35,179; peso 42.573610…%. JSON conserva sólo la columna 2026, NL=0 oficial y todas las demás filas. No es capacidad mensual, distancia de la cotización ni permiso para reemplazar kilometraje histórico real.

El [manual oficial TxIRP](https://www.txdmv.gov/sites/default/files/body-files/TxIRP_Information_Packet_Booklet.pdf), páginas 7-8, establece el uso condicionado de APVD y el reparto jurisdiccional. IRP no incluye combustible/permisos de combustible, sobredimensión, autoridad operativa ni cuotas fuera del convenio. No hacemos solicitud, pago o inscripción.

## Resultado y contrato local

La [tarifa oficial Combination](https://www.txdmv.gov/sites/default/files/body-files/FeeSchedule_CombinationAndTokenTrailer.pdf), publicada actualmente en el índice TxDMV pero con revisión 6/17, ofrece USD 840/año para 70,001–80,000 lb, más 10% TERP y cargos adicionales no incluidos. Se conserva esa antigüedad, sin afirmar que fue emitida en 2026. [Texas Comptroller](https://comptroller.texas.gov/taxes/publications/96-254/interstate-mv.php) confirma TERP anual para placas IRP. No aplicar recargo a token trailer ni a todos los costos del grupo.

Con supuesto analítico de combinación registrada de 80,000 lb, Texas y doce meses: base repartida USD 357.618327…; TERP sobre esa base USD 35.761833…; **componente Texas USD 393.380160/año, USD 32.781680/mes**. Fórmula y reparto del recargo son modelo analítico, no factura confirmada: redondeo/prorrateo y elegibilidad siguen pendientes. Peso registrado no prueba peso fiscal HVUT. El saldo jurisdiccional y cargos locales son null, no cero. NL con distancia publicada cero sigue visible; no se inventa una tarifa NL de cero.

Flujo: originales/hash → tabla íntegra → porcentajes → componentes conocidos y faltantes → permisos parciales. No UI modificada; no requiere nuevo wireframe. Cierre de esta actividad: suma y unicidad correctas, componente reproducible, fuentes alteradas rechazadas, original de permisos intacto, CFU/CVU y presupuesto completo bloqueados. No hay nueva adopción canónica ni persistencia/flujo autenticado probado. B2/MVP continúan abiertos.

Validación ejecutada: **107/107 pruebas** (consolidado 56, registro 21, presupuesto 30), typecheck estricto sin reparación. Readback de texto del PDF cotejado fila por fila: 59 filas, cero diferencias. CLI: salida 2 esperada por economía incompleta, 18 pins, 58 tarifas pendientes, diez importes completos nulos, 15 condiciones/41 incidencias y cero adopciones. Original JSON de registro conserva SHA-256 14cc6c23795d1e0ce38dd8fdf1f5eee4ecff4aa171334a1269497a6569383e99. Evidencia pública y aritmética local, no cotización real/auth/persistencia/despliegue. Las cuatro imágenes de lectura temporales se retiran; originales PDF/HTML preservados.

## Modelo y consumo · 2026-10-01

GPT-6.1 Sol high recomendado para elegibilidad/unidades; medium para implementación y QA. Catálogo desktop admite low/medium/high/xhigh/max/ultra; no acredita acceso efectivo. codex-cli 0.159.2 y Claude Code 2.1.286 observados; Claude Max autenticado no acredita modelos específicos ni cuota/excedentes. No cambio del selector principal, llamada auxiliar o wrapper. Claude no aporta ventaja diferenciada en este corte. Consumo relativo esperado bajo frente a duplicar contexto/revisión, sin tokens o ahorro cuantificables. Presupuesto de 20 minutos para integración/QA, dos intentos por fuente, una reparación antes de reevaluar. No API pagada, contrato ni nueva dependencia.

## Continuidad y rollback

Para terminar IRP faltan tarifas jurisdiccionales compatibles, conversiones oficiales cuando corresponda, condiciones/periodo y cargos adicionales; después conciliar permisos completos con capital/seguros/overhead, capacidad/ciclo y variables para el piloto. No abrir rondas genéricas FX/Auth ni pedir históricos privados. No confundir referencias completas de reparto con presupuesto completo.

Trabajo en D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, branch codex/cost-tires-release-s14, HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd. Cambios previos preservados. Rollback: retirar sólo pin irpModel, lectura/cálculo/proyección IRP y pruebas añadidas, este suplemento y cuatro originales nuevos, y las dos notas añadidas de estado; nunca restaurar archivos completos modificados previamente. Producción/DB/Auth/usuarios/infra/operaciones/IA de aplicación intactos.
