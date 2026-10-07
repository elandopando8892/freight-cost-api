# E1 · canasta MX por oferta, sin paquete artificial

Resultado: canasta de evidencia desarrollada y probada localmente; **canasta económica completa NO calibrada, E1/B2 siguen abiertos**. No nuevos importes adoptados ni cambio del cálculo de costos. La CLI existente incorpora la nueva revisión y su fuente fijada.

## Narrativa de este corte

Antes: un comparador de vales MX y la frontera US; ahorro, pensiones y bonos extra no estaban separados por oferta en la revisión ejecutable.

Ahora: cinco referencias conservadas individualmente, ocho conceptos por referencia y estados distintos para publicación mensual, incentivo por contratación, beneficio anunciado sin importe, ausencia de evidencia y fuente primaria no disponible. Se evita fabricar un paquete mezclando empleadores, sumar dos vales iguales o inferir costos cero.

Falta: importes/frecuencias y bases de ahorro/pensión/bonos recurrentes comparables al segmento binacional; aplicabilidad a septiembre, relevo y cargas patronales; luego pernocta/cumplimiento/seguros y otros remanentes. No se declara terminada la investigación monetaria. No hay otra respuesta humana requerida para este corte.

## Benchmark antes de implementar

Se reutilizaron las fuentes fijadas del corte anterior, la CLI de remuneración, el compositor público, Zod y los tests. Se revisaron las ofertas públicas del empleador y Git: HEAD`4f5fc2de0c3d178dace917231e1092040dec21fd`, rama`codex/cost-tires-release-s14`, worktree físico`D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`. Historial reciente mantiene el piloto y contratos B2; no se abre otra arquitectura ni capacidad de nómina.

Alternativas evaluadas: (1) usar porcentajes de agregadores/cap legales, sin base suficiente; (2) unir beneficios de distintas ofertas en un paquete, sin equivalencia; (3) separar cada oferta y admitir sólo componentes con evidencia suficiente. Se eligió3: bajo mantenimiento, sin dependencia nueva ni llamadas de pago, reutiliza el análisis existente y evita duplicación. Investigación significativa con fuentes propias, no un framework nuevo. No licencia externa nueva.

