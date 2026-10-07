# B2 · equipos reservados y alimentos del piloto

2oct2026. Trabajo local en D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD4f5fc2de0c3d178dace917231e1092040dec21fd. Trabajo previo preservado; sin publicación, compra, activación, DB/Auth/infra ni adopción de parámetros canónicos.

## Antes y ahora

Antes las suscripciones de comunicación tenían costo, pero faltaban equipos y viáticos MX. Ahora cuatro teléfonos reservados y una asignación de alimentos por posición de operador MX se incorporan a las comparaciones contado/financiado existentes. No se duplican suscripciones, nómina, administración ni caja. US conserva per diem dentro de prestaciones ATRI, sin otra tarifa diaria.

Equipo mensual conocido: `(3499/18.3688 + 3*(179.99+25.98)*1.0825)/24 = 35.807234023 USD`. Desembolso de referencia859.373616549USD, no agregado otra vez al gasto. Son un teléfono MX, uno US y dos de los controles administrativos ya definidos; no un dispositivo por cada una de las siete funciones. Los dos administrativos constituyen un solo pool compartido50/50 entre tractores. Horizonte24meses/residual0 son supuestos prospectivos, no vida fiscal, precio de reventa ni durabilidad observada. Mismo equipo contado en todas las alternativas de financiación de activos.

Alimentos MX:300MXN por cada día calendario iniciado desde salida06:00, incluidos intervalos liberados fuera de casa. Relojes ordinarios conocidos3.06143875 y8.17630763d →4 y9d, no redondeo a turnos ni MAX de capital. Una posición alimentada a la vez; no multiplicar por conductor de relevo ni añadir2100semanales.

| Ciclo | Equipo CFU adicional USD | Alimentos CVU adicional MXN / USD | Subtotales parciales contado USD |
|---|---:|---:|---:|
| Red, vacío esperado |4.223994|1200 /65.328165|4181.361024 /4201.445274|
| Retorno vacío dedicado |9.613489|2700 /146.988372|8234.496574 /8277.081510|

Misma hipótesis de capital NET_PLUS_VAT y pago RATE_EXCLUDES_WEEKLY_REST que el corte previo. Dos alternativas públicas de prima de caja, no intervalo estadístico o costos completos. Primera comparación financiada4291.108463 /4311.192713USD. Las272comparaciones conservan sus alternativas previas; equipo incrementa CFU y alimentos CVU una vez. Seis outputs finales siguen null, quoteReady=false; B2 activo, no B3.

## Benchmark previo y decisión

