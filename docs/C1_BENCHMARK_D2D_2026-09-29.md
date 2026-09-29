# Composición local D2D de benchmark

Inicio: `1e84e20a0d9d0026b61dc95a29bdc7326a7c10bf`, `codex/cost-tires-release-s14`, worktree D: limpio. Modelo recomendado: Astra alto. Entrega backend local, sin UI, migraciones ni despliegue.

`calculateBenchmarkD2D` recibe parámetros canónicos y datos de viaje de dos tramos, recalcula tasas y CFU/CVU, y agrega cargos documentados de cruce/intercambio. No acepta totales externos. Soporta orden MX→US y US→MX sin intercambiar parámetros nacionales. La fecha de ambos tramos debe coincidir con el servicio; MX/US deben ocupar su lugar explícito.

Costo productivo estimado D2D = CFU MX + CVU MX + CFU US + CVU US + servicios fronterizos documentados. La suma usa centavos enteros y rechaza resultados fuera del rango numérico seguro. Riesgo, impuestos, transbordo, margen del transportista y margen XBF permanecen excluidos; compra y venta permanecen `null`.

## Cobertura de cargos

Cada cargo declara ID, proveedor, conceptos cubiertos, USD, derivación, URL/localización, observación y vigencia. CROSSING e INTERCHANGE deben estar cubiertos exactamente una vez. Se admite un solo paquete que cubra ambos, o cargos separados. Duplicar ID o cobertura bloquea; omitir un concepto también. Cero explícito exige documentación. No existe `INCLUDED_IN_LEG`: los tramos domésticos no contabilizan estos conceptos y admitirlo ocultaría un faltante.

Este control detecta doble conteo declarado en conceptos, no falsedad de la fuente ni un cargo oculto en otros inputs. La revisión de evidencia y de inclusión sigue siendo necesaria.

## Alcance de activos y recorrido

El único contrato habilitado es `SEPARATE_TRACTOR_TRAILER_PER_LEG`, con justificación explícita: cada tramo asigna costos de su propia cohorte. El cálculo no acredita que esa asignación sea físicamente correcta para una operación real. Remolque compartido, tractor binacional y transbordo se rechazan como contratos no implementados; no relabelar una operación real para hacerla pasar.

La ruta conserva extremos y gateways MX/US como contexto, pero todavía no comprueba geográficamente distancias, continuidad ni coincidencia con fuentes. El resultado permanece `DOCUMENTED_UNVERIFIED`, `calibrated=false`, con todo el linaje de parámetros, tasas, viajes y cargos. No es una base publicada ni una tarifa comercial.

## Validación y continuidad

57/57 pruebas: conjunto económico (D2D 11, tasas 12, tramo 14) y auditores C1 (20). Typecheck API PASS. Incluyen reconciliación de centavos, paquete contado una vez, sentido inverso, duplicados, vigencias, país/fecha incorrectos, datos ausentes, cero documentado y rechazo de totales inyectados/activos no soportados. Los datos son fixtures sintéticos, no benchmark calibrado.

El auditor C1 se actualizó a `LOCAL_D2D_NOT_INTEGRATED` y conserva `THIRD_PARTY_BENCHMARK_NOT_GOVERNED`. El siguiente desarrollo debe resolver la asignación de activos compartidos y el contrato operativo por modalidad, además de integrar evidencia revisada y versiones. La cobertura matemática local no cierra C1 ni autoriza activar XBF-XB-PILOT. Toda UI nueva requerirá wireframe.

Rollback: revertir el commit local; no hay datos remotos que revertir. No se cambió el Preview, Auth, infraestructura ni las bases existentes.
