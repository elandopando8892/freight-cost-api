# Economía/persistencia: preview pareado y recorrido real

23 septiembre2026. Autorización: continuar con despliegue de API y frontend del mismo commit únicamente en preview y validar el recorrido. Sin nuevas migraciones, cambios de Auth ni producción.

## Resultado de negocio y entrega

Una sesión real de HeyMarksman pudo capturar costos de terceros, calcular2530USD, guardarv1, reabrir/recargar, preparar y guardarv2 con2730USD y consultar ambas desde historial. V1 permaneció intacta. Los dos registros son **sintéticos, marcados QA y NO COMERCIALES**; no son cotizaciones de venta ni validación de las tarifas de un proveedor real.

Código desplegado: `419b10c202d396eed1801e5b3ce3e6393d4faf6e`, rama `codex/quote-integrity-sprint`. Worktree comprobado `D:/andre/worktrees/freight-cost-model/supabase-auth-migration-20260830`, limpio después del commit. Se preservaron y consolidaron los cambios de economía/persistencia de las entregas anteriores; no se hizo push ni se modificaron otros worktrees. Esta evidencia se registra después del commit desplegado y no implica otro deployment.

- Web: https://freight-cost-87rse8dmr-elandopando8892s-projects.vercel.app/quote/partners/saved — `dpl_HjffdshxzeHMbCCT37x3SU3Ro727`.
- API: https://freight-cost-p3xutzrt4-elandopando8892s-projects.vercel.app — `dpl_FCcnhmzQNm4B9UDUFMFPuxEX4TVY`.
- Proyectos verificados en vivo: `freight-cost-web`, `prj_yDKQHWchDSqxPSh1RF6SJnhiwzxV`, root apps/web; `freight-cost-api`, `prj_mw1xLIqutlRSIG2F2BryfPqDvN2L`, root apps/api; ambos Node24.x, team `team_KUG1PtOwoJ16eUqxiOJ330Os` / `elandopando8892s-projects`.
- Ambos READY, target null, metadata `gitCommitSha=419b10c...`, `gitDirty=0`, comprobados mediante GET al proveedor. [Evidencia redactada](PREVIEW_PARTNER_COST_REVISIONS_2026-09-23.json). Metadatos declarados no equivalen por sí solos a prueba autenticada.

## Fuente, build y límites del despliegue

Exportación `git archive` de524 archivos rastreados a `D:/andre/tmp/fcm-419b10c-preview`; ambos builds recibieron522 archivos según logs del proveedor. No se exportaron node_modules, .env.local, credenciales ni el respaldo privado. Escáner de secretos rastreados:524 archivos, aprobado.

CLI con `--project` explícito, `--target preview`, `--yes --no-wait`; se verificó READY posteriormente (el mensaje inicial de CLI decía ready aunque readyState era INITIALIZING; no se aceptó ese mensaje como prueba). Sin `--prod`, promoción ni modificación de aliases productivos.

API build: VERCEL_GIT_COMMIT_REF=codex/quote-integrity-sprint, SHA explícito, FCM_STAGING_MIGRATION_CONFIRMATION=DISABLED y FCM_PRODUCTION_MIGRATION_CONFIRMATION=DISABLED. RELEASE_SHA en build/runtime. Generó Prisma Client5.22.0; log confirma `Production migrations skipped outside Vercel Production.` Web build: Next16.3.3/TypeScript aprobado; API_URL fijado en build/runtime a la API exacta de arriba. Son overrides de estos deployments, no cambios a variables compartidas.

Inventario de base posterior a las18:50:50.025UTC:40 migraciones válidas, sin fallos/drift/duplicados. Sólo `20260830000200_finalize_supabase_identity` permanece pendiente deliberadamente. El código1 de ese inventario es esperado: no ejecutar migrate deploy general para dejarlo verde. No se aplicó SQL de migración en este seguimiento.

Health18:51:10.287UTC:status ok, release419b10c. Ready18:51:10.908UTC:base connected, mismo SHA. Esta prueba no equivale a login ni a aislamiento.

## Validación nueva de esta entrega

- API:565 pruebas aprobadas;11 omitidas por no configurar DB en esa invocación (9 de socios y2 heredadas de Quote). No se cuentan como aprobadas. Las9 de socios sobre PostgreSQL17/esquema40 fueron ejecutadas en la ventana aditiva anterior, documentada por separado.
- Typecheck API aprobado. Build web local aprobado. Pruebas web focalizadas de captura/historial:11/11. No se afirma una nueva ejecución de todas las pruebas web ni de lint.
- `npm audit --omit=dev`:0 vulnerabilidades. El build remoto de web informa13 hallazgos en su instalación completa:2low,4moderate,6high,1critical. No se ocultaron ni se ejecutó audit fix --force. Auditoría de dependencias de desarrollo pendiente como gate de release; no afirmar ausencia total de vulnerabilidades.
- Smoke no autenticado en modo BFF:5PASS + API_CORS NOT_APPLICABLE, ready=true limitado a `read-only-unauthenticated-smoke`. BFF sin sesión devuelve401/no-store. El formulario usa /api/v1 y lib/api.ts añade token verificado hacia API_URL. No se abrió CORS global.

## Recorrido autenticado observado

