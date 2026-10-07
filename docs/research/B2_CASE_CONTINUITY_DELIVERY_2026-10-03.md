# B2 · del expediente desechable al caso retomable

## Antes, ahora y pendiente

Antes, la calculadora perdía los inputs al recargar. El contexto de México–Fort Smith no se podía iniciar desde el formulario y el usuario tenía que reconstruir la captura. Ahora, en la **misma pantalla `/scenarios/benchmark`**, puede:

1. Iniciar el caso confirmado México–Fort Smith vía Nuevo Laredo/Laredo, Puente III, relevo propio y misma caja seca 53′. Se cargan sólo datos descriptivos: no fecha exacta, activo real, FX, financiación o importes.
2. Ver origen, destino y cruce sin abrir los detalles del expediente.
3. Guardar los inputs en un JSON versionado en su equipo.
4. Recargar, elegir el archivo, confirmar el reemplazo y recalcular con el servidor y los permisos actuales.

**Desarrollado y probado localmente; no desplegado ni validado con una cotización real.** La prueba demuestra continuidad y reproducción de cálculos sintéticos, no una base calibrada ni el costo real íntegro del caso. Guardar un archivo local **no equivale a persistencia SaaS**, publicación de una base o aprobación de fuentes. E1/B2 siguen abiertos; E3 de guardado SaaS/sesión real no se marca PASS.

## Reutilización y UX

Comparación previa y criterios: [wireframes A/B y plan acotado](../design/B2_CASE_CONTINUITY_2026-10-03.md). Se reutilizaron la calculadora, captura guiada, validación del servidor, BFF, controles MARKSMAN y patrón existente de descarga JSON. Se rechazaron almacenamiento automático en localStorage y uso forzado de cotizaciones, cuyo contrato exige una base publicada y un snapshot reproducible.

Las skills `ux-copy` y `testing-strategy` orientaron etiquetas y confirmación de reemplazo, y pruebas del recorrido completo con recarga/errores. El resumen de ruta y acciones nuevas de al menos 44 px mejoran lectura y uso móvil. Sin framework, dependencia, endpoint, fórmula o infraestructura nuevos. No se alteró el manual ni el logo: la captura QA usa el asset oficial sobre fondo claro y el producto mantiene sus tokens y shell existentes.

## Contrato y límites de seguridad

- JSON `FCM_BENCHMARK_DOSSIER`, versión 1, fecha de guardado, huella del esquema y checksum del contenido. Máximo 300000 bytes; inputs máximo 256000 bytes, conforme al límite del endpoint.
- Sólo captura: no resultados, precios de venta, credenciales o identidad de sesión/organización. Campos exactos del formulario actual, literales, opciones, tipos y tamaños; blancos distintos de cero.
- Una huella prueba consistencia, no autoría, consentimiento infalsificable ni calidad económica. Un autor puede generar un archivo coherente con otros valores: el servidor debe validar y recalcular, y las fuentes continúan sin aprobación.
- Antes de guardar o abrir se consulta el formulario con la sesión actual. 403/401 no conceden permisos por haber abierto un archivo. La reapertura no calcula automáticamente; cancelar no sustituye la captura. No hay lectura automática de archivos ni almacenamiento compartido del navegador.
- El archivo es portable y no representa un registro tenant-owned. Un usuario que lo elija puede aportar esos inputs en otra organización donde tenga permisos; el cálculo es stateless y no recupera datos guardados de otra cuenta.
- Reemplazar o editar invalida los totales anteriores. Vencimiento, salida de página y respuestas tardías no reponen la captura invalidada. Un archivo corrupto no reemplaza el expediente actual. Si cambia el esquema durante la apertura, no se renderizan campos incompatibles.
- Los datos confirmados del perfil están separados de los fixtures sintéticos; ninguna tarifa, default del catálogo o cifra de QA se precarga en el caso del negocio.

## Verificación final

| Capa | Evidencia | Límite |
| --- | --- | --- |
| Frontend | **40/40 pruebas PASS** en cinco archivos; control de tipos completo salida 0 | Fetch/Auth simulados |
| API | **25/25 pruebas PASS**, incluyendo dos nuevas del archivo y 23 del expediente previo; control de tipos de `src` salida 0 | Auth simulado; acceso Prisma prohibido por la prueba |
| Navegador | **12 checks PASS**, dos recálculos con el motor Node real, sin errores JS | Intercepción Playwright del transporte; inputs sintéticos, no sesión Supabase |
| Build | Next.js 16.3.3, **salida 0**, compilación y tipos completos | Build local, no despliegue |
| Integridad previa | Snapshot B2 intacto: cuatro contextos/83 pins, SHA `99594a2ee1e31c67351a77d1124e75ec53d8d5ccbee593c7a5fce2baa264059f` | No convierte los remanentes en costos completos |
| Lint | Helpers nuevos salida 0; componentes: salida 1 por un error y una advertencia preexistentes | No se declara lint global aprobado |

Los checks del navegador cubren: inicio descriptivo del caso sin fecha/importes; guardado sin totales; reapertura; recarga y recálculo; cancelación; archivo alterado; permisos vigentes; vencimiento; 390 y 768 px sin desbordamiento; acciones nuevas de 44 px. Se inspeccionaron las capturas finales, incluida la legibilidad del logo. No se certifica accesibilidad integral ni aceptación humana.

