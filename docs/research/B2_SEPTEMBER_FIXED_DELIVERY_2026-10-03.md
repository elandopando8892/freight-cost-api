# B2 · componentes fijos y variables unidos bajo la misma valoración

## Qué cambia

Antes, el CLI de septiembre sumaba componentes variables y LABOR, pero no podía unirlos con un presupuesto fijo valorado en octubre. Ahora reconstruye **26 partidas fijas conocidas**, conserva **seis remanentes sin importe** y asigna el presupuesto por tractor MX, tractor US y una caja compartida. Después añade la cuota fija laboral una sola vez y une el subtotal variable ya reconstruido.

Hay seis referencias mensuales (tres FIX × contado/financiado) y **24 comparaciones de viaje** (dos ciclos × tres FIX × dos descansos × dos modos). Los dos modos reutilizan los presets de comparación del expediente B2 existente: **no son una elección del usuario de crédito, seguro, tratamiento fiscal o FX**. Las 32 alternativas financieras existentes siguen soportadas y probadas por el adaptador, sin sumarlas ni adoptarlas.

Ejemplo del 28/09, `RATE_EXCLUDES_WEEKLY_REST`; no selecciona ese FIX:

| Ciclo | Modo de comparación | Fijo conocido asignado USD | Variable conocido USD | Suma de componentes conocidos USD |
|---|---|---:|---:|---:|
| Red con vacíos esperados | Contado | 993.34 | 3,496.28 | 4,489.62 |
| Red con vacíos esperados | Financiado | 1,106.70 | 3,496.28 | 4,602.99 |
| Retorno vacío dedicado | Contado | 2,265.57 | 6,731.93 | 8,997.50 |
| Retorno vacío dedicado | Financiado | 2,529.93 | 6,731.93 | 9,261.86 |

Estas sumas **no son CFU/CVU completos, cotizaciones, costos observados, mínimos demostrados ni precios de venta**. Es una comparación retrospectiva de referencias públicas y supuestos declarados: valores fuente leídos en octubre no se convierten en observaciones de septiembre al usar su FIX. `historicalSeptemberPricesVerified=false` queda explícito. Todos los resultados completos siguen `null`.

## Benchmark y solución elegida

Se reutilizaron fuentes fijadas, contratos, dependencias y fórmulas ya documentados. Tres rutas evaluadas:

- Reescribir presupuesto/financiación/asignación: mayor costo de mantenimiento y regresión; no aporta otra fuente económica.
- Convertir los totales USD de octubre: pierde precisión de los importes MXN, puede trasladar redondeos o asignaciones incompatibles y oculta la procedencia.
- **Reconstruir cada componente desde su importe nativo y reutilizar la hoja existente como control de identidad, alcance y exposición**: menor cambio, trazabilidad por fila y regresión del histórico. Elegida.

La fuente de verdad sigue siendo el consolidado local con sus documentos/archivos verificados. El nuevo adaptador no admite nuevos precios ni amplía infraestructura. La parte específica es el reparto MX/US/caja y su integración con LABOR; Zod, contratos de presupuesto, conservación de centavos y `allocateFixedCost` se reutilizan. No hay cambio visual ni nueva pantalla; este corte no requiere otro wireframe.

Flujo: consolidado fijado → importes/fórmulas nativos → conversión fechada → redondeo por partida → pool compartido conservado → MAX por recurso entre exposición de distancia y tiempo → cuota laboral fija una vez → unión con variable conocido → remanentes y salidas completas desconocidas.

## Reglas económicas comprobadas

- Capital MX y caja se toman de su cálculo nativo MXN, no de USD redondeados multiplicados por el FIX viejo. Capital US conserva la media nativa USD del modelo de uso de mercado.
- Financiado **reemplaza sólo las tres filas de capital**. Intereses medios/asignación de comisión conservan las hipótesis anteriores; principal, cuota completa de préstamo y capital contado no se añaden nuevamente. No hay crédito contratado.
- Prima doméstica MX: referencia anual bruta nativa /12; no otra comisión, descuento o IVA. US: un componente auto mensual y una póliza de mercancía anual /12; no prima adicional por embarque. Caja: un extremo explícito de guía, no ambos.
- Administración conserva un único pool y dos controles TMS. Se redondea la partida antes de repartir centavos entre los tractores; la caja no recibe otra administración.
- Servicios, celulares, visibilidad y equipos conservan cantidades, monedas, impuestos y ventanas declaradas. No se añade compra inicial junto a su asignación mensual.
- Patio reservado conserva 365/12 días como media de capacidad; no se confunde con las 30 jornadas de cuotas de septiembre ni con hotel/pensión del operador. Pernocta mixta sigue sin precio completo.
- Se usa un MAX por recurso, no suma de costo por kilómetros más costo por tiempo. Las exposiciones se comprueban contra el consolidado, no contra una nueva ruta.
- La cuota fija MX de LABOR se añade una vez fuera del presupuesto de recursos; no se repite en CVU. Cambiar financiación deja idéntico el subtotal variable.
- Fecha/valor FX, identidades, monedas, centavos, reparto y referencias documentales se validan. Un importe desconocido sigue `null`, no se declara gratuito.

Las fuentes públicas se **reutilizaron**, no se renovaron ni se consultaron nuevas tarifas en este corte. Los períodos/observaciones originales, incluidos los de octubre, permanecen en los documentos fijados y en `originalEvidence`; los `sourceRefs` de cada partida apuntan a pins existentes. El período de aplicación/valoración de septiembre no certifica la vigencia retrospectiva de esos precios. No hay inflación, póliza, capacidad real, beneficio fiscal o cohorte conjunta inferidos.

## Qué falta

