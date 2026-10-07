# B2 · arranque local y compuerta de sesión

2026-09-30 19:15 GMT-6. Autorización puntual: iniciar app local, una carga de mapa y una consulta Laredo → Fort Smith, sin reintentos ni cambios de datos/Auth/producción. **Prueba real de mapa/ruta pendiente; autorización no consumida.**

## Comprobado

Rama codex/cost-tires-release-s14 y HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd, worktree en D:, políticas general/web releídas y cambios ajenos conservados. Reutilizado benchmark/adapter del corte B2 anterior; no nueva implementación ni suite repetida. Habilidad computer-use utilizada para navegación/observación; documentación local Next sobre entorno revisada.

Frontend Next 16.3.3 iniciado sólo en **127.0.0.1:3001**, proceso listener 28644 observado; sesión terminal 73603. Reutilizadas únicamente URL y publishable key públicas de Supabase desde la configuración FCM existente, validadas contra ref rateware-prod `alqjqzqagdmcywpjtnnr`. Inyectadas al proceso, sin copiar secretos ni archivos, sin claves Kinde/OpenAI o token de gestión Supabase en el proceso hijo. API_URL local 127.0.0.1:3000, no API remota antigua.

Navegación real a /scenarios/benchmark/route-review terminó en **/login?next=%2Fscenarios%2Fbenchmark%2Froute-review**, pantalla MARKSMAN/Supabase visible: no sesión local activa. GET sin cookies a /api/v1/routing/google-basic/config devolvió **401**. No verifica usuario/rol/organización, intercambio OAuth, recarga autenticada o renovación. [Captura del handoff sin secretos](B2_LOCAL_LOGIN_HANDOFF_2026-09-30.jpg).

## Bloqueos concretos, sin sustituciones

1. Inicio de sesión local por usuario con su cuenta existente; no crear otra cuenta ni introducir contraseña al chat. No se extraen cookies/tokens ni se fabrica una sesión para el test.
2. Este worktree no tiene configuración DATABASE_URL/Supabase de API local. Configuración anterior localizada en checkout base contiene Kinde y una conexión Neon remota; **no se usó**. El middleware normal authenticate puede ejecutar ensureActiveSet/provisioning; no iniciar el API con esa conexión para este alcance sin una garantía de sólo lectura. Reutilizar runtime limitado existente cuando se acredite; si requiere grants, rol nuevo o cambios remotos, pedir autorización específica. No modificar Auth/middleware para sortear la compuerta.

Maps aún no cargado y Routes no consultada: **cero eventos nuevos**, cero reintentos, sin cartografía retenida ni parámetros adoptados. No se probó el mapa con fixtures para declarar integración real. La solicitud real CLI de un corte anterior no sustituye esta aceptación UI/SaaS. B2 parcial, B1/E1 abiertos, cero adopciones, 0/4 gates.

## Siguiente y recuperación

Usuario inicia sesión en la pestaña real; antes de pulsar Consultar candidato, resolver/acreditar conexión segura de API. Mantener el presupuesto ya autorizado de una carga Maps y una solicitud Routes, sin recargas que carguen otro mapa ni reintentos. No cambiar cuotas/facturación ni garantizar costo cero.

Frontend queda abierto sólo para el handoff local; API real y bandera FCM_GOOGLE_ROUTE_REVIEW_ENABLED **no activadas**. Para recuperar, detener sólo la sesión/proceso local identificado, retirar las notas/captura de este corte si se desea y preservar los archivos privados y cambios ajenos. No rollback remoto necesario.

GPT-6.1 Sol · medio recomendado para preflight/navegación; no cambio de selector, subagentes ni tokens/precio de modelo medidos. Sin despliegue, migración, DB write, Auth/usuarios, negocio o IA de aplicación.
