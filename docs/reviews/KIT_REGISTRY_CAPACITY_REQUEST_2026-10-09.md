# Propuesta concreta: capacidad del registro de Claude Kit

> **Archivada como decisión histórica.** La alternativa64→128 de este documento ya no es trabajo pendiente: el usuario autorizó y se activó `assignment-capacity-100000-20261010T020421Z`. `kit_info` confirma release cargada/activa, `restart_required: false` y modo `user_managed`. El límite de100,000 corresponde a entradas técnicas del registro, no a consumo disponible de Claude. Para el procedimiento vigente consulte [OPERATING.md](D:/andre/apps/codex-home/integrations/claude-review/OPERATING.md); para el plan de producto, [cierre Should-Cost](../design/SHOULD_COST_PRODUCT_CLOSEOUT_2026-10-09.md). Todo lo siguiente describe el diagnóstico y la propuesta de aquel momento.

## Problema observado

Release activa/cargada personal-usage-20261009T153439Z, modo user_managed. Los bloqueos anteriores de cierre global desaparecieron en este turno. Se pudo autorizar el ledger local-isolated-recovery-20261009 y ejecutar diseño Fable más encargo Opus. El encargo Opus se cerró sin cambios por contexto incompleto del coordinador; para el reencargo diagnosticado, el helper allowlist.py plan rechazó el candidato de65entradas con `registry entity limit`. No registro/ampliación/launch aplicado. No es cuota ni límite del proveedor. No eliminar historia ni reutilizar contrato ejecutado para liberar espacio.

## Alternativas y recomendación

1. Retirar entradas anteriores: arriesga accesibilidad histórica y requeriría resolver relaciones/receipts. No recomendado como limpieza para desbloquear esta tarea.
2. Ampliar sólo capacidad técnica de assignments a128: cambio localizado, conserva namespace, recibos, autoridades, consumo, leases, permisos y límites por solicitud. Recomendado con validación y activación gobernadas.
3. Rediseñar almacenamiento en registro segmentado o nuevo servicio: costo/retrabajo desproporcionados para65entradas; diferir.

Benchmark reutilizado: registro P2/versionado del kit instalado, plan/apply con hashes/inventario/receipt; la capacidad de consumo user_managed ya está implementada y no necesita ser reescrita. No tecnología nueva. Capacidad ampliada no significa permisos nuevos para esas entradas ni más gasto.

## Cambio solicitado, todavía no implementado

Crear una candidata del kit, no modificar directamente release sellada o registro vivo. Ampliar cardinalidad de assignments64→128 en normalize() de allowlist.py y referencias técnicas correspondientes. Conservar límite de raíces, scope.tasks por sprint64, JSON1MiB, contextos6, rutas12, argv6, bytes/pasos/deadlines por encargo y demás validaciones. No tocar autenticación, extra usage, modelos, guardas de cierre o bibliotecas externas. No borrar entries/leases/receipts/counters. El plan de FCM permanece en la misma raíz y ledger, mismo problema y modelo seleccionado.

Pruebas propuestas, sólo offline: aceptar65y128encargos; rechazar129; conservar todos IDs/autoridades; plan/apply/replayexacto y rechazo de estado concurrente; rechazo de roles/rutas/secretos/leases fuera de contrato; report/historia accesible para encargos originales. Suite proporcional del kit y verificación de manifiesto. Ninguna inferencia para esas pruebas.

Activación: ruta soportada existente con manifiesto/hashes, respaldo y rollback, sólo tras confirmar cierre de procesos/leases propietarios y autorización de la ventana aplicable. No sustituir el MCP remoto/local por un runner alternativo. No efectuar activación para probar un modelo ni alterar jobs ya sellados. Rollback restaura release anterior conservando nuevo inventario y evidencia según procedimiento P2; no sobrescribir una versión concurrente del registro.

Requiere autorización específica de implementación del kit y de su activación; la solicitud de continuar Should-Cost no se interpreta automáticamente como permiso para modificar este validador compartido. La propuesta está lista para revisar. Sin esa ampliación, el encargo corregido necesita capacidad existente liberada por un procedimiento soportado por sus propietarios; no una nueva autorización genérica de modelos.
