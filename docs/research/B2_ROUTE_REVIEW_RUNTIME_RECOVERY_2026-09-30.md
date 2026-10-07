# B2 · siguiente paso: recuperar runtime y revisar candidato US

## Comprobación actual (fecha local 2026-09-30)

Worktree físico D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; rama codex/cost-tires-release-s14, HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd y worktrees verificados. Políticas AGENTS vigentes leídas; cambios locales ajenos conservados.

Los listeners 3000 y 3002 ya no existen. Chrome no conserva la pestaña local previa y una apertura dirigida a la pantalla existente de revisión devolvió conexión rechazada. Esto no prueba fallo de OAuth ni pérdida de la sesión Supabase. No se repitió login ni se solicitó la ruta.

Readback **actual**, mediante helper existente que verifica el target FCM Neon Preview y una transacción READ ONLY sobre catálogos: rol `fcm_local_read_20260930` existe, LOGIN habilitado, sin SUPERUSER/CREATEDB/CREATEROLE/BYPASSRLS, 17 tablas legibles, cero tablas con DML y cero sesiones. Vencimiento conservado: 2026-10-02 03:16:49.930 UTC, **1 oct 2026 21:16:49.930 de México**. No se consultó hash/password ni filas de negocio; cero DDL/DML.

La contraseña anterior se generó sólo en memoria del proceso ya detenido. El launcher de creación rechaza un rol existente y no sirve para recuperación. No se ejecutó `--apply`, no se rotó la credencial ni se reutilizó owner para el runtime.

## Reutilización y recomendación

Se inspeccionaron los contratos actuales de `google-route-review.routes.ts`, `google-basic-route.client.ts`, el BFF, `RouteReview`, el adapter de mapa, pruebas y [wireframe existente](../design/google-route-review-wireframe.md). Se reutiliza el [benchmark Maps/Routes](B2_GOOGLE_ROUTE_REVIEW_UI_2026-09-30.md); no hay nueva elección de proveedor, SDK o arquitectura. La parte estándar (mapa/consulta) continúa sobre Google; el gobierno económico permanece en FCM.

Alternativas de recuperación:

1. **Mismo rol exclusivo, misma expiración y grants**, restablecer sólo su contraseña tras autorización puntual y conservarla cifrada para reinicios durante su vigencia. Recomendada: no duplicar roles ni alterar consumidores ajenos.
2. Crear otro rol: descartada por duplicación innecesaria de permisos/cleanup.
3. Owner en aplicación o backend paralelo para sortear la compuerta: descartados por permisos excesivos o divergencia del stack/flujo aprobado.

La persistencia cifrada es una **propuesta**, no una acción ejecutada: protección Windows DPAPI CurrentUser, archivo privado ignorado dentro de D:, sin texto plano/repositorio/chat y sin token Supabase. Se debe verificar soporte y exclusión Git antes de guardar; si no es posible, no guardar una alternativa en claro. La recuperación actual requiere consentimiento para la contraseña de **este rol**, no para credenciales de roles anteriores ni Auth compartido.

## Próxima ejecución concreta y cierre

Objetivo: una sesión existente de FCM abre la pantalla MARKSMAN de revisión y ve el candidato **Laredo, TX → Fort Smith, AR 72916** del corredor México DF → Nuevo Laredo/Laredo → Fort Smith. No se promete mapa completo MX/US ni ruta certificada para camión; DRIVE, domicilios nominales, cruce y peajes mantienen sus limitaciones.

Después de autorización puntual de recuperación:

- Revalidar target/rol/grants y cero sesiones; restablecer únicamente contraseña del rol local, **sin ampliar vencimiento ni grants**. Leerla con el cliente limitado y verificar privilegios antes de arrancar. Conservar propietario fuera del cliente de aplicación.
- Recuperación cifrada local, si autorizada, para no necesitar nuevas rotaciones después de cada proceso detenido. Guardar sólo la credencial limitada, no owner ni secrets compartidos; acceso y vigencia documentados, archivo ignorado por Git.
- Adaptar la compuerta existente a dos rutas específicas de revisión Google, conservando bloqueadas todas las escrituras de negocio, cron, IA, producción y aprovisionamiento. Acotar el POST al tramo nominal aprobado; config no consulta proveedor. No copiar clave servidor a cliente ni habilitar un segundo backend.
- Reiniciar localmente Web/API sobre el worktree actual; callback/origen localhost:3000 ya aprobados. Conservar wireframe/diseño, sin nueva pantalla. Verificar sesión/config y restricciones antes del consumo.
- Presupuesto previo vigente: **como máximo una carga de mapa y una tentativa Routes, cero retries**; no se solicita nuevo presupuesto ni se afirma costo cero de la cuenta. SDK/mapa primero; si falla, no pedir ruta. Reservar cupo antes del proveedor; no reiniciar para reponerlo tras un intento.
- Cierre: mapa/candidato transitorio visibles, atribución, permisos, límite/duplicación y limpieza al salir; observaciones no adoptadas. Recarga limpia contenido sin restaurar cupo Routes en el runtime; registrar lo real frente a mocks. No almacenar geometría/capturas cartográficas ni alimentar CFU/CVU.

Pruebas a ejecutar tras el cambio: política de runtime, perfil/ruta permitida y denegación de otros POST; regresión permisos/config/cupo del plugin; UI y adapter afectados. Después, una comprobación real acotada. No se repiten suites o builds sin modificación: en este corte no cambió código ni se ejecutó proveedor. Las 182/234 pruebas de cortes anteriores no se presentan como nuevas.

## Estado, límites y rollback

**Pendiente autoridad:** restablecer contraseña del rol exclusivo y guardar copia cifrada local. Se mantiene presupuesto Maps/Routes sin consumir (0/0 nuevas); no se activa runtime con owner. No código, permisos, Auth, migraciones, usuarios, datos, infraestructura, deployment, negocio o IA de aplicación cambiados. Este preflight no cierra la revisión de mapa/ruta, B2 ni el MVP económico (0 adopciones; 0/4 gates completos).

Rollback de este corte documental: retirar sólo este informe y su nota de estado. El rollback de la recuperación propuesta no se ejecuta aquí: detener únicamente procesos identificados, retirar la copia privada de manera controlada y deshabilitar/revocar sólo el rol dedicado si se autoriza, sin tocar roles previos, datos o producción.

Modelo recomendado único **GPT-6.1 Sol**: medio en este diagnóstico; alto para recuperación de credencial/compuerta y verificación de permisos; medio para la demostración acotada. Sin cambio del selector ni tokens/costo medidos. Las habilidades de pruebas y navegador guiaron las verificaciones esenciales y la distinción entre conexión rechazada, sesión y consumo externo.
