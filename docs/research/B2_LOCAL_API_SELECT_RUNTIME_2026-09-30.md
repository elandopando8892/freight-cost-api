# B2 · API local SELECT y lectura autenticada

## Resultado y alcance autorizado

Antes: frontend local con sesión Supabase real, pero API 3002 apagada; el dashboard no podía consultar organización, bases ni cotizaciones. La credencial recuperable de Preview era propietaria y no se usó como credencial de la aplicación.

Ahora: API en `127.0.0.1:3002`, frontend en `http://localhost:3000`, sesión existente y consultas reales a **FCM Neon Preview**. Se creó únicamente el rol dedicado `fcm_local_read_20260930`, según autorización puntual del usuario. Hubo DDL de rol y GRANT: no describir este corte como “sin cambios en Neon”. No hubo migraciones, escrituras de negocio, cambios de usuarios, Auth, producción, despliegues, llamadas Google ni IA de aplicación.

Worktree físico: `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`; rama `codex/cost-tires-release-s14`; HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. Se preservaron cambios locales anteriores. El SHA identifica HEAD, **no un candidato inmutable**: hay implementación local sin commit en Web/API. No se creó rama, PR ni preview.

## Benchmark proporcional y decisión

Se reutilizaron los handlers de lectura, la verificación Supabase y el modo existente `FCM_PREVIEW_EXISTING_USERS_ONLY`; no se reconstruyó autenticación ni se habilitó aprovisionamiento. Alternativas:

| Opción | Ajuste y riesgo | Decisión |
| --- | --- | --- |
| Credencial del deployment anterior | Limitada pero no recuperable para el runtime local; API remota de otro SHA | No mezclar versiones ni rotarla |
| Credencial propietaria recuperable | Permisos excesivos para una aplicación de lectura | Sólo preflight/DDL autorizado; desconectada antes de arrancar la API |
| Rol dedicado, permisos SELECT explícitos y API GET acotada | Reutiliza stack, evita privilegios de escritura y limita efectos antes de Auth | Adoptada temporalmente con autorización |

