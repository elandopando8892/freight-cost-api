# ADR-012: coordinar el corte histórico y evaluar su aceptación

Estado: implementado localmente; conexión productiva pendiente.
Actualización 2026-10-09: [fuente Git e inspección PostgreSQL reales](../reviews/FCM_POSTGRES_INSPECTION_2026-10-09.md) implementadas y ensayadas localmente. El transporte de escritura sigue pendiente.
Fecha: 2026-10-08. Decisor de activación remota: propietario del producto.

## Contexto y benchmark

El paquete histórico y el ejecutor Docker ya aplican Prisma nativo conservando autores, economía y ledger. Hace falta coordinar el orden, la ventana y la recuperación de un intento; después acreditar el login de las dos cuentas autorizadas. No se modifica el motor de costos ni se crea UI.

| Alternativa | Ajuste, costo y mantenimiento | Decisión |
| --- | --- | --- |
| Ejecutar comandos manuales y completar una lista | Usa herramientas existentes, pero una interrupción pierde el estado de coordinación | Conservar comandos nativos dentro de un coordinador |
| Incorporar otro motor de migración o workflow | Añade dependencia, almacenamiento y adaptación del historial, sin resolver por sí solo la identidad | No adoptar en este bloque |
| Coordinar Prisma y respaldo existentes, con diario y adaptador explícitos | Código limitado de secuenciación; reutiliza licencia y dependencias existentes; exige probar el transporte real | Implementada localmente |

Se reutilizó el benchmark de [la transición histórica](../reviews/FCM_HISTORICAL_TRANSITION_REVIEW_2026-10-08.md) y [su ejecutor](../reviews/FCM_LOCAL_HISTORICAL_EXECUTOR_2026-10-08.md), inspeccionando el código actual y Prisma 5.22 instalado. La documentación oficial de [migrate deploy](https://docs.prisma.io/docs/cli/migrate/deploy) confirma que ese comando no verifica drift; se conserva el verificador estricto existente. No se trasladan flags de las versiones nuevas al CLI instalado. [PostgreSQL 16](https://www.postgresql.org/docs/16/backup-dump.html) documenta que un dump es una instantánea consistente pero no detiene escritores, y no incluye roles globales. Por eso el contrato del adaptador requiere mantenimiento real y una restauración comprobada; un hash no sustituye estas operaciones.

## Decisión y flujo

Contrato separado con SHA completo, target, paquete, plan, referencia humana y ventana. Coordinador: reservar target → inspeccionar → respaldar/restaurar → reinspeccionar → migrar/comprobar → guardar resultado. El adaptador devuelve evidencia y usa el paquete existente; no interpreta un booleano como consentimiento infalsificable.

Diario local por target, creación exclusiva, append y fsync. Un error, cierre de proceso o resultado incierto conserva la reserva. Una ejecución terminada puede releerse con el contrato idéntico y cronología válida; no relanza comandos. Cada operación tiene un máximo de 120 segundos o el remanente de ventana, el menor, y recibe AbortSignal. La cancelación solicitada no demuestra que el proveedor haya parado: se conserva incertidumbre y no se reintenta ni libera automáticamente.

La raíz del diario debe ser única y persistente para el operador. Cambiar de raíz/host evade este control cooperativo: la integración remota debe añadir exclusión durable en destino y mantenimiento de todos los escritores. El módulo no suministra ese adaptador, ni registra un endpoint o comando de migración remota. No es un ejecutor listo para producción.

El evaluador OAuth usa expectativa separada y evidencias reducidas sin tokens/cookies/códigos. Exige mismo par de despliegues/SHA, retorno al origen y `/auth/callback`, intercambio, sesión, recarga, emisión posterior de access token, identidad/rol/tenant estables, denegaciones, logout y cambio de cuenta. Reutiliza el parser de alcance cerrado sales/JG. La membresía JG esperada es VIEWER en la organización original; el rol esperado de sales se toma del inventario aprobado, no se asigna aquí.

SIMULATION_COMPLETE nunca equivale a OBSERVATIONS_COMPLETE. Incluso este último es una comprobación de consistencia de declaraciones: `independentlyVerified=false`. Las referencias hash no autentican a su autor ni sustituyen pruebas de navegador/API. La CLI offline devuelve 0 sólo para observaciones completas, 1 para simulación/incompleto, sin imprimir identidades o valores de evidencia.

## Consecuencias y cierre

No librerías, infraestructura, suscripciones, OAuth ni gasto nuevos. No cambios a las 47 migraciones o al esquema. El adaptador remoto deberá comprobar procedencia del paquete desde Git, target vivo, autoridad vigente, mantenimiento, respaldo/restauración (incluyendo las consideraciones de roles/ACL), cierre de procesos y ledger real. La promoción del par y membresía siguen siendo operaciones separadas gobernadas. El coordinador no las ejecuta.

Aceptación local: detención antes de una fase inválida, una sola ejecución simultánea, recuperación sin relanzar, errores redactados, deadline/reloj, y rechazo de evidencias incompletas de OAuth. La aceptación externa pendiente sigue exigiendo el recorrido real; esta decisión no declara producción terminada.
