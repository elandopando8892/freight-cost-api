# B2 · E1: referencia laboral de septiembre

## Resultado y alcance

Antes, la proyección laboral fijaba octubre, 31 días de cuotas y una prima de riesgo de alta inicial. El perfil confirmado requiere septiembre y una empresa binacional que ya opera. Ahora hay **12 comparaciones laborales de septiembre**, con 30 días, tres observaciones FX fechadas, dos ciclos y dos interpretaciones del descanso semanal. Octubre conserva exactamente su salida anterior.

Este corte está desarrollado y probado **localmente**, no desplegado ni utilizado en una cotización. No reconstruye el costo completo del viaje: E1 y B2 permanecen abiertos. No se selecciona un FX, no se publica una base, no se adoptan importes en el motor y no se cambian datos, Auth, infraestructura o producción.

## Benchmark y decisión previa

Se reutilizaron los expedientes públicos fijados, el perfil confirmado y los calculadores existentes. Se contrastaron tres opciones:

| Opción | Ajuste y riesgo | Decisión |
| --- | --- | --- |
| Cambiar sólo la etiqueta octubre por septiembre | Conserva 31 días, riesgo inicial y conversiones históricas; no reconstruye el período | Rechazada |
| Duplicar el motor para septiembre | Duplica fórmulas y mantenimiento sin una necesidad diferencial | Rechazada |
| Parametrizar los calculadores y extraer sólo componentes laborales | Conserva reglas y regresiones; permite guardas de período y desconocidos explícitos | Implementada |

No se incorporaron dependencias, proveedores ni otra tecnología. La capacidad diferencial es la trazabilidad de componentes por recurso, ciclo y evidencia; fechas, validación y tipos reutilizan el stack actual. Sin cambios de interfaz: los wireframes previos no cambian.

## Flujo y criterios de cierre del corte

Perfil y fuentes fijadas → clonación en memoria de políticas históricas → cálculo de septiembre por cada FX → componentes laborales MX/US separados → costo completo desconocido.

- El período y la pareja fecha/valor FX deben coincidir; no se acepta una observación arbitraria.
- Septiembre tiene 30 días de cuotas del titular; el relevo mantiene su asignación individual, sin un segundo sueldo completo.
- La prima de riesgo de empresa existente permanece desconocida. El subtotal conocido no la convierte en cero ni en contribuciones completas.
- Comida directa no se cobra nuevamente dentro del ingreso del operador.
- El aviso IRS, su fecha efectiva, URL y período documental deben concordar.
- Se rechaza unir esta proyección de septiembre con sumas históricas no laborales del viaje.
- La salida histórica de octubre debe mantenerse exactamente igual.

Estos criterios pasan. No constituyen cierre de E1 ni calibración de la base.

## Fuentes y límites metodológicos

