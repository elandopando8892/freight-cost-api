# B2 · compañía: oficina, móvil y patio sin duplicaciones

## Resultado y alcance

Cambio metodológico autorizado: modelos públicos prospectivos con cantidades explícitas; no costos desconocidos convertidos en cero. El objetivo B2 sigue siendo el costo D2D completo México DF → Fort Smith vía Puente III,53′, relevo propio MX/US y misma caja; este corte incorpora componentes de compañía a la composición económica existente, no cierra el piloto ni adopta parámetros.

Trabajo local en D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD4f5fc2de0c3d178dace917231e1092040dec21fd; Git/AGENTS revalidados y cambios previos preservados. Sin rama/PR/commit/deploy nuevo.

## Benchmark y decisión previa al código

1. Adaptar oficina compartida Laredo con servicios identificados: [MileOne servicios](https://www.mileoneinc.com/services/) publica coworking100USD/membresía-mes, espacio compartido, WiFi e impresión/escaneo; acceso entre semana9–22. [FAQ](https://www.mileoneinc.com/faq/) exige membresía por persona que trabaja, no ofrece telefonía y limita domicilio comercial a otros planes si califican. Recomendado como componente prospectivo alineado con el pool administrativo US previo; siete membresías es supuesto, no plantilla observada. No demuestra oficina privada, dirección principal IRP, capacidad de equipo ni operación humana24/7. Disponibilidad e impuestos pendientes. No inferir que agua/luz/limpieza/seguridad/equipos propios están incluidos gratuitamente.
2. Sumar oficina y servicios individuales: reutilizar la oficina CDMX ya investigada mezclaría geografías con el proxy US; TELMEX tiene vigencia histórica vencida y no precio prospectivo actual. Rechazado para esta composición, conservados como alternativas documentales. No sumar internet e impresión otra vez al paquete MileOne. No escoger Launchpad550 automáticamente: elegibilidad y capacidad privada requieren comprobarse, no es550por empleado.
3. Usar porcentajes de agregados sectoriales para gastos restantes: rechazado, no resuelve cantidades/ubicación/inclusiones. Se reutilizan las23relaciones canónicas y el reparto por centavos existente, no nuevo stack, proveedor activado ni infraestructura.

[T-Mobile CoreMobile/Broadband Facts](https://www.t-mobile.com/business/wireless-business-plans): siete líneas tienen baseTOTAL175USD/mes más4.49por línea de cuota proveedor;206.43componente conocido. Sin AutoPay/promoción seleccionada. Surcharges y gobierno varían, importes reales null, no cero; dispositivos y posible alta35por línea no son mensualidad ni evento ejecutado. Son siete líneas administrativas supuestas, no conductor/FTE/camión; ubicación/eligibilidad/roaming prolongado y cobertura ruta no comprobados.

[Outpost Laredo Metropolitan](https://outpost.us/locations/laredo-metropolitan/): combo200USD/mes para un tractorUS y la misma caja; precio introductorio, duración/base futura desconocidas.3%si tarjeta, método real desconocido. Una plaza por pareja es hipótesis de capacidad simultánea, no ocupación observada. Cargar una vez al centro US, sin repetir completo a la caja ni tratar el estacionamiento de miembros de coworking como patio de tractores. PatioMX, almacenamiento fronterizo y servicios adicionales siguen fuera.

Captura MileOne/T-Mobile: extracción estructurada del lector web de fuentes primarias el2oct2026, NO archivo HTTP original ni cotización contratada; valores/locators preservados en JSON versionado. Outpost reutiliza archivo original previo y verifica SHA256. Política nueva pin54:5eb76af7da21df1459d0628f254a03d1bf6b512f61cba278c02e420697790ab5. No refresco silencioso de archivos/pins anteriores.

## Composición y cierre verificable

- Oficina700 + móvil206.43 =906.43USD/mes compartidos una vez por grupo. Más200por plaza comboUS.
- Una pareja:1106.43componentes compañía; MX453.22 y US653.21, caja no recibe una segunda plaza. El cero de reparto de esta partida no significa cero de todos los costos de caja.
- Diez parejas:2906.43para todo el grupo; tres parejas290.65 y siete290.64 conservan centavos por gasto. No multiplicar el pool906.43por diez. Esta sensibilidad NO se une al UCR/cargo/cohorte de una pareja; presupuesto íntegro continúa null.
- Dos composiciones cash de una pareja añaden1106.43a las anteriores31068.45/31237.40:32174.88/32343.83USD/mes mostrados,18líneas únicas. Son sumas parciales de componentes modelados, no costo completo, cotización, gasto observado, límite inferior o rango estadístico.
- Las23relaciones canónicas quedan visibles: cuatro con componente parcial (Internet/Imprenta comparten una identidad, móvil, patio);19sin componente de este corte. Software/TMS y nómina ya están en el pool previo, no se repiten. Ninguna de las23se marca completa; valores completos/CFU/CVU/D2D null, adopciones0.

Criterios del corte cumplidos: integridad de fuentes, cantidades/periodicidad explícitas, conservación por gasto/grupo/recurso, incluidos no duplicados, diez-parejas sin unión incorrecta, originales intactos, error/tamper/idempotencia y outputs completos no falsamente terminados.

Pruebas finales548PASS/19archivos,11nuevas de compañía y un pin adicional verificado; typecheck estricto consolidación/helper/testsPASS. Readback pins54, importes,18líneas, base2 y outputs/externalChanges sin alteraciónPASS. Diff-check sin errores, avisosLF/CRLF previos. Sin fallos de implementación en este corte; no reintentos extra. Validación local determinista, no compra, autenticación, reserva de espacios, teléfono real ni uso operativo. No UI cambiada: wireframes MARKSMAN siguen requisito de B3, no buildfrontend repetido sin motivo. Skill engineering:testing-strategy concentró pruebas en integridad y doble cargo.

## Modelo, cuota y presupuesto

Responsable Codex, único escritor/integrador/verificador. GPT6.1Sol/high recomendado (catálogo visible admite high), modelo/esfuerzo principal efectivo no observables por herramienta, selector intacto. Contexto existente y aritmética verificable hacen suficiente Codex actual; ClaudeSonnet/Fable no resuelven faltantes de datos y duplicar contexto no aporta ventaja acreditada. Ninguna invocaciónClaude: Maxx5/5h/semanal/Fable/inclusión/ruta/usoextra/reposición desconocidos; no cuenta auxiliar ni credenciales leídas.

Lectura soportada09:33:49UTC/03:33:49México2oct: Codex semanal100%usada,5hdesconocida, reposición6oct13:08México; créditos existentes con autorización previa, sin compra/reset/activación. Tokens/cargos reales/cuota de esta actividad desconocidos, no ahorro ni reserva porcentual inventados. Beneficio esperado de ruta única: evitar segunda carga de contexto, no ahorro medido. Límite25min09:33:48–09:58:48UTC, una reparación por fallo diagnosticado; no fallos de cálculo. Cierre de evidencia antes del límite, no escalar modelo para compensar falta de datos. Sin auditor de cuotas instalado.

## Qué sigue y rollback

B2 sigue abierto. Próximo trabajo debe cerrar una composición mensual prospectiva coherente para seguros/permisos/compañía restantes y caja financiada, y conectar capacidad/ciclo serial por recurso, vacíos/frontera/variables hasta CFU/CVU y costoD2D completo. No exigir facturas privadasXBF para sustituir benchmark, ni presentar este corte como salida SaaS. Prioridad es ese resultado íntegro, no otra vuelta genérica deFX/Auth o inventario.

Rollback acotado: retirar política/ficha/helper/test nuevos; retirar import/pin companyPool, su validación/cálculo, proyección partialFixedWithCompanyScenarios y supportingCompanyServicePool de consolidación; revertir únicamente export agregado a splitEqualCents y párrafos de estado de este corte. No restaurar archivos completos ni borrar trabajo ajeno. Sin cambios DB/Neon/Auth/usuarios/migraciones/infraestructura/producción/despliegue/operaciones de negocio/IA de aplicación.
