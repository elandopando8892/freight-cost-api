# Corte 3 — expediente B2 real, lectura sin adopción

Fecha local: 3 octubre 2026. **Correcciones de contraste y huellas autorizadas y verificadas localmente. Integración desarrollada; aceptación autenticada real pendiente.** No desplegado ni utilizado en operación. Ver decisión [ADR 011](../architecture/ADR-011-b2-read-only-evidence-projection.md) y extensión del [wireframe A](../design/B2_EVIDENCE_REUSE_WIREFRAMES_2026-10-03.md).

## Antes → ahora → pendiente

Antes: el ganador del corte 2 era una demostración con cuatro filas sintéticas; el expediente confirmado sólo se podía conciliar por CLI.

Ahora: el compositor existente produce un snapshot derivado de 83 documentos públicos pinneados y cuatro contextos (dos ciclos × contado/financiado). El nuevo GET autenticado de lectura sirve dos conceptos reales combinados, MX_TRAVEL_EXPENSES y US_DRIVER_TOTAL. La pantalla integrada está en `/scenarios/benchmark/evidence`, enlazada desde el benchmark. Reutiliza componentes actuales; no Refine ni nuevas dependencias del producto.

Los comparadores conservan límites: pensión MX 260 MXN/24h no es precio de septiembre ni habitación; hotel MX sin precio público; IRS M&IE sólo contexto de comida, no evidencia de hotel US. Los conceptos no se hacen pasar por claves canónicas. Ningún importe se adopta, ninguna nota se persiste y CFU/CVU/costo productivo/compra/venta de septiembre siguen null.

Pendiente: login/recorrido autenticado real, evidencia económica aplicable a septiembre y mapeo/adopción canónicos. El contraste observado en QA ya está resuelto; no equivale a aceptación humana ni auditoría completa de accesibilidad del producto. B2 continúa con seis remanentes fijos, siete variables y cinco cuestiones de aplicabilidad por contexto. Mostrar los 210 parámetros conciliados no significa calibrarlos todos. No se construyó otro registro de DB porque ScenarioReview exige quoteId y modificaciones de parámetros; el gap de notas es explícito, no una escritura ficticia.

## Contrato y límites

- GET `/engine/benchmark-owned-d2d/b2-evidence`, transporte por el BFF `/api/v1/*` existente.
- Autenticación Supabase, identidad/organización y roles ADMIN/OPERATOR existentes; VIEWER sigue rechazado. Sin cambio de middleware ni configuración Auth.
- Query estricta de perfil, período, ciclo, capital y huella esperada. No recibe importe, orgId, ruta de archivo ni resolución. Huella obsoleta devuelve 409.
- Sólo lectura y no-store; no POST/PUT/PATCH/DELETE de investigación. La respuesta incluye sólo el contexto solicitado y scope de identidad verificada; el contenido de investigación es común, no valores de clientes.
- El cliente rechaza contexto inconsistente, outputs numéricos, adopción y URL no HTTPS. Invalida respuestas tardías y limpia datos al vencer sesión, abandonar página o detectar otra cuenta en una consulta posterior. Esto no demuestra una renovación real de Supabase.
- No se amplió la allowlist temporal de local-read ni se renovó su rol vencido. No Neon, usuarios, migraciones, permisos, producción, negocios, Google o IA auxiliar.

## Evidencia ejecutada

| Comprobación local | Resultado | Alcance real |
| --- | --- | --- |
| Nuevas pruebas API | 23/23 PASS | Fastify inject; Auth sintético; DB atrapada si se accede; LF/CRLF y byte-exact evidence |
| Perfil B2 existente | 12/12 PASS | Compositor/perfil público reales; no aceptación económica |
| Nuevas pruebas frontend | 12/12 PASS | Datos del servicio real, transporte simulado |
| Navegador 1440/768/390 y zoom CSS 200% | 15/15 PASS | Componente real; snapshot público real; Auth y fetch simulados; contraste de tarjetas medido |
| TypeScript API y web | PASS, exit 0 ambos | Tipos locales estrictos |
| Build API y Next web | PASS, exit 0 ambos | Nueva ruta incluida; no despliegue |
| Proyección reproducible `--check` | PASS | 4 contextos / 83 pins / outputs pendientes |
| Suite previa benchmark-route | 9/13 PASS, 4 FAIL | Fixture preexistente de recapeadas incompleto; no se alteró |
| Inspección visual por Codex | Hallazgo corregido | Tarjetas legibles en desktop/mobile; no aceptación humana ni certificación WCAG integral |

Los cuatro fallos previos se reprodujeron invocando directamente `calculateOwnedD2DScenarios(ownedD2DFixture())`, sin el nuevo GET: `RETREAD_POSITION_OR_LIFECYCLE_REQUIRED` para Qty Recapeadas de ambos países y escenarios QA. El motor devuelve INCOMPLETE y scenarios null donde el fixture esperaba SCENARIO_ONLY. No se rebajó el control ni se cambió un importe para forzar verde.

Capturas y log: `tmp/b2-evidence-cut3/desktop.png`, `390.png`, `768.png`, `zoom-200.png`, `browser-results.json`. El log registra cero llamadas externas, cero escrituras HTTP y cero errores de runtime. La inspección visual inicial halló un conflicto del color global del harness con los botones seleccionados. Después de la autorización humana puntual, el CSS Module fija Cloud Grey sobre Charcoal para las tarjetas y retira la opacidad del texto secundario. Así no depende del orden del CSS global del harness. Sin nuevos colores, nuevo layout ni otro wireframe.

