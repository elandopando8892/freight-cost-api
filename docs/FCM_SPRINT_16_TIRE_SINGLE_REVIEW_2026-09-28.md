# Sprint 16 — revisión económica con las cuentas existentes

Decisión de producto: continuar sin segundo revisor. Modelo recomendado para esta actividad: GPT-6 Sol; esfuerzo alto.

## Resultado funcional

Autor → asignación a un ADMIN distinto → decisión económica → revisión económica completa. La UI presenta asignación, fundamento y acciones de aprobar/devolver según identidad y rol. VIEWER y ADMIN no asignado conservan consulta. Fuente/revisión obsoleta bloquea la escritura; un retry conserva el requestId.

La modalidad individual no produce un dictamen independiente ni publica costos. Los expedientes de doble revisión mantienen su funcionamiento. [Wireframe](design/tire-economic-review-wireframe.md) y [decisión arquitectónica](architecture/ADR-006-tire-economic-only-review.md).

## Evidencia

- PostgreSQL 17 desechable: 45 migraciones, replay sin pendientes; 15 pruebas de RLS/contrato aprobadas, incluyendo revisión individual y rechazo de paquete independiente.
- Backup/restauración local: mismas huellas, 3 expedientes, 9 eventos, 2 paquetes de los casos de doble revisión; cinco tablas con RLS forzada.
- Rutas, autorización y readiness: 19 pruebas aprobadas.
- Componente UI: 7 pruebas aprobadas; regresión web completa: 44 aprobadas.
- API build y typecheck API/web: aprobados.
- Regresión API: 629 pruebas aprobadas, 23 omitidas de otras integraciones PostgreSQL; la suite PostgreSQL de llantas se ejecutó por separado con éxito. Web build: aprobado.
- Migración `20260928000100_tire_economic_review` aplicada únicamente a `fcm_tire_s15_20260928` en el proyecto de staging `broad-art-99750179`.
- Tres vínculos de identidad existentes y una organización copiados a la base aislada, preservando roles. No se copiaron supuestos, bases, expedientes ni cotizaciones.
- Credencial de `fcm_tire_s15_app` rotada para el nuevo deployment; credenciales compartidas intactas.

La aceptación de login real, recarga y renovación no se deduce de estas pruebas. La prueba de PostgreSQL usa identidades y valores sintéticos, únicamente en el contenedor local eliminado después de ejecutarse. El preview no se llena con esos datos.

## Continuidad

El segundo ADMIN deja de ser un requisito para ECONOMIC_ONLY. La siguiente validación usa las cuentas existentes y la decisión económica persistida; no requiere cuentas inventadas ni elevar permisos. El despliegue y la verificación del navegador se registran como evidencia posterior del mismo desarrollo.