| Referencia | Evidencia observada | Uso permitido ahora |
|---|---|---|
| [Trayecto ALA CDMX](https://careers.trayecto.com/operador-ala-u1hSQWtXJaoU/) | Fuente anterior fijada; vales mensuales y bienvenida separados; ahorro/pensión sin importes | Comparador parcial existente; no paquete total |
| [Trayecto ALA Nuevo Laredo](https://careers.trayecto.com/operador-caja-seca-sencillo-xoJ4flyNma2V/) | Texto primario: sencillo/caja seca, conocimiento de rutas México/Bajío/Laredo; mismos vales y bienvenida, oferta cerrada y fecha exacta desconocida | Corrobora el componente y el entorno geográfico; **mismo grupo**, no otro empleador ni otro cargo |
| [FEMSA Altamira](https://careers.femsa.com/KOF/job/Altamira-OPERADOR-CARRETERA-NORESTE/1336881162/) | HTML directo: fecha24sep2026, full; ahorro, seguro de vida y vales sin cantidades | Contexto independiente, **no transferencia monetaria** a caja seca binacional; sueldo base+viajes no es bono/prestación. Identidad KOF/OXXO GAS mixta en el texto, no razón social afirmada |
| [GEPP local](https://oportunidades.gepp.com.mx/Detail/12282293) | Índice conserva una oferta; respuesta primaria indica que ya no está disponible | Evidencia del fallo de vigencia; sin copiar30días de aguinaldo u otros precios indexados al modelo |
| [Trayecto local](https://careers.trayecto.com/lmx-operador-local-NYCxr3K3y7ol/) | Índice describe contratación pagada en mensualidades; lectura directa403 | No fuente monetaria primaria verificada, sin reintento/bypass. Una cuota mensual de contratación no acredita un bono recurrente |

No se usan13% de ahorro de agregadores ni un límite deducible como dato de mercado. Lecturas públicas, sin solicitudes de empleo, mensajes, login, APIs nuevas ni acceso a datos de clientes.

Limitación de búsqueda: consultas específicas de beneficios/operadores produjeron también mecánicos, administrativos, full y referencias secundarias; no se presentaron como muestra equivalente. El lector web falló en FEMSA; una lectura HTTP pública normal verificó los hechos de esa página. GEPP devolvió un cuerpo de error con oferta retirada; el posterior acceso a Trayecto local fue403 y no se eludió. Ninguna búsqueda demuestra representatividad estadística del mercado.

## Resultado y criterios de cierre del desarrollo

Implementado en la revisión económica, no en UI ni valores canónicos:

- Cinco referencias,40filas de conceptos; tres ofertas con texto primario verificado y dos grupos independientes dentro de éstas.
- Dos referencias comparables **sólo para vales**, ambas del mismo grupo; **un grupo comparable**, no un promedio del mercado.
- Los3430MXN/empleado-mes del comparador anterior se conservan una vez. Ningún nuevo cargo de vales, incentivo de bienvenida o porcentaje genérico.
- La fecha de publicación en septiembre no prueba equivalencia de equipo, contrato binacional ni costo completo de septiembre.
- Fuentes inaccesibles, beneficios no anunciados y beneficios sin importe permanecen separados y con valores desconocidos; no se convierten a0.
- Inspección acepta un único ID de oferta. Rechaza selección múltiple, porcentajes o precios inyectados por el llamador. Inspeccionar no es adoptar.
- Casos anteriores de red/retorno dedicado y seis comparaciones FX sin cambios. Totales completosnull; estado`PARTIAL_COMPONENT_NOT_GATE_PASS`.

Estos criterios del adaptador se cumplen. **No cumple todavía el criterio económico de E1: evidencia suficiente para todos los inputs consumidos.** No se cierra E2/E3/E4 ni se atribuye aceptación humana al resultado.

Fuente nuevaJSON con huella UTF8 normalizada sólo CRLF→LF:`95309847c558c3a5c89d987daa6c8772fce448527b921a32e463d9acf033e853`. La revisión de remuneración tiene85pins; el snapshot HTTP anterior sigue con83pins y no fue regenerado. No se cambia el perfil confirmado ni fuentes antiguas.

## Verificación ejecutada

**172/172pruebas,7archivos PASS**: nueva canasta12, remuneración13, perfil12, expediente23, forecastMX28, reglas variablesMX21, compositor público63. Estrategia: integridad de la fuente, normalizaciónLF/CRLF, determinismo, errores/inyección, doble conteo, recurrencia, cohortes, fecha y desconocidos. Las pruebas de control usan entradas artificiales para errores; la integración usa las fuentes públicas fijadas, no nómina real.

Typecheck estricto de scripts y tests:0errores/PASS. CLI de remuneración: salida2esperada,85pins,2ciclos,0canastas completas para septiembre; ambos casos conservan3430MXN y costo completonull. Snapshot existente`--check`:0/PASS,4contextos/83pins, huella`99594a2ee1e31c67351a77d1124e75ec53d8d5ccbee593c7a5fce2baa264059f` intacta.

No edición de UI: wireframes MARKSMAN anteriores siguen vigentes, sin nueva pantalla ni prueba visual reclamada. No se probó login/persistencia real en este corte. No prueba de nómina, condiciones legales del empleador o uso operativo. Los cuatro fallos antiguos de recapeadas no están corregidos por estas pruebas focalizadas.

## Modelo, consumo y autoridad

Responsable: Codex, único escritor D:. Proveedor/superficie OpenAI/Codex Desktop; elección6.1Sol/high conservada de B2 y del corte anterior. Runtime exacto no observable, no cambio automático de modelo. Esta ampliación pequeña reutiliza contexto y verificaciones; no requiere segundo proveedor. Claude/Fable siguen candidatos para otros trabajos, pero disponibilidad actual no comprobada ni inferencia ejecutada para este adaptador verificable.

Presupuesto anunciado30min y hasta2reparaciones de código; ninguna reparación por fallo de test/typecheck. Investigación tuvo errores de lector/HTTP expresados arriba; no se confunden con consumo cero ni con evidencia validada. Tokens/costos reales del principal y cuota actual no observables en este corte; sin IAauxiliar, nuevos proveedores, créditos, uso extra o credenciales. No ampliación de alcance a producción ni del presupuesto global.

## Archivos y rollback

Nuevos: `apps/api/scripts/lib/b2-mx-benefit-baskets.ts`, `apps/api/tests/benchmark-b2-mx-benefit-baskets.test.ts`, `docs/research/B2_MX_BENEFIT_BASKETS_2026-10-03.json` y esta entrega. Modificados: la CLI`apps/api/scripts/review-b2-compensation-evidence.ts` añade import/revisión/pin/campo; `docs/SPRINT_STATUS.md` añade un checkpoint. No cambios de motor, APIHTTP, DB, Auth, usuarios, infraestructura, manifest o lockfile; no commit/despliegue.

Rollback selectivo: quitar únicamente la incorporación de canasta en esa CLI, estos cuatro archivos nuevos y el checkpoint de estado, previa revisión de cambios posteriores. Mantener la revisión de remuneración del corte anterior y todos los cambios ajenos. No `reset`/`clean` ni rollback de datos.

Siguiente prioridad económica: reconstruir la referencia de septiembre y resolver canasta recurrente, relevo y tratamiento patronal con evidencia aplicable; no convertir esta canasta parcial en una tarifa ni abrir más UI. La falta de una cantidad publicada permanece como pendiente de investigación, no autorización para inventarla.
