# B2 · fichas de referencia MX/US: perfil, tenencia y exposición

Fecha: 29 septiembre 2026. **Corte documental y analítico completado; fichas económicas todavía parciales.** Objetivo: costos de terceros D2D caja seca con intercambio, sin transbordo. No presupuesto fijo, CFU/CVU monetarios, tarifa de compra ni venta calculados. No se activa ni llena una base con estos escenarios.

## Resultado y decisión

Se entregan dos [fichas estructuradas](B2_REFERENCE_PROFILE_EXPOSURE_2026-09-29.json) y un [notebook reproducible](B2_REFERENCE_PROFILE_EXPOSURE_2026-09-29.ipynb). Reutilizan los expedientes de activos y el método de asignación existente; no otro schema, proveedor contratado ni motor paralelo.

La propuesta de trabajo es **tracto usado propio por transportista nacional**, con financiamiento aún no resuelto. Es una elección de diseño para estudiar capital por activo, no la tenencia observada de la flota pública ni decisión aprobada sobre la operación. Se relacionan las ofertas MX-T/US-T del expediente previo sin convertir precio anunciado en costo capitalizable ni reverificar disponibilidad en este corte.

El mismo remolque cargado pasa por intercambio. No se sustituye por dos remolques para pasar el contrato; su propietario, responsable económico y reparto siguen pendientes. No se carga en ambas fichas, pero tampoco se declara costo cero. Una combinación tractor–semirremolque no prueba ratio de stock 1:1. Un tractor equivalente es una unidad analítica, no una flota observada de tamaño uno.

## Exposición documentada, no productividad calibrada

| Escenario separado | Fuente y naturaleza | Distancia anual | Días operativos/año | Mes promedio: km / días | Umbral km/día |
| --- | --- | ---: | ---: | ---: | ---: |
| MX histórico | IMT PT260 (2004), caso modelado T3-S2; carrocería no confirmada en p.19 | 120,000 km | 300 | 10,000 / 25 | 400 |
| US histórico | ATRI publicado 2025, operaciones 2024; muestra nacional for-hire Class 8, todos los sectores | 82,677 millas | 268 | 11,087.978 / 22.333 | 496.477 |

Los pares están documentados dentro de cada fuente, **no** como muestra conjunta de transportistas caja seca D2D usados/propios. Dividir entre 12 sólo produce una media anual normalizada; no un mes observado, perfil estacional ni periodo de vigencia 2026. Los días operativos necesitan una decisión de correspondencia con días productivos/días del ciclo. La distancia no se relabela como loaded-only; el 55% de capacidad por viaje redondo del IMT no es share de kilómetros cargados. No se construye un intervalo mezclando estos dos países/años.

ATRI tiene edición 2026. La página oficial de descarga fue leída: presenta formulario de registro, sin enlace directo al informe entre los enlaces examinados. No se envió identidad, no se sorteó el acceso y no se sustituyeron tablas por números de reseñas secundarias. Por ello se conserva 2024 como escenario histórico, no “último benchmark”. Esto no afirma que el informe sea inexistente o inaccesible por todos los canales.

