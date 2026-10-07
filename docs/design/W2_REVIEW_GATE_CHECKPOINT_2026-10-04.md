# W2 · preparación probada, gate detenido por retorno OAuth

4 octubre 2026, checkpoint 17:20 America/Mexico_City. [Contrato y autoridad del corte](W2_REVIEW_GATE_CONTRACT_2026-10-04.md): máximo60min desde16:58:05.590, deadline fijo23:58:05.590Z/17:58:05.590 México. «Autorizo» cubre preparación QA/rol limitado/prueba local, **no cambios de Auth**. Respuesta humana «listo» al pedido de login no se tomó como prueba de sesión ni nueva autoridad.

**Preparación local desarrollada y probada; gate real todavía no ejecutado.** No base/versión/binding/rol creados, no proposal guardada o aplicada, no cambios a Auth/producción. El bloqueo del retorno se verificó antes de mutar Preview para evitar dejar accesos sin una sesión usable.

## Antes / ahora / faltante

Antes, el launcher/preparador vencido intentaba crear un perfil económico YARD_TRANSFER que V3 rechaza. Ahora preserva contexto económico crudo null y los210parámetros históricos, con binding B2 distinto. Base/version/binding/rol se preparan en una sola transacción administrativa, sin usar owner como runtime. El constructor puro de binding y el adapter ya entregados se reutilizan; no se relajó V3 ni se introdujo THROUGH_TRACTOR.

Falta crear el target real y demostrar sesión ADMIN, guardado/replay/recarga contra PostgreSQL con el rol limitado. La página4730 sigue siendo QA sintética, no esa evidencia. B2 calibrado y W2 operativo continúan abiertos; no costo observado del carrier ni cotización comercial habilitada.

## Cambios propios de implementación

- `scripts/lib/w2-review-preparation.ts`: source/org/base/status/hash/catálogo/canonical210/domain verificados; locks existentes, clon completo de campos económicos/metadatos, sin defaults/overrides. Nueva base DRAFT/no predeterminada/segmento null y versión DRAFT/no activa/no calibrada; lineage explícito. Único binding de revisión, después DDL/grants dentro de la misma transacción. Constructor no es HTTP.
- `scripts/prepare-w2-review-base.ts`: hijo administrativo sólo, endpoint Preview exacto, referencia de autoridad de este corte y ventana/expiración comprobadas. No servicio normal de alta que sintetiza perfil V3. Credenciales por stdin/memoria, no archivos/logs.
- `src/config/w2-local-gate.ts`: deadline fijo del nuevo corte, rechazo de reloj anterior/NaN/deadline, marca de rol propio para recuperación; grants acotados existentes y vigencia máxima24h. No autoridad permanente ni renovación al reiniciar.
- `scripts/start-w2-authenticated-gate.ts`: pins del preflight inmediato, creación conjunta vía hijo, economía/contexto/estado/usuarios fuente verificados; runtime existente-usuarios-only con endpoints exactos. Check contempla1binding+máximo1proposal; permite replay/reinicio sin nueva propuesta. Cleanup separado cierra runtime/conexiones y NOLOGIN sólo para rol con marca exacta, valida sesiones restantes; no borra datos ni modifica roles ajenos.
- Tests nuevos `w2-review-preparation.test.ts`, ampliación `w2-local-gate.test.ts`; contrato/este checkpoint/status. Archivos anteriores ya eran untracked: se conservan sus partes ajenas, no se atribuye todo a este corte.

## Pruebas después de última modificación

17:10:35, API: `vitest run tests/w2-review-preparation.test.ts tests/w2-local-gate.test.ts tests/cost-base-wizard-review-context.test.ts tests/cost-base-wizard-version.test.ts tests/cost-base-wizard-routes.test.ts`: **92/92PASS,5archivos**, duración9.22s.15tests nuevos de preparación: clon íntegro/sin perfil inventado, source/canonical/domain/base/catalog/actor corruptos, target existente, SQLinputs, expiración y discrepancia del clon antes de binding/DDL. Tests simulados, no transacción real ni rol creado.

Tipos focales: `tsc --noEmit --strict --skipLibCheck --esModuleInterop --resolveJsonModule --module NodeNext --moduleResolution NodeNext --target ES2022 src/types/fastify.d.ts scripts/prepare-w2-review-base.ts scripts/start-w2-authenticated-gate.ts scripts/lib/w2-review-preparation.ts`: exit0, después de modificación final. Primer encargo omitió `src/types/fastify.d.ts` y produjo TS2339 para request.user; corregida la invocación para incluir la augmentación existente, sin parche de Auth ni declarar aquel intento PASS. Sin fullbuild/typecheck general nuevo; errores generales previos ajenos no resueltos. No reparaciones repetidas de una causa de ejecución, ni mutaciones reintentadas.

Dry-run real del launcher **sin --apply**, concluido17:13:43: conexión Preview mediante lector verificado, transacciónREAD_ONLY, sourceParams210, sourceHash completo47a5bf5ea3571cad8b0c40a15b3715c93d0ab6ab93e1c9ad529f0e7270076346, roleAbsent/reviewBaseAbsent=true, apply=false; exit0/conexión cerrada. También comprobó los dos pins del preflight22:50Z y la integridad canónica/numeral. No arrancó API ni rol; esto no equivale a credenciales del rol limitado verificadas ni a guardado real.

Huellas de motor/perfil preservadas, verificadas en este corte:

