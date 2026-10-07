# B2 · importe de contraste para daño físico de una caja propia

Corte local del 1 de octubre de 2026, 23:29 MX. Resultado: referencia monetaria conectada a `SHARED_TRAILER_INSURANCE`, **no seguro binacional completo ni cierre de B2**. Se mantiene el caso México, DF → Fort Smith AR 72916 vía Puente III, caja seca 53′ y relevo propio MX/US conservando la misma caja.

## Benchmark y decisión previa

Reutilizamos la normalización de seguros, el presupuesto de diez familias y la proyección local existentes. No añadimos un motor, proveedor, infraestructura ni conector de cotización.

| Alternativa | Ajuste y límites | Decisión |
|---|---|---|
| Normalizar la guía pública de daño físico para caja propia | Aporta importes USD y regla por valor; alcance estadounidense, sin muestra estadística publicada ni cobertura México acreditada | Integrar como contraste parcial, sin seleccionar prima |
| Usar el promedio nacional del paquete del tractor | Ya disponible, pero no permite identificar la prima de la caja | No sustituir ni sumar como prima de caja |
| Cotizar mediante API/formulario de aseguradora | Podría precisar territorio/cobertura; acceso, requisitos y efectos de cotización no verificados | Fuera de este corte; no se envían datos ni solicitudes |

Fuente: [guía de Logrock](https://www.logrock.com/commercial-truck-insurance/truck-trailer-insurance-2/), publicada el 19 de febrero de 2026, revisada mediante lector web a las 05:25:48 UTC del 2 de octubre. Localizador: introducción y sección de costo de daño físico de remolque propio. El broker publica USD 25–150 por caja-mes y una regla anual del 1%–3% del valor declarado. Son **dos representaciones alternativas**, no cargos acumulables, intervalos de confianza ni límites obligatorios de una prima. La evidencia es una orientación del propio publicador, no una distribución auditada de pólizas. No se archivó el HTML original; la ficha JSON preserva los datos estructurados y la referencia, sin afirmar que sea copia del original.

## Qué funciona ahora

- La ficha fechada y su SHA-256 se agregan como pin 42 al resumen existente.
- Resultado mensual publicado: USD 25–150; equivalencia anual calculada: USD 300–1,800. No equivale a facturación mensual ni a una póliza anual cotizada.
- La regla por valor calcula `valor USD × tasa anual / 12` sólo cuando existe valor explícito. El valor asegurado del piloto sigue desconocido: no se convierte el anuncio mexicano con FX inventado ni se sustituye por una caja nueva estadounidense.
- El cálculo exige una caja física y etiqueta US/daño físico de caja propia. Rechaza MXN, territorio MX, intercambio de caja ajena, duplicación del activo, valores inválidos, rangos invertidos y porcentajes confundidos con fracciones.
- El rango publicado no recorta la fórmula por valor y no se elige automáticamente mínimo, máximo o punto medio. No se agrega prima por cada tractor/país ni se asigna costo cero a coberturas desconocidas.

Se conserva pendiente la selección económica del supuesto, propiedad/custodia/garaje modelados, deducibles/cargos/otras coberturas y términos para México/frontera. No se requiere póliza privada real para un modelo público, pero esta guía no acredita esos términos. La familia completa permanece null.

## Validación y alcance real

**282 pruebas PASS**: resumen integrado 184, presupuesto binacional 30, exposición 35 y seguro/employer 33. Incluyen cuatro valores sintéticos para comprobar la fórmula; no son valores del piloto. `tsc --noEmit` PASS. CLI ejecutada y releída: exit 2 deliberado por economía incompleta, 42 pins, **0/10 partidas fijas completas**, seis outputs finales null y ninguna adopción. El CLI no está acreditando un costo D2D utilizable. `git diff --check` PASS, con advertencias de finales de línea en cambios previos que no se modifican.

No hubo UI nueva, prueba autenticada, póliza real, DB/Auth/usuarios/migraciones, infraestructura, despliegue, llamadas Google/aseguradora, operación de negocio ni IA de la aplicación. Validación de transformación local, no aceptación operativa. La skill `engineering:testing-strategy` concentró la verificación en unidades, integridad, duplicación y alcance territorial; no provocó builds generales repetidos.

## Registro de ejecución y consumo

Responsable de implementación/integración/verificación: Codex, único escritor. Recomendado para revisión económica e implementación: OpenAI GPT-6.1 Sol, esfuerzo alto. El catálogo disponible describe ese modelo; no prueba el ID/esfuerzo del principal en esta conversación. Selector sin cambio y ninguna ejecución auxiliar. Claude/Sonnet/Fable no aportan ventaja necesaria para este cálculo determinista; no se invocan ni se atribuye contribución.

Lectura automática de Codex al inicio, 1 octubre 23:20:38 MX: ventana primaria semanal 100% utilizada, `ordinaryUsageAllowed=false`, siguiente reposición 6 octubre 13:08 MX; ventana secundaria no informada, créditos disponibles. No se activan créditos ni facturación. Cuota del plan, tokens y costo real son métricas distintas: consumo monetario y tokens de este corte no observables. Claude Max x5 es declaración histórica del usuario; ventana cinco horas/semanal/Fable/reposición/ruta incluida/uso extra actuales desconocidos, sin lectura de credenciales ni instalación de lector.

Presupuesto previo: 20 minutos, un reintento por fallo, parada ante fuente insuficiente o expansión externa. Un `rg` con globs literales Windows falló y se corrigió; su consumo no se cuenta como cero. Pruebas/typecheck pasan en primera ejecución, sin reparación de código. Sin segundo modelo, contexto repetido ni llamadas de pago a proveedores; esto no garantiza costo cero de Codex. Tiempo transcurrido al registrar: aproximadamente nueve minutos; sin reserva porcentual inventada.

## Continuidad y rollback

Worktree físico D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; rama codex/cost-tires-release-s14; HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd. Estado inicial con 110 entradas ajenas/previas conservado; sin commit, staging ni rama nueva.

Rollback local: retirar únicamente la nueva función y sus pruebas, importación/pin/referencias/propiedad de este corte, ficha JSON/este informe y los dos párrafos nuevos de estado/plan. Los helpers y scripts ya contenían trabajo previo y son untracked: **no eliminar archivos completos ni usar reset/restore general**. Reejecutar los tests afectados y la proyección anterior de 41 pins. No hay rollback externo.

B2 mantiene su objetivo íntegro: completar presupuestos públicos compatibles por recurso y administración única, capacidad productiva y ciclo US/frontera/vacíos, costos variables y costo D2D reproducible en contado y financiado. El siguiente trabajo debe cerrar partidas económicas con los benchmarks ya reunidos y supuestos revisados; no otra ronda genérica de FX, Auth, IRP o búsqueda de APIs. B3 llevará el cálculo completo a seleccionar/calcular/guardar/reabrir con wireframes MARKSMAN. No se pide información privada de XBF ni se declara terminado por disponer de otro contraste.
