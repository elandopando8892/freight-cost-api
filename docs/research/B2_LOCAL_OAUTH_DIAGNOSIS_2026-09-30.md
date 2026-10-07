# B2 · diagnóstico de retorno OAuth local

Fecha 2026-09-30, tras usuario «listo pero no procede». Diagnóstico únicamente: sin cambio de Auth/configuración cloud/código, sin login nuevo ni intercambio manual del código recibido.

## Evidencia

Worktree D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd; reglas general/web y habilidades engineering:debug y supabase revisadas. Changelog actual consultado: la entrada Breaking Change visible es de PostgreSQL, no causa observada de este retorno; ninguna actualización/migración realizada.

1. Frontend iniciado en http://127.0.0.1:3001, sin NEXT_PUBLIC_SITE_URL ni origen Vercel Preview en proceso. `apps/web/lib/supabase/site-url.ts` retorna http://localhost:3001 en desarrollo sin override. `loginWithGoogle` compone `/auth/callback` sobre ese origen. **Origen de inicio y callback distintos**: las cookies PKCE de uno no pertenecen al otro.
2. GET autorizado sólo en lectura de `/v1/projects/alqjqzqagdmcywpjtnnr/config/auth`: Site URL actual **https://rates.heymarksman.com/**; 37 retornos. Mediante helper existente `supabaseRedirectPatternMatches`, **ningún patrón** cubre http://localhost:3001/auth/callback ni http://127.0.0.1:3001/auth/callback. Retornos locales observados de otros puertos no cubren 3001. No se modificó ni reprodujo la configuración completa o claves del servicio.
3. URL reportada por usuario: login con destino interno raíz que contiene un parámetro code, no callback. Valor omitido y no archivado. Logs locales revisados en memoria y saneados antes de mostrarlos: solicitudes GET/POST login; no petición `/auth/callback` observada en el lote disponible. **No se acredita intercambio de código ni sesión**, ni se atribuye la secuencia externa completa a un redirect específico no observado.

La clave de Maps no participa en este paso. La falta de API local segura es otro bloqueo posterior, no la causa de que el callback no establezca sesión ahora. Cero consultas Google Maps/Routes adicionales, sin tocar Neon/usuarios/datos/infraestructura/producción.

## Recomendación mínima, pendiente autorización

Conservar un único origen: **http://127.0.0.1:3001**. Fijar sólo la variable del proceso local `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3001` al reiniciar frontend. Agregar **una sola** entrada exacta a `uri_allow_list`: **http://127.0.0.1:3001/auth/callback**. El Site URL compartido, los otros 37 retornos y todas las aplicaciones/credenciales se conservan; no wildcard, localhost adicional, producción o cambio de proveedor.

Alternativas: usar localhost exigiría igualmente autorizar su callback y abrir todo en localhost; agregar ambos orígenes amplía cobertura innecesariamente para esta prueba. Recomendado mantener el origen del navegador ya utilizado y la restricción Maps existente.

Requiere autorización puntual **antes** de agregar ese retorno en Auth. No consta otorgada para este cambio en el presente diagnóstico. Tras autorización, comprobar readback preservando lista/Site URL, reiniciar sólo proceso local y pedir un login fresco del usuario desde URL limpia; no reutilizar código viejo ni copiar/verificador entre orígenes. Después comprobar callback, sesión/recarga/BFF antes de la única carga Maps y consulta Routes previamente autorizadas. La API segura sigue pendiente.

Rollback propuesto, no ejecutado: retirar exclusivamente esa entrada nueva si se añadió, preservando las otras y Site URL; detener/restaurar sólo override del proceso local. Sin DB/usuario/migración/deploy ni rollback de credenciales Maps.

Fuentes: [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [changelog](https://supabase.com/changelog). Se reutiliza auditor/matching existentes, sin build/suites repetidas por diagnóstico. GPT-6.1 Sol · medio recomendado; sin selector cambiado/tokens medidos/subagentes.
