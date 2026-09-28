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

El segundo ADMIN deja de ser un requisito para ECONOMIC_ONLY. La siguiente validación usa las cuentas existentes y la decisión económica persistida; no requiere cuentas inventadas ni elevar permisos.

## Despliegue y navegador

- Frontend y API READY, exclusivamente preview, ambos del commit `2d805204d74840ba5cb1a34352387553e67046d6`.
- Web: `dpl_97dba4KwdUZwF4C8zqhBnGLBbDTL`, https://freight-cost-fucetsa8j-elandopando8892s-projects.vercel.app/cost-bases/tires
- API: `dpl_BQVSWsXiM5MUafD4PZvU5QYVdSd7`, https://freight-cost-88gm9pqkf-elandopando8892s-projects.vercel.app
- `/health` y `/ready`: HTTP 200; readiness identifica el commit correcto. Endpoint de revisores sin sesión: HTTP 401.
- Login real Google de OPERATOR: retorno al mismo origen, sesión reconocida y acceso al módulo; recarga conserva sesión y organización. El retorno OAuth termina en raíz, no conserva el destino profundo; se navegó después al módulo.
- Pantalla real: cero expedientes, revisión económica individual, publicación bloqueada. Los controles de asignar/aprobar/devolver tienen pruebas de componente, no una operación autenticada real sobre un expediente.
- Lectura posterior al login: tres usuarios, una organización, cero conjuntos de supuestos y cero expedientes. 45 migraciones terminadas; runtime sin superuser ni bypass RLS. El login de preview no sembró valores predeterminados.
- ADMIN y VIEWER no validados con login real en esta entrega; tampoco renovación de sesión ni decisión económica real. No se usó el logout global de Supabase para cambiar de cuenta, evitando afectar sesiones de otras aplicaciones.
- No se modificaron producción, Auth compartido ni parámetros de costos. La falta de datos económicos reales no se sustituye con fixtures en preview.

## Rollback

Puede retirarse el nuevo par de previews sin afectar producción. Para volver al código anterior en la base aislada, redeplegar el par anterior con la credencial vigente: la rotación exclusiva de preview impide asumir que el deployment antiguo siga operativo. Conservar la migración aditiva y los eventos; no borrar `reviewMode` ni registros económicos para simular una revisión independiente. La reversión funcional debe preservar la evidencia y volver a bloquear acciones no soportadas.

## Siguiente entrega

Incorporar un expediente derivado de benchmark público verificable y probar su revisión económica persistida con las identidades existentes. No se declara calibración completa, publicación ni aceptación operativa basándose solamente en estas pruebas.
