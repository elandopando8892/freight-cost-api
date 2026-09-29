# D2D: remolque compartido, cálculo local

Actualización: [referencias obligatorias por input y asignación](C1_SHARED_TRAILER_INPUT_EVIDENCE_2026-09-29.md). Amplía la trazabilidad del dossier descrita en este documento.

Inicio: `65bf934d938a83dc6262c334f9e97dddb414e378`, rama `codex/cost-tires-release-s14`, worktree `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`, limpio al inicio. Modelo recomendado para implementación y revisión matemática: Astra, esfuerzo alto. No se cambió el selector de modelo.

## Resultado

`SHARED_TRAILER` permite dos tractores nacionales con un remolque compartido. Ambos tramos deben declarar `TRACTOR_ONLY`. El remolque tiene referencia, declaración de exclusión en los tramos, justificación, siete inputs con unidades/derivación y dossier de fuentes con vigencia. No se aceptan totales calculados por el cliente. La modalidad anterior conserva compatibilidad: omitir assetCostScope sigue significando tractor y remolque por tramo.

CFU remolque = máximo entre km totales × fijo mensual / km productivos mensuales y días del ciclo × fijo mensual / días productivos mensuales.

CVU remolque = km totales × mantenimiento por km + km totales × llantas por km.

Costo D2D = CFU/CVU de ambos tractores + CFU/CVU del remolque una sola vez + servicios fronterizos documentados. Componentes redondeados a centavos; total reconciliado en centavos enteros. Km del remolque no pueden ser menores a la suma de km cargados; días no pueden ser menores a la suma de ciclos nacionales. Su reposicionamiento vacío debe documentarse explícitamente: no se supone igual al de los tractores. Tiempo de frontera adicional también debe incluirse en el ciclo documentado del remolque.

## Límite de la evidencia

TRACTOR_ONLY excluye automáticamente capital/rescate y llantas específicos de Remolque. No es posible separar automáticamente mantenimiento, seguros, gastos generales o capital de trabajo agregados: quien prepare los inputs debe entregar valores ya asignados solo a tractores y documentar la exclusión. La declaración no demuestra que esa asignación sea correcta. El combustible sigue representando al tractor arrastrando su carga; no se elimina consumo por retirar costos propios del remolque.

El dossier del remolque es conjunto; las derivaciones deben localizar el respaldo de cada input. El código verifica estructura, vigencia y consistencia, no autenticidad, suficiencia de fuentes ni calibración. Permanecen `DOCUMENTED_UNVERIFIED`, `calibrated=false`, compra/venta null y exclusiones de riesgo, impuestos, transbordo y márgenes. No hay importes de investigación nuevos ni base publicada. Tractor binacional permanece fuera del contrato.

## Validación

50/50 pruebas locales: D2D 21, tasas 15, tramo 14. Typecheck API PASS. Se verificaron exclusión de dependencias del remolque para MX/US, compatibilidad, suma única, centavos, scope incorrecto, modo incompatible, distancia/tiempo insuficiente, vigencia, duplicados, faltantes, desbordamiento, unidades y cero documentado. Fixtures sintéticos exclusivamente; no se cargaron a ninguna base de costos.

No hay UI nueva, por lo tanto este corte no introduce wireframe. Tampoco modifica endpoints, Auth, Neon, datos operativos, infraestructura ni Preview/producción. C1 sigue abierto: cálculo local no integrado ni gobernado.

## Siguiente entrega y rollback

Antes de adoptar importes: vincular evidencia revisada por input y por alcance de activo, resolver asignación de gastos agregados y comprobar una modalidad completa con fuentes públicas. Después integrar versionado gobernado y una UI con wireframe. No convertir esta prueba matemática en aceptación comercial.

Rollback: revertir únicamente el commit de este corte; no existen escrituras remotas que revertir. Conservar otros cambios si los hubiera al realizarlo.
