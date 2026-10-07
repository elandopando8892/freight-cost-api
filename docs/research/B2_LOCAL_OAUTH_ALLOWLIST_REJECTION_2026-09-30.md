# B2 · cambio autorizado, rechazo de límite de retornos

2026-09-30 19:44 GMT-6. Usuario autorizó agregar sólo http://127.0.0.1:3001/auth/callback y alinear el origen del proceso local. **Origen local alineado; retorno remoto NO agregado**, por rechazo explícito del proveedor.

## Acción y readback

Políticas/AGENTS web y skill Supabase revisadas; benchmark/diagnóstico anterior reutilizados. Worktree D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd; cambios ajenos conservados.

Identidad rateware-prod/alqjqzqagdmcywpjtnnr verificada por GET. PATCH únicamente `uri_allow_list`, sin Site URL/provider/clave/usuario. Primera respuesta 400; readback intacto. Tras revisar tipo del campo y entradas sin corregirlas, segunda tentativa controlada obtuvo el motivo: **Validation failed because these config entries have large values: URI_ALLOW_LIST**. No bucle ni tercera tentativa. La autorización de una carga Maps/una consulta Routes no se consumió por estas peticiones de administración Auth.

Lista previa: **37 entradas, 2022 caracteres**. Agregar el callback exacto daría **2058 caracteres**, rechazado; no se afirma un máximo numérico no documentado. Readback: mismo hash previo/posterior `c1f73bf357deff211c289426b3f2b7c6ed7847afe9a46aaef44d1ae9edaa1575`, 37 entradas, Site URL **https://rates.heymarksman.com/** intacto y **ningún otro campo de Auth cambiado**. [Recibo saneado](B2_LOCAL_OAUTH_ALLOWLIST_REJECTION_2026-09-30.json). No cuerpos Auth completos ni secretos archivados.

Sesión local anterior 73603 detenida y listener anterior ausente antes del nuevo arranque. Nuevo frontend sesión 86777, limitado a 127.0.0.1:3001, con `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3001` inyectado sólo al proceso. Se mantiene Supabase público aprobado y API_URL http://127.0.0.1:3000; token de gestión/OpenAI/variables Vercel excluidos del hijo. No se alteró archivo privado de Maps ni se habilitó API real. El callback ahora coincide con origen de inicio **pero sigue fuera de lista**, así que no pedir repetir Google en 3001 ni reutilizar código anterior.

## Alternativa mínima recomendada y autoridad pendiente

La lista vigente ya contiene **http://localhost:3000/**. Recomendado mover **toda la prueba web y callback al mismo origen http://localhost:3000**, con NEXT_PUBLIC_SITE_URL equivalente. Mover el upstream API local a un puerto libre separado cuando su runtime seguro se acredite. No tomar el Site URL compartido ni cambiar Auth remoto otra vez.

Maps sólo permite orígenes 3001 en la clave exclusiva FCM Maps Web Local (b7a9e18e-309a-4eea-b787-2867174cad12). **Requiere nueva autorización puntual** reemplazar sus dos restricciones web locales por **http://localhost:3000/***. Maps JavaScript API sigue siendo la única API; no crear otra clave ni ampliar a comodines de dominio/producción. Cambio Google y puerto alternativo NO ejecutados en este corte.

Alternativa descartada dentro de esta autorización: compactar/eliminar retornos ajenos para liberar espacio. Podría romper otras apps; exige verificar consumidores y autorización distinta, no asumir obsolescencia por nombre/fecha. No se eliminaron siquiera retornos FCM de producción/previews.

## Estado y recuperación

Config remota intacta: no rollback de Auth necesario. Para retiro local detener exclusivamente sesión 86777; override vive sólo en proceso, no archivo. Conservar claves privadas, evidencia y trabajo ajeno. Google Maps/Routes nuevas **0/0**, ningún login fresco realizado por agente, ninguna sesión/intercambio/recarga/renovación certificados. API segura sigue pendiente. B2 parcial, cero adopciones, 0/4 gates.

GPT-6.1 Sol · medio recomendado; selector no cambiado/tokens no medidos. No Neon/DB/migración/usuario/deploy/negocio/IA de aplicación. Skill Supabase influyó en readback y detenerse tras dos rechazos; no forzar cambios ajenos.

Fuentes: [Management API: update Auth config](https://supabase.com/docs/reference/api/v1-update-auth-service-config), [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls). No build/suites repetidas porque no cambió implementación; sólo configuración local de proceso y verificaciones remotas.