La nueva comprobación de navegador compone los fondos transparentes con sus ancestros y mide títulos y textos secundarios de ambas tarjetas: **14.50:1 sin selección y 12.83:1 seleccionada**, frente a mínimo 4.5:1. Enter selecciona la tarjeta, foco visible, viewport390/768 sin overflow y zoom CSS200% sin overflow. No se ejecutó NVDA/VoiceOver ni auditoría automatizada de toda la aplicación; no se certifica conformidad WCAG completa.

## Release, deriva y portabilidad

Desde la raíz física en D:

```powershell
node --import tsx apps/api/scripts/project-b2-evidence.ts --check
```

La comprobación vuelve a ejecutar el compositor, verifica los hashes binarios originales de las fuentes, las huellas de productores y la igualdad de la proyección empaquetada. Falla ante deriva; no regenera silenciosamente ni escribe archivos. El test nuevo también la ejecuta en la suite existente. Exit 0 significa snapshot consistente, **no B2 completo**. No ejecutar vercel-build ni migraciones para verificar esto.

Huella actual: `99594a2ee1e31c67351a77d1124e75ec53d8d5ccbee593c7a5fce2baa264059f`. La huella anterior `a6f28574355208c3cb31dcea79c232267390878036999f9b3bcbb20afc9d8b97` pertenece a la versión previa a esta política; un lector abierto con esa huella requiere recarga (409).

**Corrección de portabilidad autorizada:** `producerHashPolicy=UTF8_CRLF_TO_LF_NO_OTHER_NORMALIZATION`. Sólo el código de los tres productores se lee UTF8 y normaliza CRLF a LF para la huella. Se conservan BOM, espacios, comentarios y todo otro cambio; una modificación distinta de finales de línea invalida la huella. Prueba con el contenido real de los tres productores convertido en memoria a LF y CRLF: ambas variantes coinciden con sus pins; contenido agregado no coincide.

Las 83 fuentes conservan hashing binario exacto y sus pins originales; una conversión LF→CRLF del perfil público es rechazada. No se cambia el motor, archivos originales, configuración Git, ni se reescribe evidencia. Se regeneró únicamente la proyección derivada: los cuatro casos económicos y los 83 sourcePins son idénticos a la versión anterior. **No se ejecutó un runner Linux o CI remoto:** ésta es prueba local del contrato LF/CRLF, no prueba de empaquetado/despliegue Linux. Un checkout que transforme los bytes de las fuentes debe seguir rechazándose; preservar esos bytes es requisito de release.

## Cambios de este corte / rollback

Nuevos: API b2-evidence-contract.ts, b2-evidence.ts, b2-evidence.snapshot.json; generador scripts/project-b2-evidence.ts; tests/b2-evidence.test.ts; web lib/b2-evidence.ts, evidence/page.tsx, b2-evidence.tsx, evidence.module.css, tests/b2-evidence.test.tsx; harness aislado evidence.html, evidence-entry.tsx, evidence-fixture.css y evidence-browser-check.mjs; ADR y entrega.

Inserciones identificadas: import y GET en benchmark.routes.ts; enlace en benchmark/page.tsx conservando el enlace previo route-review; extensión del wireframe y registro de estado. No se editó la suite previa de rutas.

Rollback: retirar exclusivamente estos nuevos archivos y las inserciones listadas, después de revisar si hubo cambios posteriores. No reset/checkouts destructivos: todo lo que ya estaba sucio pertenece al usuario. No SQL. El servidor QA propio usa puerto 4320/PID 9608, sesión local 82547; validar identidad antes de detenerlo. Los cortes 1/2 se conservan.

Huella motor intacta: `3640a05d4cc10820f84de5f295f8d7e0413ad48a87a3921be8981336b6ef5d8b`. CLI original intacto: `d24b0727d67465ac6ee73f2b3c6f11b43463431b73ddc7e82aa039561ccfe1b9`. Root lock y manifest web también intactos. Rama codex/cost-tires-release-s14; HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd; único escritor en D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927. Sin commit nuevo, branch/worktree/PR/publicación.

## Modelo, esfuerzo y presupuesto

Selección continuada: OpenAI/Codex gpt-6.1-sol, high para arquitectura estrecha, implementación y verificación; modelo/effort nativo exactos no observables. Sin cambio de modelo, Astra, Claude, Fable ni subagentes. Claude era una alternativa para la decisión UI/arquitectura, pero no se necesitó otra invocación para reutilizar el ganador ya medido.

Presupuesto inicial 60 minutos y dos reparaciones: (1) nombres reales de campos de perfil/requiredInputs; (2) conservar rationale de incompatibilidades en el contrato estricto. Se pausó y solicitó decisión puntual. El usuario respondió **“autorizo”** a corregir contraste y verificar huellas Windows/Linux. Corrección adicional acotada a esos dos hallazgos, una ronda y verificación local, objetivo20min, sin cambio de modelo ni consumo auxiliar. No autoriza cerrar otras brechas ni desplegar. Tiempo inicial 2026-10-04T00:37:06Z (3oct18:37 local); corrección autorizada comprobada desde01:25Z. Tokens/importe real/consumo exacto de esta actividad desconocidos. get_usage_limits local observó plan Pro, 44% usado/56% restante de la ventana semanal, reposición 2026-10-09T21:14:10Z; no prueba modelo específico ni que el interruptor de uso extra esté OFF. Se reutiliza esa observación, no se activa gasto ni se usan créditos/API auxiliares.

Siguiente trabajo de negocio después de resolver esta aceptación local: revaluar septiembre y completar las bases económicas por familias, priorizando remuneración/prestaciones y pernocta aplicable; no nuevas pantallas/frameworks ni detalle de cada tarifa carretera.
