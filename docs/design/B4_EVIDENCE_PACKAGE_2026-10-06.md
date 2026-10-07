# B4 · evidencias depuradas sin alterar el benchmark

## Contrato autorizado

La respuesta humana «autorizo», posterior a la pregunta específica sobre preparar evidencias depuradas para Git conservando originales y hashes fuera del commit, autoriza este paquete local. No autoriza stage/commit/push/deploy, Auth, SQL, adopción económica ni reabrir QA. Checkout D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; branch codex/cost-tires-release-s14; HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd.

Objetivo: conservar fuera del repositorio una copia exacta de los nueve HTML señalados; producir derivados HTML sin las cadenas Google detectadas, con originalSHA, derivedSHA y posiciones de redacción; verificar la relación sin imprimir claves. Los originales locales también permanecen intactos y sin stage. Ningún lector económico se cambia para aceptar un derivado como original. No UI nueva: wireframes/branding existentes se conservan.

## Benchmark y elección proporcional

Se revisaron el scanner existente, manifiesto B4, source.archive.file/sha256 en reference-mx-yard y el historial Git. Los archivos afectados son untracked; sus referencias económicas usan hashes originales. Tres enfoques:

1. Sustituir capturas y hashes canónicos: rompe la trazabilidad histórica; rechazado.
2. Añadir excepciones al scanner o esconder cadenas: oculta el hallazgo; rechazado.
3. Separar original externo y derivado explícito, validando bytes y lineage: elegido. Node ya instalado, sin dependencias, servicios, licencias nuevas ni costos recurrentes activados.

