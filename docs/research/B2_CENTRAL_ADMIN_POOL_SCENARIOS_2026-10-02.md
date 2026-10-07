# B2 · administración central: compensación completa de referencia y reparto único

2 octubre 2026. Desarrollo y comprobación local; no publicación. B2 permanece abierto hasta entregar el costo íntegro del piloto México DF–Fort Smith AR72916, Puente III, caja seca53′ y relevo propio MX/US conservando la misma caja, con CFU/CVU y escenarios contado/financiado. Este corte aporta costos y reparto reproducibles, no sustituye ese objetivo por el inventario.

## Antes, ahora y límites

Antes había salarios por rol, FICA parcial, hipótesis MX de monitoreo y servicios unitarios sin una escala común ni reparto. Ahora una alternativa prospectiva de administración central US utiliza **compensación patronal por hora trabajada**, sin transformar el salario OEWS con un porcentaje universal ni duplicar prestaciones. Contiene siete funciones distintas,3.7equivalentes funcionales y592horas trabajadas/mes. No prueba siete contrataciones, una plantilla factible, servicio24/7 ni una flota real de XBF.

| Función | Equivalente funcional supuesto | Horas trabajadas/mes | Proxy patronal USD/h | Componente mensual USD |
|---|---:|---:|---:|---:|
| Dispatcher |1|160|36.73|5876.80|
| Traffic manager |0.2|32|88.63|2836.16|
| Operations manager |0.2|32|88.63|2836.16|
| Sales manager |0.1|16|88.63|1418.08|
| Safety manager |0.2|32|73.69|2358.08|
| Tracking/CS |1|160|36.73|5876.80|
| Billing/admin |1|160|36.73|5876.80|

Total del modelo patronal **27,078.88 USD/mes**. Fuente ocupacional nacional privada, no salarios camioneros de Laredo ni nómina MX. Se añaden **483 USD/mes publicados de TMS** (siete cuentas nominativas Basic×69), una sola identidad para Software/Subscriptions. Impuesto de TMS y otros servicios no resueltos, no cero. No se contrata ni instala TMS; es una referencia económica para el transportista modelado.

Se conservan dos sensibilidades no seleccionadas con el MISMO equipo funcional, para mostrar la dependencia de escala, no afirmar que atiende cualquier flota:

- Una pareja MX/US y una caja:27,561.88USD/mes de estos componentes a la pareja;13,780.94 a cada tractor.
- Diez parejas y diez cajas: el mismo pool completo27,561.88 se distribuye, no se repite diez veces. Ocho parejas reciben2,756.19 y dos2,756.18 por redondeo conservado. Primera pareja:MX1378.10/US1378.09; no se añade nuevamente el pool entero.

Orden explícito: gasto→pool mensual único→parejas→tractores por conteo de power units. Se conservan centavos por cada gasto y para toda la flota. El centro caja no recibe una segunda administración dedicada bajo este driver explícito; esto NO declara gratuitos los gastos desconocidos de caja. La misma persona real no puede acumular horas duplicadas entre funciones. La escala es un supuesto del modelo, no un coeficiente observado de camiones por empleado.

Se integraron dos composiciones parciales de referencia en `partialFixedWithSharedAdminScenarios`, manteniendo la caja única y las alternativas previas de capital:31,068.45/31,237.40 USD/mes para una pareja. La alternativa de diez parejas permanece sólo como sensibilidad administrativa en `unjoinedAdminScaleScenarios`: exige recalcular UCR por entidad/bracket, alcance de póliza cargo y cohorte de recursos antes de unir el presupuesto. No reutilizar los importes de una unidad como si fueran compatibles con diez. No son tarifas, costos observados, límites inferiores ni presupuesto fijo completo; sólo sumas condicionadas de componentes. Todos los costos D2D, CFU y CVU completos siguen null. Baseline original0filas, presupuesto base2y escenarios cash previos5intactos; no se rellenó `GROUP_ADMIN_COMPANY_SINGLE_POOL` ni se adoptaron parámetros.

## Benchmark proporcional antes del código