Los seis remanentes fijos son permisos restantes MX, permisos restantes US, permisos restantes de caja, responsabilidad territorial extranjera MX, alcance territorial/custodia de caja y impuestos/activación/instalación de servicios no cubiertos por el precio publicado. Se conservan separados de componentes ya conocidos, sin cobrar otra vez permisos/primas enteros.

En variable siguen pendientes DEF, peajes/cargos de cruce agregados e incrementales, prestaciones adicionales completas, riesgo patronal/aplicabilidad y pernocta mixta en ambos países. Validar fórmulas no requiere investigar cada caseta; cerrar una estimación íntegra sí requiere importes y alcance suficientes para los conceptos que el modelo incluye. Los supuestos de capacidad, transferencia histórica y financiación no son observaciones del carrier.

**Este corte de reconstrucción/unión conocida se completa localmente; B2/E1 económicos no se cierran.** No se publicó una base, calibró el catálogo de 210 parámetros, guardó una cotización, probó una sesión real o utilizó esta suma en una operación comercial. Adopción 0; no cambios en DB/Auth/usuarios/infraestructura/producción.

## Pruebas y limitaciones

- Primer conjunto: **156/156 pruebas PASS en seis archivos**: fijos de septiembre 20, variables de septiembre 18, LABOR 10, presupuesto mensual 22, piloto público 63, expediente B2 23. Incluye las 32 sensibilidades financieras, ambas bases fiscales de caja, rechazo de precios inyectados, FX discordante, corrupción de filas/reparto/exposición y ausencia de mutación.
- TSC estricto del CLI, ambas pruebas de septiembre y bibliotecas importadas: salida 0, ESNext/Bundler. No se necesitó reparación de implementación o tests en ese conjunto.
- CLI existente: proceso hijo salida **2 esperada** por referencia incompleta; 86 pins, seis referencias fijas, 24 comparaciones; todos los remanentes fijos siguen `null`. Parámetro `--capital=1`: salida 1, rechazado. El comando de inspección puede salir 0; no sustituye el código del CLI incompleto.
- Snapshot previo y políticas/hoja de octubre conservados. Prueba `b2-evidence.test.ts`: snapshot SHA-256 `99594a2ee1e31c67351a77d1124e75ec53d8d5ccbee593c7a5fce2baa264059f` intacto.
- Pruebas locales de aritmética/contrato e integración entre calculadores. No prueban Auth Supabase real, UI, persistencia SaaS, aceptación humana o despliegue. No se afirma que toda la suite del repo pase; los fallos previos de fixtures de rutas siguen fuera de este alcance.

Verificación final después de la última modificación de código: **197/197 pruebas PASS en nueve archivos**, salida 0; los seis anteriores más variables históricas 18, fluidos 11 y bobtail 12. TSC estricto repetido: salida 0. `git diff --check` de la entrada de estado: salida 0, con advertencia de conversión LF/CRLF de Git; búsqueda de espacios finales en scripts, prueba y entregable modificados/nuevos: sin coincidencias. `git diff --check` no cubre archivos nuevos no rastreados; no se le atribuye esa cobertura.

## Archivos, recuperación y elección

Checkout físico `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`; estado/worktrees inspeccionados antes de editar, trabajo ajeno conservado. No rama, worktree, commit o PR nuevos.

Nuevos: `apps/api/scripts/lib/reference-september-fixed-components.ts`, `apps/api/tests/benchmark-b2-september-fixed.test.ts` y este entregable. Modificados: `apps/api/scripts/review-b2-september-labor.ts`, export del esquema FX en `apps/api/scripts/lib/reference-september-operating-components.ts` y entrada en `docs/SPRINT_STATUS.md`. Los dos scripts modificados eran trabajo previo no rastreado: no borrarlos completos ni restaurarlos desde HEAD.

Rollback selectivo: retirar el import/conexión de fijos, preset de comparación, `fixedReferences`, `fixedComparisons` y `selectedFixedComponentsRevaluedForSeptember`; restaurar el estado `LABOR_AND_SELECTED_VARIABLE_COMPONENTS_REBUILT_E1_OPEN`, comentario/lista previa de pendientes; devolver el esquema FX a su nombre local anterior. Retirar únicamente los tres archivos nuevos de este corte y su entrada de estado. Repetir septiembre variable/LABOR, hoja mensual y snapshot. No ejecutar reset/clean ni quitar investigación anterior. No existe rollback externo porque no se tocó.

Ejecutor/integrador/verificador único: Codex, proveedor OpenAI. Elección explícita conservada `gpt-6.1-sol`, esfuerzo solicitado alto; modelo/versión nativos y esfuerzo efectivos desconocidos, selector sin cambio. Claude se consideró como revisión alternativa, pero el alcance determinista reutiliza contexto y pruebas verificables sin llamada auxiliar. No Claude/Fable/Astra/Luna, agentes, router/política de selección activados o nuevos accesos.

Presupuesto comunicado: 60 minutos y hasta dos reparaciones diagnosticadas. Sin reparaciones de implementación por fallo de pruebas/tipos. Consumo de tokens, cuota y cargos reales no observables; no se declara uso extra autorizado ni costo cero. La skill `engineering:testing-strategy` orientó las comprobaciones de conservación, corrupción e integración. No APIs de pago, nueva infraestructura, credenciales, investigación privada o operaciones de negocio.

Siguiente corte recomendado: reconstruir DEF y cargos variables agregados con las fuentes existentes, manteniendo su alcance/fecha y sin recorrer cada caseta; después cerrar suficiencia de prestaciones, pernocta y remanentes fijos. No se necesita una nueva decisión para el presente corte; cambios metodológicos materiales, gasto o publicación requieren autorización específica.
