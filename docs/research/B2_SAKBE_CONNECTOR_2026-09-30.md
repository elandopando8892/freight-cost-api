# B2 - Conector local SAKBE para ruta, distancia y casetas MX

Fecha de corte: 2026-09-30, America/Mexico_City. Worktree `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, verificados antes de editar. Políticas de ancestros y guía de pruebas revisadas; cambios tracked/untracked previos conservados.

## Resultado visible y límite

**Cliente server-side y CLI local implementados**, sin dependencias nuevas, ruta HTTP, UI, DB, migración, Auth, deploy o activación de un proveedor comercial. Se adapta la API de INEGI al expediente de viaje existente; no se construye otro motor ni se alimentan bases con valores de prueba. La consulta manual SICT queda como contraste, no como mecanismo principal futuro.

**La prueba real del corredor NO está completada.** Se hizo una sola consulta diagnóstica pública al endpoint `buscadestino` con búsqueda `Nuevo Laredo`, sin clave, sin registro de usuario ni datos privados: HTTP 200, envolvente `response.success=false`, mensaje de clave no autorizada. Eso acredita que respondió el endpoint y exige acceso; no acredita kilómetros, casetas, categoría, geometría ni tarifas contemporáneas. Es distinto de una prueba simulada y de una sesión autenticada del SaaS.

No se encontró `INEGI_SAKBE_TOKEN` en las variables Process/User/Machine verificadas; en este worktree sólo había `.env.example`, sin archivo local API con esa credencial. No se inspeccionaron secretos o cuentas remotas para declararlas inexistentes. El CLI nuevo confirma `BLOCKED / MISSING_TOKEN`, sin llamadas externas ni dependencia de datasource. Archivo privado preparado **vacío**, `.env.sakbe.local`, y `git check-ignore` confirma su exclusión. No se registró ni se usó una clave de ejemplo.

## Implementación lista para la prueba acotada

Archivos nuevos:

- `apps/api/src/modules/routing/sakbe.client.ts`: búsqueda de destinos y consulta de resumen/detalle de la misma ruta/perfil, salidas observadas normalizadas.
- `apps/api/scripts/query-sakbe-route.ts`: CLI independiente, configuración server-only desde variable del proceso o `.env.sakbe.local`. No carga `.env` general, Prisma ni servicios de negocio.
- `apps/api/tests/sakbe-client.test.ts`: 37 pruebas sintéticas; ningún importe, ID o token de estos fixtures se promueve al expediente real.
- `docs/research/B2_SAKBE_MX_REQUEST_DRAFT_2026-09-30.json`: solicitud borrador con IDs nulos; cinco ejes y ruta óptima sólo escenario de investigación. Sin seleccionar automáticamente puente/origen.

Contrato consultado en [INEGI API de Ruteo](https://www.inegi.org.mx/servicios/Ruteo/Default.html): POST para búsqueda, resumen y detalle; para cinco ejes la clase SAKBE es `v=8`, no el selector SICT `12`. Datos de resumen en km/min/MXN; detalle en metros/min/MXN. Destinos se obtienen primero; el cliente no elige el primer candidato ni inventa identificadores. Las rutas óptima/cuota/libre se emparejan con su detalle correspondiente. La categoría por ejes no certifica restricciones físicas o de carga del tractocamión.

Tokens sólo en cuerpo POST al origen HTTPS fijo de INEGI. Redirecciones se rechazan, timeout 15 segundos por llamada, límite de respuesta 2 MB, sin reintentos automáticos. Se descarta prosa de errores que pudiera incluir credenciales; propiedades arbitrarias de geometría se omiten, y etiquetas/instrucciones se limpian si ecoan el token. Nunca se incorpora el token a URL, respuesta, fixture real, repositorio o frontend. Un token de entorno explícitamente vacío deshabilita fallback al archivo, para que las pruebas sigan sin usar la credencial humana cuando exista.

La normalización conserva resumen y detalle separados y expone discrepancias, plazas con cero no verificado, peaje sin geometría, advertencias y cobros por ejes excedentes separados. No suma agregado y plazas, no calcula FX, no transforma tiempo ideal en ciclo ni divide el remolque. Datos ausentes o inválidos se rechazan, no se completan como cero. Se conserva atribución INEGI y documentación; el registro de consulta no es fecha efectiva de tarifa. Antes de guardar una respuesta real, revisar atribución/licencia y el precio vigente por movimiento cuando haya discrepancias.

## Cómo introducir el token y realizar la prueba

1. Obtener el token propio en el [formulario oficial de INEGI](https://gaia.inegi.org.mx/sakbe_v3.1/genera_token.jsp). INEGI documenta entrega por correo después del registro. No enviar datos del usuario ni aceptar términos por él; el usuario realiza ese paso.
2. Introducirlo sólo en `.env.sakbe.local` de este worktree, en `INEGI_SAKBE_TOKEN="..."`. No pegarlo en chat. Si se usa variable del proceso, tiene precedencia incluso cuando esté vacía. No usar `NEXT_PUBLIC_*`.
3. Desde este worktree, con el Node configurado y `node_modules/tsx/dist/cli.mjs`, ejecutar una búsqueda cada vez:

```text
apps/api/scripts/query-sakbe-route.ts "--search=Mexico, DF"
apps/api/scripts/query-sakbe-route.ts "--search=Nuevo Laredo"
```

Estas consultas no están ejecutadas con credencial válida aún. Usar los resultados reales para seleccionar el origen de referencia y el puente comercial, manteniendo pendiente su aceptación operativa. No asumir que `Nuevo Laredo` equivale a Puente III ni que un Zócalo es el domicilio de carga. No enviar domicilios privados sin autorización específica.

4. Introducir en el borrador los IDs/etiquetas realmente devueltos y documentar la selección; confirmar que el escenario de ejes corresponde al equipo a investigar. El borrador actual es deliberadamente inválido para enviar una ruta porque faltan IDs.
5. Ejecutar:

```text
apps/api/scripts/query-sakbe-route.ts --route=docs/research/B2_SAKBE_MX_REQUEST_DRAFT_2026-09-30.json
```

Salida de búsqueda exitosa: exit 0 y candidatos sin elegir. Ruta observada válida: exit 2 porque conserva `INCOMPLETE` económico y campos de handoff nulos. Falta token/acceso: exit 2 `BLOCKED`; error de entrada/esquema/transporte: exit 1. Código envolvente de PowerShell puede diferir: el test comprueba exit del proceso Node directamente. No imprimir ni archivar cuerpos de error del proveedor con el token.

**Siguiente único:** token propio -> búsqueda real -> respuesta MX de ruta/casetas normalizada y contrastada -> selección/cobertura/equipo/fecha -> enlace al preflight del caso, sin copiar observaciones directamente a inputs. No queda integrada todavía al frontend, persistencia, cotización o endpoint SaaS. México, DF -> Fort Smith AR 72916 vía Nuevo Laredo/Laredo continúa como corredor del usuario; itinerario US/ciclo/vacío/tasas nacionales/remolque y compra/venta siguen pendientes. HERE no se activó ni consultó; cualquier servicio facturable requiere evaluación de cuenta/cuota/costo y autorización puntual.

## Plan de pruebas y evidencia final

La guía `engineering:testing-strategy` enfocó el corte en integridad y acceso; sin pruebas triviales ni red real dentro de la suite.

| Área | Tipo / objetivo | Ejemplos |
| --- | --- | --- |
| Contrato de proveedor | Unidad con envolventes sintéticas | Resumen/detalle por modo, ejes, unidades y geometría GRS80; no reparación de nulos |
| Seguridad/transporte | Unidad con fetch inyectado | HTTP 200 rechazado, 401/403/429/500, timeout/límite de cuerpo, redirects prohibidos y no eco de token |
| Integridad del costo | Unidad | Resumen vs detalle, ceros/plazas incompletas, advertencias, extras separados y handoff nulo |
| CLI local | Proceso sin token y DB inválida | `MISSING_TOKEN`, exit 2 y no carga de datasource; variable vacía evita archivo humano |
| Regresión D2D | Pruebas focalizadas existentes | Expediente de ruta, readiness y compositor permanecen sin adopción |
| Live | Pendiente | Acceso válido, forma real de resumen/detalle, IDs elegidos y resultado del corredor |

**143/143 pruebas focalizadas en cuatro archivos PASS**, incluidas 37 nuevas. Typecheck API, script y test PASS. Primer intento de suite rechazó el token sintético por longitud de fixture; se corrigió el fixture, no se debilitó la validación. Archivo privado excluido de Git. Suite general, inventario canónico, frontend, sesión/persistencia y producción no certificados por este corte. Pruebas basadas en documentación no acreditan compatibilidad con una respuesta live aceptada: si difiere, adaptar sólo con esa evidencia, sin defaults silenciosos.

B1/E1 abiertos, B2 parcial, cero adopciones y 0/4 gates de negocio. No porcentaje de cierre inferido del número de tests. Modelo recomendado único para implementación y validación de contrato: **GPT-6.1 Sol, esfuerzo alto**; no cambio de selector ni agentes nuevos.

## Rollback acotado

No ejecutado: retirar únicamente cliente/CLI/test nuevos y borrador/documento de este corte, y sus párrafos en estado/plan. `.env.sakbe.local` debe conservarse si el usuario llega a introducir una credencial; retirarlo sólo con autorización y sin exponer su contenido. No alterar el expediente SICT, caso D2D anterior, otros módulos ni cambios ajenos. No commit/push, DB/Neon, Auth/usuarios, deploy, infraestructura, operación de negocio ni IA de aplicación; no hay efecto remoto que revertir.