Chrome perfil MARKSMAN, pestaña creada para QA. Entrada al preview → login → Continuar con Google → proveedor `alqjqzqagdmcywpjtnnr.supabase.co` → selección de cuenta existente sales@heymarksman.com → mismo origen de preview, organización HeyMarksman, rol **ADMIN**. No se cambió ese rol ni se crearon cuentas. No se extrajeron cookies, códigos OAuth ni tokens.

El retorno terminó en `/`, no en el `next=/quote/partners` solicitado; se navegó explícitamente a la captura. Se registra esta fricción de retorno para revisión futura; no se cambió Auth para corregirla. Este recorrido comprueba el acceso de esta URL concreta, no una nueva auditoría administrativa de toda la allowlist ni todos los previews futuros.

Captura manual de fixture por la UI: origen `QA 419b10c - Monterrey, NL`, destino `QA - Dallas, TX`; todas las referencias/proveedores/FX/supuestos contienen QA/no comercial. Fecha2026-10-10 y vigencia octubre2026. MX17000MXN + combustible1700 + peajes850, FX17; US1200USD + peajes30, combustible incluido; cruce150USD e intercambio incluido en MX. Resultado revisado2530USD.

| Evidencia persistida | V1 | V2 |
| --- | --- | --- |
| ID | `78f897c0-5a1f-4335-b7b0-9c4a73ad2698` | `9beca7cd-410a-49c2-8d91-f893aa0b6cff` |
| Creación UTC | 18:54:30.017 | 18:55:35.795 |
| Tarifa US sintética | 1200USD | 1400USD |
| Costo compra | 2530USD | 2730USD |
| Padre | ninguno | ID de V1 |
| Huella | `0dcb9a696eea1f4ef2f6028491895962f7871ca35eb1505f27ef792a7f74d71e` | `fc8cb0c0e519760c344024a5cead7cd0f2a38d0916f831fbb70b0e1202200cf7` |

Se pulsó guardar una vez por versión. V1 se abrió y recargó con2530USD; V2 se precargó desde V1, cambió sólo la tarifa US, recalculó y guardó2730USD. V2 se recargó conservando sesión/total. Historial mostró exactamente ambas versiones; al volver a V1 seguía2530USD, enlace a V2 y ausencia del control Preparar nueva versión. Inspección visual de escritorio aprobada para el detalle observado; no se repitió QA móvil en este preview.

Verificación independiente por conexión PostgreSQL al destino aislado: transacción READ ONLY, búsqueda limitada a los dos IDs QA y conteo de su marcador dentro de la misma organización. **PASS:**2 registros, IDs/versiones/padre/misma organización/importes correctos; ambas huellas recalculadas válidas; conteo2 sin duplicados del fixture. No se leyeron ni imprimieron otras estimaciones o identidades.

Los dos registros se conservan como evidencia sintética. No se borraron datos ni se enviaron cotizaciones, correos o eventos de negocio. No hubo consumo de IA del producto ni modificaciones en producción.

## Incidencias de herramientas y pendientes honestos

- Conector de build logs devolvió herramienta no encontrada; CLI inspect --logs proporcionó los logs reales.
- Un timeout del control de navegador durante recarga de V2 se resolvió observando URL/DOM actuales; no se repitió ningún guardado. Un primer diagnóstico SQL local quedó sin conclusión; una nueva consulta exclusivamente de lectura con etapas confirmó los dos registros. No se atribuye una causa que no fue capturada.
- Login+recarga **no prueba renovación por expiración**; permanece pendiente. No se alteraron relojes, duración de tokens ni configuración de Auth para simularla.
- OPERATOR/VIEWER y segundo tenant reales siguen pendientes. Las pruebas locales de roles/tenant/concurrencia no sustituyen sus recorridos autenticados.
- Pérdida de respuesta/reintento y competencia por una sucesora están probados localmente, no provocados en este preview. El conteo2 del fixture no equivale a demostrar un reintento remoto.
- Fuentes/tarifas reales, aceptación económica, segmentos adicionales y salida a producción no se dan por cerrados.

## Rollback y siguiente cierre

Si falla login, historial o integridad, dejar de usar esta pareja y volver al preview anterior: web `freight-cost-qu5sz8lxu-elandopando8892s-projects.vercel.app`, API `freight-cost-6b5xtep9g-elandopando8892s-projects.vercel.app`, SHA `6b804d7b976e35e68feaa1e544c15bb474c636b5`. Conservar esquema aditivo y evidencia; no DROP ni restore destructivo. No tocar aliases de producción.

Siguiente gate acotado: sesiones existentes OPERATOR/VIEWER, renovación real y un caso de tarifas respaldadas por documentos; cerrar también los hallazgos de desarrollo antes de declarar release completo. No seguir añadiendo segmentos como sustituto de esa aceptación.

La skill engineering:deploy-checklist orientó exportación reproducible, separación de evidencias y rollback. Modelo/esfuerzo recomendado: Astra/alto para release, integridad y diagnóstico; configuración de la sesión conservada, sin afirmar cambio de modelo ni delegar agentes. Sin cambios gráficos en esta entrega; los wireframes del flujo desplegado están en docs/design/THIRD_PARTY_COST_HANDOFF.md.
