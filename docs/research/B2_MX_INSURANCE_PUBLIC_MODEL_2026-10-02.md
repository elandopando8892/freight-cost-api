# B2 — seguro de tractor mexicano, referencia pública 2021

## Resultado y alcance

Antes existía una tabla de paquetes para Cascadia2022, incompatible como observación emparejada del tractor2021 del piloto. Ahora una nueva tabla pública del propio corredor permite usar **Cascadia2021 Amplia:116952MXN/año**, medida24sep2026. Su aplicación al perfilMX se declara como hipótesis de categoría, no póliza del VIN/versiónDD15/manual/valorRODAL. No representa una cotización negociada ni una tarifa actual del asegurador.

Se conecta a cinco copias de presupuesto: CASH/FINANCED_LOW/FINANCED_HIGH de capitalMX y dos alternativas de contado con los tres capitales. La prima no cambia por financiar el activo. En las últimas dos hay **5/10 filas con monto**, no50%de B2 ni cobertura completa de cinco familias. Las copias anteriores siguen intactas: baseline2, alternativas anteriorescapitalcash4, plantillaoriginal0. CFU/CVU/fijo total/costoD2D siguen null. Las nuevas copias enumeran dos condiciones adicionales: mercancíaMX/asignación y términos territoriales de frontera/intercambio. El estado de este handoff permanece INCOMPLETE independientemente de contar montos; se conserva por separado budgetAuditStatus del conciliador genérico, para no cerrar cobertura por presencia de filas.

## Benchmark previo, decisión y reutilización

| Alternativa | Evidencia y ajuste | Decisión |
| --- | --- | --- |
| Tabla TIMI2022 previamente documentada | Paquetes/valores/versiones distintos del2021. Ajustar prima proporcionalmente al precio del activo supone una relación no publicada. | Conservar antecedente, no extrapolar. |
| Tabla TIMIpor año2021 | Corredor original, fila específica2021, Amplia116952/Limitada56812; Guadalajara/Quálitas y medición24sep2026. No publica versión exacta ni suma asegurada2021. | Adoptar sólo como escenario doméstico de categoría explícito. |
| RadarCarretero/aseguradores con formulario | Rangos para otros años o sin prima pública numérica compatible; no se enviaron formularios ni solicitaron pólizas. | Contexto; no sustituyen fila2021. |

