# Corte2 — comparación ejecutada, no otra plataforma

3 octubre 2026. **Comparación local cerrada; conservar los componentes actuales para este flujo. B2 económico sigue abierto.**

Antes había una [matriz de reutilización](ECOSYSTEM_REUSE_BASELINE_2026-10-03.md) y [wireframes A/B](../design/B2_EVIDENCE_REUSE_WIREFRAMES_2026-10-03.md), sin prueba de Refine. Ahora hay dos implementaciones funcionales del wireframe A, con idéntica UI y cuatro evidencias sintéticas de hotel/pensión MX/US. La claridad de diseño no se atribuye a una librería: ambas usan el mismo presenter, Button/Input y RHF existentes.

## Resultado medido

| Medida del mismo flujo | Base actual | Refine Core5.0.12 |
|---|---:|---:|
| Líneas propias específicas, sin líneas vacías, hook/provider + entry | 19 | 44 |
| JavaScript del build individual, bytes sin comprimir | 315320 | 452901 |
| JavaScript gzip, bytes | 100359 | 145766 |
| Comprobaciones funcionales específicas de navegador | 12 PASS | 12 PASS |
| Dependencia nueva necesaria en el producto por esta elección | Ninguna | No adoptada |

Refine añade25líneas y45407bytes gzip en esta prueba. La UI138líneas, contrato/fixture64 y CSS83 son compartidos; no se cargan como ahorro de ninguna variante. Cada variante se compiló por separado, no se sumaron chunks del build conjunto. CSS/logo/HTML se excluyen del peso JS y son iguales. No son cifras del bundle productivo de Next ni ahorro monetario/horas de desarrollo.

El lock aislado resuelve38paquetes:8de la familia baseline/peers y30adicionales fuera de ese conjunto;10nombres no estaban en el lock principal. Esto no significa30paquetes nuevos en producción: muchos ya están presentes y no se adoptó Refine. Lista exacta en el JSON de entrega y `tmp/reuse-spike-evidence/metrics.json`. Los manifiestos y lock principales conservan sus hashes.

**Decisión:** mantener React/TanStack Query/RHF/componentes FCM. No justificar otro provider por esta revisión de lectura; no hay ahorro demostrado. Refine sigue siendo un candidato para CRUD repetitivo más amplio si otra comparación demuestra ventaja. Esta prueba no evalúa toda su plataforma ni sus funciones Enterprise.

