# Remolque compartido: tenencia e inclusiones mensuales

Inicio: `c3b4a7a266db5ca809b738df98f059f8c6548a0a`, rama `codex/cost-tires-release-s14`, worktree limpio en D:. Modelo recomendado para implementación y revisión: Astra alto. No se cambió selector de modelo ni se delegó.

## Entregable local

El contrato `costAgreement` identifica `OWNED` con `DEPRECIATION_AND_FINANCING` o `LEASED` con `LEASE_RENT`. Son bases económicas de asignación, no clasificación contable/legal de un contrato. El fijo mensual continúa siendo un input respaldado: el adaptador no puede detectar renta escondida en un importe presentado como depreciación, ni descomponer un total incorrecto por sí solo. No declara calibración.

Cada acuerdo exige derivación y referencias al dossier. `includedInMonthlyFixed` permite declarar MAINTENANCE y/o TIRES para el arrendado. El componente variable incluido debe ser cero explícito, con su propia derivación y fuente; null sigue siendo dato faltante, no cero. Nunca se descarta silenciosamente un valor no cero. Se bloquean inclusiones repetidas, base incompatible, paquete en activo propio y acuerdo ausente. El modo propio con paquete separado permanece no soportado.

Los documentos anteriores sin acuerdo se leen pero producen INCOMPLETE. No existe inferencia automática de tenencia. La cobertura de evidencia agrega un noveno campo, costAgreement, conservando el linaje completo. No se cambia la aritmética de los otros modos de D2D.

## Alcance y límites

Solo se representan inclusiones en el fijo mensual documentado, asignado con la fórmula económica existente por tiempo/distancia. No se representa factura de renta ni cargo de mantenimiento por milla, mínimos, franquicias, sobreuso, daños, impuestos o penalizaciones. No usar un precio por uso como fijo mensual ni suponer que un paquete incluye todos los riesgos. El expediente público previo identifica esas diferencias, pero no da importes adoptables.

No hay investigación nueva ni cambios de UI en este corte; por ello no hay wireframe nuevo. No se modificaron Preview, Auth, infraestructura, bases publicadas ni cotizaciones. No se agregaron precios sintéticos a datos operativos.

## Validación

84/84 pruebas: D2D 46, tasas 15, tramo 14, auditor de modelo 9. Typecheck API PASS. Las once pruebas nuevas verifican cuatro combinaciones de inclusiones mensuales y siete defectos de contrato, incluyendo doble conteo explícito. Son fixtures sintéticos de lógica, no evidencia de suficiencia económica. git diff --check sin errores.

## Continuidad y rollback

Siguiente paso: recopilar precios públicos comparables por tenencia/configuración y completar derivaciones sin combinar renta con depreciación del mismo activo; los paquetes por uso requieren contrato adicional antes de adoptarse. Mantener la matriz de faltantes del expediente, sin declarar cerrada la calibración.

Rollback: revertir únicamente el commit local de este corte. No hay escrituras remotas. La reversión retira este control y no equivale a autorización para publicar datos.