Se verificaron nuevamente las secciones 3 y 6 del [IRS Notice 2025-54](https://www.irs.gov/pub/irs-drop/n-25-54.pdf): referencia de M&IE de transporte CONUS de USD 80/día, con aplicación desde octubre de 2025. El límite de septiembre en este expediente delimita la comparación, **no declara caducidad legal**, tarifa hotelera ni prestación obligatoria. Las fechas efectivas de asignación/pago no están verificadas.

Se revisaron los artículos 27–30 de la [Ley del Seguro Social](https://www.diputados.gob.mx/LeyesBiblio/pdf/LSS.pdf). Se conserva una proyección anual media explícita: no se presenta como salario variable de un bimestre observado ni nómina fiscal. La capacidad por ciclo, el tratamiento remunerativo de alimentos y la hipótesis estatal NL siguen siendo supuestos, no hechos observados del transportista.

Las tres observaciones FIX fijadas en el perfil son 17.8413 (28/09), 18.0710 (29/09) y 18.0692 (30/09), MXN/USD; se comparan sin seleccionar una. Las fuentes salariales y el factor patronal US conservan sus períodos originales, visibles en la salida, no se relabelan como observaciones de septiembre. Las canastas públicas de prestaciones se conservan separadas por oferta: no se fabricó un paquete completo ni se agregó otra vez el vale de MXN 3430.

El expediente nuevo es `B2_SEPTEMBER_LABOR_REFERENCE_2026-10-03.json`, SHA-256 `78bf62082f06255f7c0488b2f793a3a436c3e8a18da0d9216d92d38e164e3598`, con normalización exclusiva CRLF→LF. El CLI verifica **85 pins**. Los CFU, CVU y costo íntegro finales permanecen `null`; no son cero, cotizaciones ni límites inferiores demostrados.

## Verificación después de la última modificación

- **182/182 pruebas PASS, ocho archivos**: piloto público (63), proyección MX (28), perfil B2 (12), operador variable MX (21), septiembre (10), expediente B2 (23), prestaciones (13) y canastas (12). Vitest 1.6.1, salida 0.
- TypeScript estricto del CLI y su prueba, con bibliotecas importadas: salida 0. No se ejecutó un build general de la API en este corte.
- CLI de septiembre: salida 2 deliberada por referencia parcial; 12 comparaciones, 85 pins, `quoteReady=false`. Parámetros inyectados rechazados: salida 1.
- Expediente anterior: cuatro contextos y 83 pins; comprobación de snapshot intacto, SHA-256 `99594a2ee1e31c67351a77d1124e75ec53d8d5ccbee593c7a5fce2baa264059f`.
- Una reparación diagnosticada: el control de tipos encontró el nombre incorrecto de una propiedad en el fixture de prueba; se corrigió y se repitieron las ocho suites y el control estricto. No se contabiliza el intento fallido como PASS.

Las pruebas incluyen fechas/FX incompatibles, política de riesgo incorrecta, aviso/URL IRS discordantes, integridad de fuente, regresión exacta de octubre, ausencia de mutaciones y bloqueo de mezcla con componentes no reconstruidos. Son pruebas locales de cálculo y contrato; no prueban sesión Supabase, persistencia de cotizaciones o aceptación humana. No se afirma que toda la suite del repositorio esté verde; los cuatro fallos de fixtures de rutas previamente documentados no forman parte de este corte.

## Cambios y rollback

Checkout físico: `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`; rama `codex/cost-tires-release-s14`; HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. Se preservó el worktree sucio, sin commit, rama, PR ni despliegue nuevos.

Modificados sólo para este corte: `apps/api/scripts/lib/reference-mx-driver-forecast.ts`, `apps/api/scripts/lib/reference-us-driver-planning.ts` y este registro en `docs/SPRINT_STATUS.md`. Nuevos: `apps/api/scripts/review-b2-september-labor.ts`, `apps/api/tests/benchmark-b2-september-labor.test.ts`, el JSON de referencia y este entregable. Los dos calculadores ya existían como trabajo no rastreado: **no eliminarlos completos ni usar reset/clean**.

Rollback selectivo: retirar únicamente las extensiones de septiembre y sus validaciones en ambos calculadores; retirar los cuatro archivos nuevos de este corte y su entrada de estado. Conservar todas las proyecciones, evidencias y cambios previos. Repetir regresión de octubre y comprobación del snapshot al revertir. No hay rollback de DB/Auth/producción porque no se tocaron.

## Modelo, presupuesto y siguiente paso

Elección conservada: OpenAI/Codex `gpt-6.1-sol`, esfuerzo alto; modelo/esfuerzo nativos exactos no observables. Se reutiliza la elección autorizada, sin cambiar selector. Frente a una revisión por Claude, este corte pequeño y verificable reutiliza contexto y regresiones locales sin invocación adicional; no presupone disponibilidad ni consumo de otro proveedor. Skills: `testing-strategy` orientó las guardas de integridad temporal y reparto económico.

Presupuesto comunicado: 45 minutos y hasta dos reparaciones diagnosticadas; una reparación realizada. Único escritor local. Sin IA auxiliar, nuevas APIs de pago, credenciales, gasto autorizado ni llamadas a Google/Supabase. Tokens, cuota y cargos reales no observables; no se afirma costo cero del plan ni disponibilidad de uso extra.

Siguiente: cerrar E1 con prestaciones/relevo y cargos todavía sin referencia suficiente, pernocta mixta MX/US y reconstrucción coherente de las demás familias económicas para septiembre. Priorizar evidencia pública aplicable al perfil, sin otra pantalla ni inventar importes. Las fechas exactas del viaje sólo son requisito si se pretende validación operativa de un servicio real. No hace falta una decisión del usuario para este corte; cualquier adopción metodológica material o publicación requiere su alcance específico.