La integración API usa el handler real y reproduce ambas salidas tras guardar/reabrir. El fixture nuevo describe **una flota ficticia sin recapeadas**, con cero explícito y derivación QA; no modifica el fixture histórico, no rebaja el control de posición/ciclo de vida ni adopta ese cero en una base. Los cuatro fallos históricos de rutas quedan fuera de este corte, no se ocultan en los conteos.

Se utilizaron dos rondas de reparación diagnosticadas: sincronización de WebCrypto/fixture y tipos de hooks en las pruebas; después, conversión explícita a texto en el resumen de ruta. Se repitieron pruebas frontend, tipos, build y navegador después de la última modificación de implementación. No se cuenta un intento fallido como aprobado. La primera ejecución de build no dejó resultado final recuperable: sólo la repetición con salida 0 figura como PASS.

El lint de `benchmark-form.tsx` identifica `setFailed(false)` dentro de un effect; el mismo error se reprodujo pasando **el contenido de HEAD** por stdin, antes de este corte. La advertencia de cleanup de `generation.current` de `benchmark-calculator.tsx` también existe en HEAD. No se corrigieron para no ampliar el corte después de sus dos reparaciones; siguen pendientes antes de una declaración de release integral.

Artefactos locales de prueba:

- [Verificación JSON](../../tmp/b2-continuity/verification.json)
- [Caso confirmado · desktop](../../tmp/b2-continuity/01-confirmed-case-desktop.png)
- [Recálculo sintético · móvil](../../tmp/b2-continuity/02-mobile-recalculated.png)

Las capturas y JSON están en `tmp/`, ignorado por Git. El servidor QA propio de 4331 se detuvo tras comprobar su PID y comando; no se detuvieron servicios ajenos. Para reproducir, ejecutar Vite con `docs/prototypes/b2-evidence-reuse/continuity.vite.config.mjs` en 127.0.0.1:4331 y `tsx docs/prototypes/b2-evidence-reuse/verify-continuity.ts`. El HTML es un harness para el runner, no una app autenticada autónoma ni una nueva pantalla del producto.

## Archivos y rollback

Checkout `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. El intento inicial en la fachada C: no encontró `.git`; se usó explícitamente el checkout D: y se comprobó su worktree. Se preservaron los cambios ajenos. No se creó commit, rama, PR, preview o despliegue.

Cambios de producto: `apps/web/app/(app)/scenarios/benchmark/benchmark-calculator.tsx`, `benchmark-form.tsx`; nuevos `apps/web/lib/benchmark-dossier.ts` y `benchmark-case-capture.ts`. Pruebas: extensión de `apps/web/tests/benchmark-calculator.test.tsx`, nuevos `benchmark-dossier.test.tsx` y `apps/api/tests/benchmark-dossier-flow.test.ts`. QA aislado: cinco archivos `continuity*` y `verify-continuity.ts` en el prototipo existente. Documentación: wireframe/plan, este entregable y entrada de estado.

Rollback selectivo: retirar las acciones de caso/archivo, estado asociado y resumen de ruta, restaurando sólo los hunks de este corte en los tres archivos tracked; apartar los nuevos helpers, pruebas, QA y documentos de este corte. Conservar el expediente B2, las proyecciones laborales y todos los demás cambios. Nunca reset/clean de todo el worktree. No hay cambios de DB/Auth/usuarios, Neon, producción o infraestructura que revertir. Los archivos descargados son datos locales del usuario; no se eliminan automáticamente.

## Modelo, autoridad y siguiente resultado

OpenAI/Codex `gpt-6.1-sol` / alto solicitado, elección explícita conservada del trabajo; modelo/esfuerzo nativos efectivos no observables. Claude se consideró junto con Codex: alcance UI/validación acotado, incertidumbre baja, contexto disponible y verificabilidad alta favorecieron continuidad sin transferencia. Sin Claude/Fable/subagentes o inferencia API auxiliar, ni selección automática. Los lineamientos nuevos recibidos al cierre sustituyen los anteriores; no autorizan implementar/activar por sí solos un validador de política ni alterar la elección de este trabajo.

Presupuesto: 60 minutos desde implementación y dos reparaciones diagnosticadas, ambas usadas; trabajo local dentro de ese límite. Tokens, cuota atribuible y cargos reales desconocidos, no cero. No se habilitaron créditos, uso extra, nuevos accesos, OAuth ni llamadas facturables de mapas/IA.

**Próximo resultado prioritario:** integrar la evidencia económica de septiembre al caso confirmado hasta obtener una estimación explicable con rangos/supuestos sustentados; no otra pantalla ni otra ronda de FX. Después, usar el contrato de base/snapshot para guardado SaaS y comprobar sesión real, permisos y reapertura. Las brechas de prestaciones completas, prima de riesgo/aplicabilidad, pernocta y demás familias económicas no se rellenan con defaults ni se dan por calibradas. No se solicita otra decisión para este corte terminado de continuidad local; publicar, adoptar supuestos materialmente distintos o cambiar persistencia requiere su alcance específico.