| Archivo | SHA256 |
| --- | --- |
| engine.calculator.ts | 0b22dd0e223c300fbad40964d8c671660a4050c0cd409bbcc514353da5988ea6 |
| engine.outputs.ts | 3640a05d4cc10820f84de5f295f8d7e0413ad48a87a3921be8981336b6ef5d8b |
| benchmark-binational-cost-projection.ts | 4e93fcfba6c0da647006b077cc95895eefebab515a84eb11b27f9f8844444776 |
| cost-base-profile.ts | e33d6d8a480a02d4adb877881de9dc29559f273a1a4767dfa2e41f9085b9ff2f |

## Bloqueo real de sesión

Frontend existente Next16.3.3 arrancado sólo127.0.0.1:3001, API_URL sólo127.0.0.1:3002, origen local `http://localhost:3001`, claves públicas del proyecto Auth existente sólo memoria. Sin CLI/API pagada, telemetry deshabilitada, logs del devserver suprimidos para no exponer códigos de callback. Procesos propios de este corte: launcher10552/hijoNext25820; el PID es evidencia histórica, no autorización para matar un proceso si fue reutilizado. El launcher tiene autocierre de ese hijo/árbol a17:58:05.590; no se cambia su deadline al retomar. No tocar listenerQA4730 ajeno.

Se abrió el login y se pidió intervención humana. Tras «listo», navegador terminó en **https://rates.heymarksman.com/** con querycode; código no copiado a documentos ni reutilizado. Volver al login local mostró el formulario, no una sesión local. No se extrajeron cookies/tokens ni se fabricó JWT. Se ofreció contraseña sólo si ya existe, sin reset/usuario nuevo; esa alternativa aún no acreditada.

Revisión **sólo lectura** del dashboard Supabase, proyectoalqjqzqagdmcywpjtnnr, rateware-prod, branchmain/PRODUCTION, verificó:

- Site URL actual **https://rates.heymarksman.com/**, sin editar.
-35RedirectURLs. Ninguna entrada autoriza localhost:3001; `http://localhost:3001/auth/callback` ausente.
- Retornos FCM presentes: producción `https://freight-cost-web.vercel.app/auth/callback` y patrón `https://freight-cost-*-elandopando8892s-projects.vercel.app/auth/callback`.
- Existe un localhost4194de otra aplicación; **no se reutilizó** ni se cambiaron otros retornos.
- La ayuda vigente del formulario explica el fallback al Site URL cuando el retorno no coincide con la lista. Esto concuerda con el retorno observado a Rateware. No editar campos, AddURL, Savechanges, proveedores, claves ni permisos del dashboard.

[Captura completa sin cambios](W2_AUTH_REDIRECT_CONFIGURATION_2026-10-04.png), [vista de proyecto/SiteURL](W2_AUTH_REDIRECT_CONFIGURATION_VIEW_2026-10-04.png). [Documentación oficial de retornos](https://supabase.com/docs/guides/auth/redirect-urls) revalidada; changelog.md obtenido por HTTP tras limitación content-type del lectorweb. Escaneo de breakingchanges: cambio Auth relevante listado es self-hosted/API_EXTERNAL_URL/SAML, no aplica al proyecto hosted actual. No actualización de dependencia o implementación nueva de Supabase.

Skills testing-strategy/documentation guiaron los casos de integridad/errores y la separación de pruebas simuladas/RO/autenticadas. Supabase guió revalidación documental y revisión de seguridad, sin RLS de Neon ni cambios de Auth. Skill computer-use inspeccionada; trabajo realizado únicamente por el control de navegador disponible, no automatización nativa Windows ni credenciales. Su documentación favorece el navegador y mantiene handoff humano de autenticación.

## Decisión y recuperación

Para continuar sin cambios de Auth: sesión válida obtenida con contraseña **existente**, si la cuenta la tiene, dentro del tiempo restante del corte. Sin sesión no ejecutar --apply.

Si sólo Google, falta **autoridad puntual para añadir únicamente `http://localhost:3001/auth/callback` a RedirectURLs de rateware-prod y retirar esa entrada propia al terminar el gate**. No cambiar SiteURL, GoogleCloud/clienteOAuth, otros retornos/aplicaciones, claves, usuarios, sesiones compartidas ni producción del producto. Esto amplía Auth y no está concedido por la autorización actual. Confirmación humana debe preceder esa mutación; el deadline original no se renueva. No otra URL wildcard, preview o puerto por fallback.

No rollback PostgreSQL/rol necesario ahora: ningún target/binding/rol creado; consultaRO cerrada. RuntimeAPI no arrancado. Web local queda acotado sólo para el handoff de login, hasta deadline, sin credenciales de DB ni rol activo. Si el corte se cierra/vence, detener sólo proceso propio cuya identidad se compruebe; cualquier reanudación después de vencido requiere nueva ventana explícita, no cambiar constantes automáticamente.

Código listo para revisión local, no aplicado/desplegado. Rollback únicamente hunks propios enumerados; no gitreset/checkout, no borrar archivos ajenos. Rama/HEAD sin cambio; único escritorD. ProveedorCodex, recomendación autorizadagpt-6.1-sol/high, modelo/esfuerzo efectivos y uso/cuota/cargos desconocidos; sin Claude/subagentes/IA auxiliar, mapas, operaciones comerciales ni nuevas infraestructuras.