Se reutiliza SHA-256 de [Node crypto](https://nodejs.org/api/crypto.html#cryptocreatehashalgorithm-options). La preservación en Git se delimita sólo al directorio nuevo mediante atributo -text, porque [Git puede normalizar finales de línea](https://git-scm.com/docs/gitattributes). No configuración Git global, scanner ni atributos de capturas históricas modificados.

## Cierre y límites

- Copias externas verificadas contra los originales, sin sobrescribir ni eliminar.
- Derivados verificables sin vault: prueba integridad del derivado, NO de la reconstrucción original.
- Con vault: prueba hash original y derivación exacta; cambios fuera de redacciones deben fallar.
- Guardas de ruta, symlink, corrupción y replay; logs nunca contienen valores de claves.
- Snapshot económico y todos los archivos del candidato anterior sin drift.
- Scanner global se conserva: seguirá rechazando los originales presentes. No afirmar CI verde.
- Una copia limpia sin originales NO ejecuta aún todos los tests de reconstrucción histórica. Este paquete no modifica sus contratos ni instala/restaura originales en CI. Su entrega completa es otro gate de consolidación, no una adopción implícita de datos sanitizados.

Ejecutor Codex/OpenAI actual, recomendado GPT-6.1 Sol/high; modelo/esfuerzo efectivo desconocidos, sin cambio nativo. Claude considerado: no aporta suficiente retorno en transformación determinista verificable y su cupo anterior está cerrado. Cero llamadas Claude/subagentes/APIs de negocio. Presupuesto 35 minutos desde 21:20 hasta 21:55 CDMX; una preparación real, replay idempotente y máximo dos correcciones causales locales. Cuota/cargos efectivos no observables; no activar uso extra. Skills engineering:deploy-checklist, test-driven-development y verification-before-completion.

## Evidencia de ejecución

Paquete preparado en `docs/research/sources-sanitized/`: nueve HTML completos derivados y manifest.json. Originales exactos respaldados en `D:/andre/evidence-vault/fcm-b4-20261006`, nombrados por SHA256 original; permanecen también en sus rutas locales, sin stage. Se redactaron **41 ocurrencias**, no se imprimió ni probó ninguna clave. El propietario y las restricciones de estas cadenas siguen sin determinarse. Vault local fuera de Git, sin nueva infraestructura, cifrado especial ni servicios contratados; no publicarlo ni tratarlo como un repositorio de credenciales.

Manifiesto SHA256: `93c13a30f7c7332c0bf82670b90d9c60b15327c484ed03a5f05e99b6373c262f`. Es huella de archivo, no Git commit ni prueba infalsificable de consentimiento. El manifiesto conserva originalPath/SHA/bytes y derivedPath/SHA/bytes con offsets exactos, sin retener los valores retirados. Ningún original o metadata económica se reemplazó.

Comandos desde el checkout físico:

```powershell
npm test --prefix tools/evidence-package
node tools/evidence-package/package.mjs verify
node tools/evidence-package/package.mjs verify --vault D:/andre/evidence-vault/fcm-b4-20261006
```

Preparación inicial con `prepare --vault ...`: exit0, 9 derivados/9 originales/41 redacciones. Replay exacto: exit0, mismo manifiesto, sin sobrescrituras. Verificación sin vault: exit0, 9 derivados/**0 originales**, explícitamente DERIVATIVE_ONLY; con vault: exit0, 9 originales y derivación exacta. No sustituyen ni ejecutan lectores económicos de reconstrucción; éstos conservan su hash original y fallarán si falta el original.

TDD del tooling aislado Node existente: 7 aserciones RED por capacidad ausente; después 3 RED de guardas filesystem y 3 RED de empaquetado; suite completa final **13/13 PASS**, 0 SKIP. Comprueba corrupción original/derivado, modificación de precio fuera de redacciones incluso con derivedSHA recalculado, CRLF/bytes no UTF8 intactos, NUL rechazado, path traversal/symlink, vault externo y replay sin sobreescritura. La expectativa manual de offset se corrigió de 30 a 31 antes de la implementación; no se cambió el comportamiento para aceptar una expectativa incorrecta. Fixtures sintéticas temporales propias eliminadas; no contenedores ni conexiones DB.

Preservación actual: **1,038 archivos** de apps/packages/capturas originales comparados por SHA256 antes/después, 0 cambios o faltantes. El pack económico SHA256 `d1235ca788312cb5f0dd7b82a8354809ab93756e57bf5385483e52f0026d7df0` intacto. Ningún código/tests API/Web ni JSON económico cambió en este bloque; sus builds/suites anteriores no se presentan como reejecutados. El tooling tiene suite independiente completa, sin nuevas dependencias.

Git check-attr reconoce -text sólo en el nuevo directorio. Comparación del filtro real `git hash-object --path=<archivo>` con SHA1 de bytes/blob: **10/10 idénticos** (9 HTML + manifest), incluso con core.autocrlf:true. Sin -w ni stage, no escribe objetos/commits. Esto prueba el filtro local, **no un checkout limpio ni CI**.

Scanner existente sin modificaciones: exit1, exactamente las mismas 9 rutas originales, ningún hallazgo nuevo en derivados/herramienta/manifiesto. Los originales locales no se ignoran ni borran para obtener un falso verde. Los 4 errores lint any del corte anterior siguen como pendiente; no se editaron esos tests ni ejecutó verify:ci global. Índice vacío y branch/HEAD conservados; ninguna sesión, lease, API, Auth/Google, Neon o producción activada.

**Cierre de este bloque:** preparación/lineage de derivados completada localmente. **No cierre de B4 ni release:** falta reunir el soporte íntegro del candidato, probar reconstrucción desde copia limpia con originales externos explícitamente disponibles, revisar lint y la lista final para consolidación por GitSHA. No restauración automática de originales en CI, staging/commit/push ni despliegue autorizados por esta entrega.

## Rollback

Retirar sólo derivados, herramienta y documentos nuevos de este bloque, conservando el vault y los originales. No borrar automáticamente el vault; no cambiar snapshots ni hashes canónicos. Ningún archivo del índice o producción requiere reversión porque no se modifican.