Fuentes primarias: [IMT PT260, p.19 impresa / PDF33](https://imt.mx/archivos/publicaciones/publicaciontecnica/pt260.pdf), [ATRI 2025, p.12 impresa / PDF15](https://truckingresearch.org/wp-content/uploads/2025/07/ATRI-Operational-Costs-of-Trucking-07-2025.pdf), [descarga oficial ATRI 2026](https://truckingresearch.org/2026/07/analysis-of-the-operational-costs-of-trucking-2026-update/). Las dos páginas PDF se renderizaron y revisaron visualmente; hashes/localizadores están en el JSON. Scratch público conservado en `tmp/pdfs/b2-reference-profiles-20260929`; no contiene credenciales.

## Puente concreto al CFU

Sea **C_país** el presupuesto fijo en USD por tractor equivalente y mes promedio, con el mismo alcance que la exposición. Su importe sigue desconocido. El motor usa `allocateFixedCost = max(distancia, tiempo)`, nunca la suma de las dos asignaciones del mismo fijo:

`CFU candidato = C_país × max(km totales del ciclo / km del mes promedio, días del ciclo / días operativos del mes promedio)`.

| Escenario | Fracción de C por km | Fracción de C por día operativo |
| --- | ---: | ---: |
| MX histórico | 0.0001000000 | 0.0400000000 |
| US histórico | 0.0000901878 | 0.0447761194 |

Por encima del umbral km/día domina distancia; por debajo domina tiempo, **sólo después de compatibilizar las definiciones**. Son coeficientes algebraicos, no USD/km ni USD/día. Ningún C ficticio, viaje inventado o costo de frontera se introduce. La milla internacional exacta es 1.609344 km en este análisis; no se cambia la constante heredada del motor.

Sensibilidad determinista: con C y ciclo constantes, reducir ambos denominadores en 20% multiplica su asignación máxima por 1.25 (+25%). El 20% es un estrés analítico explícito, **no** banda investigada de utilización ni intervalo de confianza. Esta sensibilidad explica por qué exposición y fijo deben revisarse juntos.

No se transforman estas cifras en `GENERAL_BASE`, FTE de operador, `UTILIZATION`, loaded/empty o exposición mensual gobernada. La plantilla exige país/cohorte/mes y evidencia vigente; este escenario anual no debe obtener compatibilidad falsa asignándole septiembre de 2026.

## Validación y límites

- 11 pruebas nuevas de fichas, unidades, conversión independiente, asignación real MAX, sensibilidad, no doble remolque y hashes intactos: PASS.
- Suite ampliada de 13 archivos `benchmark-*`: **315/316 PASS**. Falla `benchmark-route.test.ts:20`: snapshot visual de metadatos antiguo; éste contiene 140/139 filas MX/US frente a 125/124 actuales, exactamente 15 claves `COST_CROSSBORDER` sobrantes por país, sin claves nuevas. Generador, rates, snapshot y test no fueron editados en este corte. No se sobrescribe la copia visual ajena para aparentar release aprobado; pendiente de conciliar antes de B3/release. La prueba usa identidad simulada y mock que rechaza acceso DB, no sesión real.
- Typecheck API PASS. Notebook: dos celdas ejecutadas en orden, 13 comprobaciones PASS y salidas guardadas. `nbformat/nbclient` no están instalados: ejecución con Python estándar, no kernel Jupyter. Salidas leídas; inspección de la vista renderizada del notebook pendiente. Una cifra manual inicial fue corregida por la recomputación antes de este entregable.
- Auditor canónico sin deriva: 135/135, 3 candidatos / 47 contrastes / 85 faltantes, cero adoptados. Ledger real sigue INCOMPLETE, 24 incidencias iniciales por país; no sólo las dependencias condicionales ya seleccionadas.

Hashes preservados: core `cabfda00873356406d838306bfa87b912eccd9a6026449c0ebb26046acd8bd85`; ledger `e57cdd449f0a285f9758ded2ac438838d38edc6eef6e06ccb082d9238a8a6d60`; register `a31864f52ce5cd3d9f111056ec4dc58181587e99258614f1e2636e61ff992f0a`. No confundir checks documentales con aprobación económica.

## Siguiente salida de negocio

Completar **capital del tracto por país**: costo capitalizable, condición, vida restante, residual, financiamiento e inclusiones. Reutilizar las fichas/ofertas ya investigadas; no otra búsqueda genérica de índices ni reparto de promedios entre microinputs. Si la evidencia sólo sostiene escenarios, entregar banda modelada con justificación y sensibilidad, no afirmar calibración de mercado. Resolver el remolque como línea económica separada antes de un D2D total; no exigir facturas privadas XBF para la investigación pública.

Quedan presupuesto fijo de mismo alcance, exposición aplicable actual, administración, conductor/cargas, seguros, mantenimiento/llantas, combustible/rendimiento, capital de trabajo, políticas y viaje/frontera. **B1/E1 abiertos, B2 parcial, 0/4 gates**. Este corte no cierra ninguno de los gates ni todas las fichas.

## Entorno, modelo y rollback

Worktree `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD base `4f5fc2de0c3d178dace917231e1092040dec21fd`. Git/worktrees verificados; AGENTS central vacío, sin AGENTS raíz/API/docs identificado; UI no editada, por lo que no corresponde wireframe nuevo. B3 sí exige MARKSMAN desktop/móvil.

Modelo/esfuerzo recomendado por actividad: **GPT-6.1 Sol · alto** para selección/aplicabilidad de fuentes, conciliación económica y comprobaciones/documentación; mismo recomendado para capital. No selección automática de modelo ni requisito Astra. Guía de análisis aplicada: separar observación, propuesta y estrés; conservar cohortes incompatibles. Guía PDF: verificar páginas originales, no sólo texto indexado.

Rollback: retirar únicamente este MD/JSON/notebook y `benchmark-reference-profile-evidence.test.ts`, más las dos notas nuevas en plan/estado. No revertir archivos compartidos enteros, plantillas, register ni cambios anteriores. Sin motor activo, DB/Neon, Auth, usuarios, infraestructura, deployments, transacciones ni IA de aplicación modificados; nada externo que restaurar.