Se inspeccionaron Git, componentes Zod/TypeScript de nómina, instalaciones y presupuesto binacional, fuentes públicas archivadas y métodos de reparto existentes. Tres enfoques:

1. **Detalle salarios+cuotas**: conservar para los contrastes MX/US existentes; es adecuado para una plantilla definida pero FICA no es costo patronal completo. Completar todo por impuestos de cada persona/contexto antes de modelar consume investigación adicional. No duplicarlo dentro de la nueva alternativa.
2. **Otros gastos de transportistas/sector**: rechazar como administración aislada; los agregados disponibles mezclan conductores, mantenimiento, seguros y conceptos no administrativos, sin exposición compatible. No dividirlos arbitrariamente entre23campos.
3. **ECEC nacional por grupo ocupacional y hora trabajada**: adaptar como alternativa patronal prospectiva con cantidades explícitas. Incluye prestaciones y evita inferir ratio desde otra muestra salarial. No precisa librería, infraestructura o proveedor nuevo. Se eligió para un componente reproducible, con limitación geográfica/ocupacional clara, no como nómina legal calibrada o demostración de viabilidad del servicio completo.

La distribución de costos es una capacidad estándar: se implementó dentro de los normalizadores existentes, sin otro motor. La composición propia del piloto por recursos y sus vínculos documentales se conserva; no se declaró innovadora para justificar arquitectura nueva. Sin cambios UI: wireframes MARKSMAN corresponden al recorrido B3, no a este cálculo local.

## Fuente y vigencia