Se comprobó la política contra documentación primaria de [CREATE ROLE](https://www.postgresql.org/docs/17/sql-createrole.html), [GRANT y permisos de PUBLIC](https://www.postgresql.org/docs/17/sql-grant.html) y [configuración de transacciones](https://www.postgresql.org/docs/17/runtime-config-client.html). El default read-only no sustituye el análisis de privilegios efectivos. Sin dependencias o servicios nuevos; no se certifica costo monetario cero de la cuenta.

## Controles y evidencia

- Destino verificado por metadata Preview de Vercel: proyecto Neon `broad-art-99750179`, base `neondb`, host directo `ep-autumn-thunder-av6e9bsh.c-11.us-east-1.aws.neon.tech`. Se verificaron 46 migraciones terminadas y ninguna pendiente fallida, 3 usuarios, 2 bases y 11 cotizaciones.
- Rol nuevo: LOGIN por 24 horas, límite de 4 conexiones, NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOINHERIT/NOBYPASSRLS/NOREPLICATION. SELECT sobre 17 tablas explícitas; sin concesiones futuras/default grants. Lista exacta en `apps/api/src/config/local-read-review.ts`.
- Readback con la credencial limitada: 17 tablas legibles y cero tablas con permisos INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER; cero membresías/objetos propios y cero secuencias con USAGE/UPDATE. Sin CREATE en public/base, sin SELECT del ledger de migraciones, ni funciones SECURITY DEFINER ejecutables en public. No es una afirmación universal sobre todos los privilegios PostgreSQL, por ejemplo TEMP de PUBLIC.
- Los atributos revisados de `fcm_c1_preview_20260929` y `fcm_tire_v2_preview_20260929` permanecieron iguales. Conteos de usuarios/bases/cotizaciones iguales tras DDL; no se hizo checksum integral de datos.
- Contraseña aleatoria sólo en memoria del proceso; no se guardó ni imprimió URL, token, cookie, código OAuth o contraseña. El cliente propietario se desconectó antes del cliente de aplicación.
- Sólo GET exactos: `/health`, `/ready`, `/auth/me`, `/org`, `/cost-bases`, `/cost-bases/operational-segments`, `/cost-bases/presets`, `/market/fuel`, `/quotes`, `/onboarding/carrier`. Otros métodos/rutas se rechazan **antes** de Auth y handlers; no excepciones por rol ADMIN.
- Supabase existente `alqjqzqagdmcywpjtnnr`; configuración pública aprobada inyectada al proceso. `VERCEL_ENV=preview` selecciona configuración del runtime local, no implica un deployment. Auth y Site URL compartidos intactos.
- Maps/Routes, cron, captura research, Rateware e IA no habilitados. Las rutas de cálculo/guardado/publicación no forman parte de esta ejecución.

## Validación

| Evidencia | Resultado | Alcance real |
| --- | --- | --- |
| Unitarias de política y SQL plan | 40 PASS | Configuración y scope, datos sintéticos |
| Fastify real / proveedores mock | 9 PASS | Denegación antes de Auth; no acceso remoto |
| Regresión resolución Supabase | 7 PASS | No aprovisionar identidades en modo existente |
| Regresión API normal | 126 PASS | Opt-in no altera contrato normal |
| Typecheck API y launcher | PASS | Launcher incluye `src/types/fastify.d.ts`; omitirlo causó un error de comando inicial, corregido |
| Smoke live API | health/ready 200; org anónimo 401; POST quotes y GET routing/config 403 | API local, conexión Preview real; sin mutación de negocio |
| Chrome, sesión real, Inicio | Organización HeyMarksman; identidad visible Jose Andres Gonzalez Perales / ADMIN; 1 base activa, 11 cotizaciones | No cambia ni certifica el rol histórico solicitado de sales como OPERATOR |
| Chrome, Mis costos y recarga | 2 bases existentes; XBF-XB-PILOT v1 histórica, 5 rutas/10 cotizaciones; QA Intra-México sin versión activa | Lectura persistente real, no calibración ni guardado |

Total: **182/182 pruebas**. El dashboard muestra diésel histórico de agosto, no referencia vigente para cotizar. Mis costos indica **0 de 5 alcances listos**; que la base esté publicada no resuelve su perfil legado. Se verificó navegación Inicio → Mis costos → recarga → Inicio. Sesión sobrevivió la recarga; no se forzó renovación por vencimiento ni cambio de cuenta/aislamiento de un segundo tenant en esta ejecución.

Dos intentos de `Page.captureScreenshot` expiraron; no hay captura nueva disponible ni aprobación visual humana. Se conservó la pestaña real del panel para revisión. Se mantiene UI/wireframe existente, sin diseño nuevo. Los botones de edición pueden seguir visibles por el rol real ADMIN, pero este runtime devuelve 403; **no usarlo como entorno de edición/cotización**.

## Duración, recuperación y rollback

Rol válido hasta **2026-10-02 03:16:49.930 UTC**, equivalente a **2026-10-01 21:16:49.930 America/Mexico_City**. VALID UNTIL restringe nuevos logins: no elimina el rol ni cierra sesiones existentes. No se programó cleanup ni extensión automática.

Al cierre: frontend PID 12812 en 127.0.0.1:3000; API PID 25968 en 127.0.0.1:3002. Son evidencia temporal, no identificadores para reutilizar sin comprobar listener/proceso. Se dejan activos para revisión. Detener exclusivamente este runtime pierde la contraseña en memoria; no reejecutar `--apply` para reiniciar: se detiene si el rol existe, nunca rota credenciales automáticamente.

Rollback operativo inmediato: cerrar esta API verificada; frontend vuelve a estado explícito de API no disponible. Rollback de código: retirar sólo los archivos de este corte y los cambios `localReadOnlyReview` de `app.ts`, conservando el registro de rutas Google previo y todos los cambios ajenos. No usar reset/checkout globales.

Rollback del permiso requiere operación puntual revisada sobre **este rol en FCM Preview**: verificar que no tenga consumidores adicionales, deshabilitar LOGIN, revocar SELECT de las 17 tablas/USAGE/CONNECT concedidos y comprobar ausencia de dependencias antes de eliminarlo. No ejecutar `DROP OWNED`, no cambiar otros roles y no borrar datos. **Este rollback no fue ejecutado ni se autoriza por esta documentación.**

## Cierre y siguiente entregable

**Cerrado este corte: conexión local de sólo lectura y recorrido autenticado de lectura/recarga.** No equivale a cerrar B2 económico, E3, E4 o el MVP: cero parámetros adoptados y 0/4 gates completos.

Siguiente único: consumidor transitorio de revisión de ruta/mapa con presupuesto ya acotado, sólo después de adaptar la compuerta del runtime a esos efectos concretos y comprobar credenciales/restricciones. La autorización de SELECT no autoriza escribir bases ni activar producción. No repetir investigación genérica ni más pantallas; devolver candidato de ruta con límites (no validada para camión) y faltantes del caso México DF → Fort Smith vía Nuevo Laredo/Laredo.

Modelo recomendado: **GPT-6.1 Sol · alto** para permisos/implementación de este corte; **medio** para siguiente recorrido acotado si no aparecen cambios de seguridad. No se cambió el selector ni se dispone de medición de tokens/costo de esta ejecución.