- **Adaptar fabricantes y componentes existentes:** [Motorola MX](https://www.motorola.com.mx/moto-g06/p) publica g06 256GB3499MXN, SKU00000938 InStock; FAQ cargador/funda incluidos. Usar importe publicado sin segundo IVA. [Motorola US](https://motorolanews.com/meet-the-new-moto-g-and-moto-g-play-designed-for-streaming-snapping-and-staying-powered-up/) informa lanzamiento desbloqueado gplay2026 a179.99USD frente a g2026 a199.99: referencia histórica MSRP, no checkout vigente. Android16/USB-C no prueban compatibilidad IMEI/ELD o instalación eléctrica en cabina.
- **Completar accesorio, no otra suscripción:** [Anker](https://www.anker.com/collections/20w-charger) lista Nano30W+cable100W10ft a25.98USD, promoción21.98 no seleccionada. Tres conjuntos US; no sumar nuevamente cable/cargador sueltos. [Texas](https://comptroller.texas.gov/taxes/sales/city.php) lista Laredo total8.25%; hipótesis de compra en ciudad, no domicilio real ni tasa de telecomunicaciones. No sumar otra vez componentes del total. [Cricket](https://www.cricketwireless.com/support/billing-and-payments/charges-and-fees.html) distingue activación online0/store25; seleccionada referencia online sin activar ni probar elegibilidad. Shipping/otros accesorios/SIM pendientes, no cero inferido.
- **Transferir explícitamente alimentos, no toda remuneración:** [oferta pública de reclutador TIVUS](https://mx.indeed.com/viewjob?jk=050282e84f698f0c) de caja seca foránea especifica300MXN diarios/2100semanales, aparte de salario/bonos. Empleador operativo no identificado, otra geografía/condiciones y longitud53′ no acreditada: una oferta pública, no calibración estadística o viático contractual XBF. No trasplantar salario5000neto, bonos, convoy o alojamiento. Vale mensual de otra operación no equivale a alimentos diarios. Se conserva tratamiento patronal previo; clasificación fiscal de reembolso/remuneración sin resolver, sin crédito IVA supuesto.

No desarrollar dispositivos, otro motor ni integraciones: reutilizar Zod, exposición por recurso/MAX y consolidado existente. Cuatro originales HTML archivados con SHA256. Motorola US y TIVUS fueron leídos por lector web; descargas originales devolvieron403/401 y no hay archivo original. No evadir acceso ni presentarlos como capturas íntegras. JSON identifica cada modalidad de evidencia.

## Validación y límites

276pruebas en cuatro archivos: suplementos14, caja10, conectividad22, consolidación230. TSCestricto sin emisión PASS; readback de cifras y71pins PASS; git diff --check PASS con advertencias CRLF preexistentes. Comprueba inmutabilidad, hashes, días parciales/medianoche, deltas monetarios, joins contado/financiado, duplicación, FX, fuentes y rechazo de doble aplicación. No prueba operativa, adquisición, nómina fiscal, autenticación ni producción.

Primer intento falló en colección por documents.driverDistance inexistente; corregido a driverComponents. Segundo tuvo274PASS/1FAIL por mensaje de doble aplicación posterior a parseo; rechazo ya ocurría, ahora identifica el guard antes de parsear. Reevaluación: ambos fueron integración/contrato local, no falta de modelo/precio. Sin escalar proveedor. Tras última edición se repitieron276 y TSC; también se corrigió el indicador heredado cvusChanged=false a true en esta etapa, preservando alternativas anteriores.

Un comando auxiliar de readback tuvo un paréntesis excedente y no ejecutó el cálculo. Corregido sólo ese comando; lectura final22:32UTC PASS con71pins, cifras y cvusChanged=true. No se trató como prueba monetaria fallida ni consumo cero del intento.

Siguen pendientes, agrupados por efecto: patio MX y aproximación/frontera; peajes/itinerario de camión no conciliados; combustible en ralentí/DEF/mantenimiento bobtail; GPS MX/instalación-envío ELD y accesorios/altas; remuneración/viáticos no desglosados; RC comercial de cruce y alcance de mercancía; otros importes de cumplimiento/empresa. Patio anunciado4000USD sin periodo y patio de sale-leaseback no disponible no justifican renta mensual compatible. No convertir precios desconocidos en cero ni cerrar B2 con este subtotal. Siguiente trabajo: resolver gastos de patio/cruce y variables físicas con fuentes públicas compatibles, manteniendo visible la decisión de alcance de mercancía pendiente.

## Responsable, modelo y consumo

Codex único investigador/escritor/integrador/verificador. Elección humana gpt-6.1-sol/high16:46:22UTC conservada; versión/esfuerzo efectivo exactos y cuotas5h/semanal/Fable no observables, no cero ni captura histórica actualizada. No se afirma cambio de selector. Skill claude-review usada para elección/lease/checkpoint, sin invocación Claude/Fable/agentes. Continuidad en mismo contrato evita traspaso sin beneficio demostrado; Fable no resuelve falta de precios públicos.

Estimación45–60min dentro del máximo autorizado240h, sin nuevo deadline, gasto o automatización. Cero reintentos de proveedor/fallback; dos reparaciones locales reevaluadas y registradas. Consumo atribuible/tokens/cargos desconocidos, no garantía de ahorro. No consultas auxiliares de IA ni compras/activaciones.

## Rollback selectivo

No restaurar archivos completos sucios ni git reset/checkout. Retirar únicamente import/pin/cálculo/hash/output tripSupplements del consolidado; ajustar prueba71→70pins y retirar nuevos lib/test/política/checkpoint/cuatro HTML sólo si siguen siendo exclusivos de este corte sin consumidores posteriores. Quitar sólo sus entradas de estado. Mantener caja, conectividad y corrección factual ELD previas. Repetir pruebas previas afectadas. No hay producción/DB/Auth o compras que revertir.