Se revisaron fuentes primarias: [integración de Refine con proyectos existentes](https://refine.dev/core/docs/guides-concepts/usage-with-existing-projects/), [contrato useList v5](https://refine.dev/core/docs/data/hooks/use-list/), [data provider](https://refine.dev/core/docs/data/data-provider/), [telemetría desactivable](https://refine.dev/core/docs/core/refine-component/#disabletelemetry) y [licencia Core MIT](https://github.com/refinedev/refine/blob/main/LICENSE). El registro npm observado confirmó React18/19 y Query5 compatibles; versiones instaladas React19.2.4/Query5.100.14/Refine5.0.12. No se instaló una función de pago.

## Qué funciona y qué no demuestra

Búsqueda por nombre/concepto, filtro de país/estado, selección e inspector de fuente/período/unidad/impuestos, período incompatible, fuente incompleta, vínculo canónico ausente, obsolescencia simulada, error/reintento y sesión vencida simulada. Todos los importes y vínculos canónicos siguen null; CVU y total se muestran pendientes, no cero.

Nota sintética validada con RHF, reemplazo sin duplicar, recarga en la misma pestaña, separación por contexto y borrador preservado al renovar el token simulado. La persistencia es sessionStorage, **no DB/API ni aceptación de benchmark**. No se infieren noches, mix50/50, habitación desde estacionamiento, doble comidaUS o seguro por embarque.

VIEWER se rechaza en la demo y el lector sintético; ADMIN/OPERATOR pueden revisar. No hay Auth real conectado. No demuestra login OAuth, renovación Supabase, aislamiento entre organizaciones ni permisos de producción. La API y el tratamiento económico permanecen intactos.

## Evidencia y correcciones

- **11pruebas Vitest PASS**, incluyendo lectura denegada, filtros, nulls, huella de contexto y escrituras Refine rechazadas.
- **25comprobaciones browser PASS**:12por variante más ausencia de solicitudes externas/escrituras HTTP de negocio/errores no capturados. Última ejecución22:25:10UTC, después de la reubicación.
- TSC del prototipo y **typecheck del frontend principal PASS** después de aislarlo; builds independientes actual/refine PASS. No se ejecutó un build completo Next ni se desplegó.
-22pins originales verificados de nuevo,0diferencias; engine.outputs y prepare-b2-closeout conservados. Rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, worktree físicoD y cambios ajenos preservados.
- Capturas1440×1000 y390×844 sin overflow horizontal, inspector seleccionable por teclado y retorno de foco móvil; seis capturas inspeccionadas. Manual oficial leído/renderizado en páginas12/13 para paleta/tipografías, logo real sin deformarlo. Fallbacks Arial/Courier declarados; no aceptación humana ni fuentes oficiales web licenciadas incluidas.

Tres correcciones de diagnóstico: (1) filtros de Refine en CrudFilters, no en el campo `meta.filters` que colisiona con los parámetros de query; (2) la prueba espera el retorno de foco por condición real, no antes del siguiente frame; (3) prototipo fuera del glob TypeScript de Next, para no requerir dependencias experimentales en su build. El primer typecheck principal detectó StaticImageData/string en la fixture; después de moverla pasó sin editar tsconfig principal. Hubo además un comando Vitest desde cwd incorrecto (sin pruebas, no PASS) y una dependencia local padre introducida por la instalación inicial: corregidos sólo en la fixture. Los fallos y readbacks quedan en el JSON, no se contabilizan como pruebas exitosas.

El directorio final es [docs/prototypes/b2-evidence-reuse](../prototypes/b2-evidence-reuse/README.md), no `apps/web/tests`. El servidor propio anterior se detuvo y se reinició desde esa ruta. [Demo actual](http://127.0.0.1:4320/actual.html) / [Refine](http://127.0.0.1:4320/refine.html). Abrir un panel fue encolado por Codex; no implica que el usuario lo haya visto.

Artefactos: [JSON de entrega](B2_EVIDENCE_REUSE_COMPARISON_2026-10-03.json), [resultado browser](../../tmp/reuse-spike-evidence/browser-results.json), [métricas](../../tmp/reuse-spike-evidence/metrics.json), [desktop actual](../../tmp/reuse-spike-evidence/actual-desktop.png), [mobile detalle](../../tmp/reuse-spike-evidence/actual-mobile-detail.png). Las capturas y outputs generados permanecen en tmp; fuentes y lock reproducibles en docs/prototypes.

## Modelo, consumo y límite de alcance

Benchmark, implementación y verificación: responsable/escritor único Codex/OpenAI, **gpt-6.1-sol/high solicitado y registrado**, modelo/esfuerzo nativos exactos no observables. Claude fue considerado en la comparación anterior por capacidad equivalente; no se invocó aquí. Fable/Astra/subagentes tampoco. No cambio de modelo automático ni disponibilidad Claude inferida de un catálogo.

Ventana de reloj observada21:58:46→22:26:03UTC; no es duración completa de la conversación ni medición separada por actividad. Consumo de tokens, cuota y cargos no observables; no se declaran cero. Cero inferencias auxiliares y servicios pagados nuevos activados. Instalación pública limitada al paquete de demo, ignore-scripts/no-audit; no se afirma auditoría de vulnerabilidades. El techo120min del corte1 no se presenta como autorización nueva de gasto o de otro proveedor. No hubo migraciones, Auth, usuarios, Neon, producción, operaciones de negocio ni adopción de parámetros.

La skill engineering:testing-strategy guió errores, recarga, duplicación, separación de contexto y checks de recorrido; pdf:pdf permitió contrastar el manual, sin editarlo. No se aplicó product-design como nueva exploración visual: el objetivo fue comparar implementación del wireframe existente, no cambiar el diseño elegido.

## Siguiente corte: expediente real, no otra demo

Conservar una sola implementación. Proyectar el cierre existenteB2 a lectura y conectar el inspector al perfil/período/ciclo/compra, con fuente y faltantes verdaderos. Reutilizar BFF/permisos/calibración existentes si sirven; registrar el gap de persistencia si no existe contrato, sin inventar un registry. Validar lectura autorizada, denegación, huella y consistencia con CLI; mantener outputsnull mientras falten importes sustentados. Después cerrar evidencia económica de los remanentes del mismo inventario. No ampliar a otra plataforma, tarifa por tarifa, ni nuevo motor.

Recomendación para ese corte: Codex/OpenAI6.1Sol/high, escritor único, tope propuesto60min y dos correcciones diagnosticadas, cero inferencia auxiliar/servicio pagado. Elección y alcance del siguiente trabajo se registran al iniciarlo; esta entrega no cambia el modelo nativo ni concede permisos de publicación o DB.

## Rollback selectivo

Detener únicamente el proceso propio comprobado en127.0.0.1:4320. Conservar/archivar el directorio nuevo del prototipo y estos dos archivos de corte2; retirar sólo el párrafo nuevo de SPRINT_STATUS. Verificar que no haya ediciones posteriores antes de retirar nada. Conservar capturas/JSON si se desea reproducibilidad. No se ejecutó rollback ni borrado: no hay cambios de API/DB/Auth/engine que revertir, ni se restauran archivos ajenos.