Fuentes: [TIMI:precio por año](https://timi.mx/guias/cuanto-cuesta-seguro-tractocamion), [antecedente TIMI](https://timi.mx/seguro-tractocamion), [RadarCarretero](https://radarcarretero.mx/directory/cuanto-cuesta-el-seguro-de-un-tractocamion/), [INV](https://inv.mx/empresas/seguro-tractocamiones-camiones). Lectura pública2oct2026. TIMI informa prima, convenio30%, derecho790MXN e IVA ya incluidos. No cobrar otro790, aplicar otro30%, sumar RC+Limitada+Amplia ni combinar tablas de valores diferentes.

Reutilización: normalización anual de `reference-insurance-employer.ts`, verificador de columnaFIX de `reference-box-prospective-capital.ts`, esquema/conciliador existente de presupuesto. Sólo un adaptador de investigación acotado y conexión al consolidado; sin motor alterno, dependencias, infraestructura ni UI. No se requiere nuevo wireframe porque no se modificó ninguna interfaz; B3 conserva obligación de wireframes MARKSMAN.

## Medición, límites y trazabilidad

`116952/12 =9746MXN/mes`; `9746/18.3688 =530.5735812900135USD/mes`, importe del escenario **530.57USD/mes**. FIX1oct2026, misma referencia de valoración del expediente; no pronóstico de pago. Precio fuente redondeado a pesos enteros, no precisión subyacente reconstruida. Normalización una vez, conversión una vez, redondeo final a centavosUSD.

Medición **gross** explícita, sin deducción de crédito fiscal. RecuperabilidadIVA y prima económica neta quedan null, no se afirma que sean cero. No es flujo de facturación mensual ni prima financiada. CASH/FINANCED comparten el proxy; requisitos de acreedor no verificados.

La tabla no demuestra cobertura del remolque, mercancía, EE.UU., frontera ni intercambio. TIMI excluye remolque y mercancía y publica para esta última una regla por viaje0.45%del valor declarado más derecho/IVA: no aplicarla sin hipótesis de valor, territorio, cargos y solapes compatibles; el ejemplo850000MXN no es valor del embarque del piloto. Deducibles de otras unidades tampoco son automáticamente los de este tractor. La primaUS contiene su propio proxy anual de cargo: no sumar otra cobertura de mercancía sin delimitación territorial y de riesgo. Por ello no se declara cerrado el seguroD2D aunque la fila doméstica tenga monto.

51fichasJSON fijadas por hash. Ficha nuevaSHA256 `4c3f9f5061c37a77cd8dc5bda90be7c35ac1149cd9eb064268d1f9cad4741254`; original nuevo `TIMI_TRACTOR_YEAR_TABLE_20261002.html`, SHA256 `1bb4c29d3f3238af712af34b7ccf28e6899581d3915d5ddcdffb44bb4ade4114`. Fecha publicación23ago2026/actualización26sep2026 distinta de medición24sep. Captura nueva del landing `TIMI_TRACTOR_RECHECK_20261002.html`, SHA256 `5e0fbe4e407a680c1adbb8fabd480bd7dbf58fe65ed84424e99c5bf30b4eef54`, sirve de contraste, no pin/insumo numérico de este modelo; original1oct no sobrescrito. Archivo guía cotejado en fila/columna/año/caption/fecha; consolidado verifica bytesSHA antes de aplicar.

## Pruebas y entrega

**480pruebasPASS/15archivos**; typecheckAPI y grafo estricto scripts/testPASS; readback local51pins/530.57/cinco copias/cajaúnica/base2/original0/salidasnull.17pruebas nuevas cubren normalización, grosssin crédito supuesto, fecha/columna/año/importe alterados, fee/descuento duplicados, períodos/perfiles/asignaciones, copia sin mutación, duplicación/sobreescritura, hash original y conservación de pendientesD2D. El testparametrizado de pins existente aporta una prueba adicional. `git diff --check`PASS para tracked, avisosCRLF preexistentes; nuevos archivos son untracked y su validación es typecheck/test/hash/lectura, no cobertura automática de ese comando.

La skill `engineering:testing-strategy` orientó aritmética, alcance, conservación e idempotencia. No prueba autenticada, UI, renovación, persistenciaDB, despliegue o uso operativo en este corte. No se necesita repetir buildfrontend sin cambioUI.

## Modelo, presupuesto, cuota y ejecución real

Responsable únicoCodex/OpenAI. Recomendación **GPT6.1Sol/high** para interpretación de cobertura y conciliación; catálogo soporta high, pero modelo/esfuerzo principal seleccionado y acceso de cuenta no son verificables por este flujo, selector sin cambio. Codex actual suficiente: contexto existente y controles deterministas, no pregunta independiente que justifique otro proveedor. Claude no invocado, cero invocaciones observadas pero consumo concurrente del plan desconocido; Maxx5 es declaración histórica. Ventanas5h/semana/Fable/reposiciones/ruta incluida/extra actuales desconocidos. Fable evaluado sin ventaja por falta de evidencia/modelado acotado; no activa llamadas ni cargos. No otro escritor/agente.

Preflight2oct2026 **08:21:20UTC/02:21:20MX**, fuente lectura automática soportada de usoCodex: ordinario no permitido, semanal100%usado/10080min, reposición6oct13:08MX;5hdesconocida, créditos disponibles observados, continuidad previamente autorizada sin compra/activación. Esta lectura es inicial, no saldo final. Tokens/cargos y reducción monetaria/cuota exactos del corte no observables; no se inventan porcentajes/reserva. Sin lecturaClaude ni credenciales; límites de contexto/tiempo/reintentos son el control disponible. Frente a duplicar modelos se evita una llamada/contexto adicional: beneficio esperado no cuantificado.

Plan25min desde08:21:18UTC hasta08:46:18UTC, una reparación por fallo diagnosticado. Benchmark/publicación6min, integración12min, verificación/documentación7min orientativos; cierre de actividad exige copia trazable y escenarios verificables, no closureB2. Error de readbackCLI: paréntesis adicional en expresión `tsx -e`, no ejecutó el consolidado; corregido una vez y lecturaPASS. Consumo del fallo desconocido, no contado como cero. Pruebas enfocadas254PASS seguidas de regresión ampliada480PASS por integración con presupuesto/exposición/capital. Después del último ajuste de estadoINCOMPLETE se repitieron los15archivos480PASS, typecheckestricto y readback; sin builds repetidos ni escalamiento por sintaxis. Cierre de este incremento antes del límite; B2 continúa activo.

## Pendientes y rollback

B2 sigue abierto: paquetes de caja/frontera/mercancía; permisosMX/US/caja y pooladministrativo único; financiamiento de caja; capacidad/tiempo/vacíos/cruce y variables unidos al presupuesto para producir costoD2D reproducible contado/financiado. Prioridad siguiente: completar supuestos económicos agrupados de seguros/permisos/admin, no otro sprint por cada control; después cálculoD2D y B3seleccionar/calcular/guardar/reabrir con wireframes. No nueva decisión solicitada en este corte, no exigir contabilidad privada para el modelo público.

Sólo desarrollo localD:, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd` revalidado, trabajo ajeno preservado. Sin commit/staging/PR/deploy, Auth/DB/Neon/usuarios/migraciones/infraestructura, operaciones de negocio, llamadas cotizador/Google/IAaplicación, contratación o envío de formularios.

Rollback acotado: retirar helper/test/ficha nuevos, import/pin/verificación/cinco copias y referencias de este corte en consolidado, dos párrafos nuevos de estado/plan. Capturas públicas nuevas pueden conservarse como evidencia o retirarse individualmente después de verificar rutas; no borrar directorios, restaurar archivos completos ni tocar la plantilla original. La reversión conserva modelos de capital, seguroUS y cambios anteriores.
