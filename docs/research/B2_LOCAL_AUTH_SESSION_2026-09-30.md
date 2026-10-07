# B2 · sesión real local conservada

Validación posterior al «listo» del usuario, 2026-09-30 (hora local). Worktree D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd comprobados. Políticas global/web releídas; cambios ajenos preservados. Sin código de implementación nuevo.

## Resultado comprobado

El usuario completó el acceso en **Chrome**, no en el navegador interno. La pestaña real en http://localhost:3000/ muestra el panel MARKSMAN y la identidad **sales@heymarksman.com**. Una recarga completa conserva URL, identidad, navegación y los cinco avisos de servicio no disponible, sin frame.join ni retorno al login. El servidor registra GET / **200** tras esa recarga.

Esto no es la fixture SSR anterior: el layout real ejecuta `supabase.auth.getUser()` y redirige si no hay usuario; el proxy real valida `getClaims()`. El código se inspeccionó sin modificarlo. La recarga acredita una sesión real aceptada por ambas compuertas. No se capturaron cookies, tokens o códigos. El intercambio del intento fresco no se observó directamente; no se afirma su trazabilidad completa sólo por la pantalla. No se provocó expiración/renovación ni cambio de cuenta; quedan pendientes. Los tests simulados anteriores no sustituyen estas pruebas.

[Captura real posterior a recarga](B2_LOCAL_AUTH_SESSION_2026-09-30.png). La pestaña Chrome queda abierta para continuar; la pestaña interna temporal sin sesión se cerró. No se cerraron otras pestañas del usuario ni se repitió Google.

## Bloqueo restante y siguiente único

API local 3002 **sin listener**, frontend local 3000 activo (PID 12812, sesión 20110). Los avisos no significan fallo de Google ni datos inexistentes. No se certifican organización, rol operator, permisos de negocio o acceso al motor por mostrar una identidad Supabase. El shell usa nombre de organización de respaldo porque API no responde.

Siguiente: acreditar un runtime API existente seguro para este alcance antes de activarlo y antes del candidato de ruta. No conectar automáticamente la configuración histórica Neon/Kinde ni ejecutar provisioning. Si necesita cambios de permisos, datos o infraestructura, presentar autorización puntual. Presupuesto anterior de una carga Maps y una consulta Routes no consumido en este corte: **0/0 llamadas nuevas**. B2 parcial; cero adopciones y sin cierre del MVP.

Sin Auth/Site URL/allowlist/Google keys, producción, DB/SQL/migraciones/usuarios, despliegue, operaciones de negocio ni IA de aplicación. No nuevas pruebas unitarias/build repetidos: no cambió implementación. Rollback de este corte: retirar sólo esta nota/captura y sus referencias; no hay cambio remoto que revertir.

Modelo recomendado **GPT-6.1 Sol · medio** para esta validación y el siguiente preflight. No se cambió selector ni se midieron tokens. Habilidades computer-use/debug orientaron observación de la pestaña correcta y separación sesión/datos; evidencia del worktree y compuertas se verificó en vivo.