[BLS ECEC tabla4](https://www.bls.gov/news.release/ecec.t04.htm), junio2026, primer bloque Occupational group bajo Private industry:office/admin36.73,management/business/financial88.63,professional/related73.69 USD/h de compensación total. No usar filas repetidas de industrias anidadas: resultados de búsqueda mostraban38.92/39.33 para otras poblaciones. Lectura directa de la tabla confirmó el bloque nacional correcto.

[Nota técnica BLS](https://www.bls.gov/news.release/ecec.tn.htm), modificada9sept2026: unidad por hora **trabajada**, no hora pagada; beneficios abarcan descanso remunerado, pago suplementario, seguros, retiro y aportaciones obligatorias. Estas últimas incluyen SocialSecurity/Medicare/desempleo federal-estatal/workerscompensation. No añadir esos costos otra vez ni aplicar beneficios US a empleados MX.160h trabajadas mensuales son hipótesis explícita; no2080/12horas pagadas, ni calendario laboral demostrado, ni actualización inflacionaria inventada para octubre.

Readout estructurado de lectura web primaria (no originalHTTP):`sources/BLS_ECEC_ADMIN_READOUT_20261002.json`, SHA256 `28a5286c1d6f11d148096ba3852d587971c94d3c4bde8a1050abcec354eb3e82`. Política:`B2_CENTRAL_ADMIN_POOL_SCENARIOS_2026-10-02.json`, SHA256 `eb62ffdd98781fbb04b48849bd69fbdfe32f7f43621ea93b45625241ce3800f8`. La consolidación contiene53documentos fijados y comprueba los archivos usados antes de calcular.

[AscendTMS](https://www.thefreetms.com/pricing) revalidado en lectura pública:69/119/149 USD por usuario/mes, sin cargo por camión/driver/load; loadboards externos pueden requerir suscripción. Se usa sólo Basic, siete cuentas; no trial ni descuento presumido. Original archivado1oct conserva SHA `b5f8a2f056dce186b195a0a1fe70890c55a21f43896d41cac82000400b03bd11`.

[BlankSpace](https://blankspace.com.mx/) revalidó oficina colaborativa12,599MXN antes de IVA/mes,2–3personas y servicios incluidos. [Outpost Laredo](https://outpost.us/locations/laredo-metropolitan/) revalidó combo200USD/mes promocional de duración no determinada. Se conservan como contrastes: no se combinan silenciosamente con empleados US como si fueran una oficina compatible completa, ni se certifican disponibilidad/impuestos. La alternativa actual relaciona sólo los dos campos Software/Subscriptions con TMS; los otros21conceptos de compañía no están completados por este corte.

## Pruebas, consumo y ejecución

Criterios del corte: siete funciones únicas, alcance patronal correcto por hora trabajada, no ratio OEWS/beneficios MX, una licencia por cuenta, conservación exacta de cada pool en cada escala, unión a los componentes previos sin duplicar caja, originales preservados y costo íntegro no declarado antes de tiempo.

Pruebas finales:536PASS en18archivos, incluidos13casos nuevos; typecheck estricto de consolidación y tests de administración PASS, readback de importes/centros/baseline/salidas y hashes PASS; diff-check sin errores, sólo avisosLF/CRLF de trabajo previo. Pruebas locales deterministas, no sesiones autenticadas, publicación ni uso operativo. Sin cambios de API`src` en este corte; no se repitió buildfrontend o integración cloud sin motivo.

Un fallo del primer pase: antiguo test de instalaciones esperaba0filas/15condiciones en presupuesto base, aunque capital y seguroUS del corte anterior ya daban2filas. Se corrigió para conservar la comprobación del original0y exigir importe admin null/condición faltante explícita, además del base2ycalibración0. No se quitó la prohibición de cerrar overhead. Regresión completa repetida después de la corrección y de la última actualización del pin.

La revisión de coherencia adicional detectó que el reparto administrativo a diez parejas no rebasa automáticamente UCR y cargo por entidad. Se eliminó esa composición conjunta y se agregó una prueba que exige mantenerla sin unir y con importe conjunto null. No se corrigió inventando diez entidades legales o repitiendo la póliza una vez por tractor.

Responsable:Codex, único escritor/integrador/verificador. Recomendación OpenAI GPT‑6.1Sol/high (esfuerzo admitido en catálogo visible), principal efectivo y esfuerzo no observables por herramienta, selector intacto. Actual Codex suficiente por integración verificable/contexto existente. ClaudeSonnet o Fable podrían aportar revisión independiente, pero no resuelven escala/plantilla inexistente ni justifican repetir este cálculo. No invocados: cuotaMaxx5de5h,semanal,Fable,inclusión/ruta/usoextra/reposición desconocidos; no se ejecutó auxiliar sin evidencia de facturación o cupo.

Lectura automática soportada de cuota Codex2oct09:10UTC/03:10México:semanal100%usada, reposición visible6oct13:08México,5hno disponible. Créditos existentes bajo autorización previa; ninguna compra/reset/activación de cargos. Tokens de actividad/cargos reales y equivalencia de cuota desconocidos; no inventar porcentaje de reserva/ahorro. Una única ruta de ejecución evita duplicar contexto, beneficio esperado no ahorro medido. Límite25min(desde09:10:44UTC hasta09:35:44), una reparación por fallo diagnosticado; parar ante límite o necesidad de autoridad nueva. Lecturas de dos rutas de archivo supuestas fallaron: se usaron nombres exactos existentes sin cadenas de reintentos ni herramientas nuevas; uso de esos intentos desconocido, no cero.

## Próximo cierre y rollback

Pendientes: escala y carga de trabajo del modelo; cobertura binacional/continua; instalaciones, móvil, servicios profesionales y compañía; términos/impuestos de TMS; permisos y seguros completos; caja financiada; exposición productiva y ciclo por recurso, vacíos, cruce y variables. No se exige factura privada de XBF para estos benchmarks. La consulta opcional de escala1vs10sigue abierta, pero no bloqueó la implementación de ambas sensibilidades. No se adopta ninguna por cuenta propia.

Rollback sólo de este incremento: retirar helper y test nuevos `reference-central-admin-pool.ts`/`benchmark-central-admin-pool.test.ts`, política/readout/ficha; eliminar import/pin/cálculo `centralAdminPool`, verificación de sus fuentes y proyecciones `partialFixedWithSharedAdminScenarios`/`unjoinedAdminScaleScenarios`/campo `supportingCentralAdminPool`; retirar párrafos de estado de este corte. La corrección independiente del test antiguo puede conservarse porque refleja capital/seguro previos. No restaurar archivos completos ni eliminar investigación/cambios ajenos. Sin DB/Neon/Auth/usuarios/migraciones/infraestructura/despliegues/operaciones de negocio/IA de aplicación.
