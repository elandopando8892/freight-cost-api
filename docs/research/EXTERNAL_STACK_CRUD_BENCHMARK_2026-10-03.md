# Benchmark tecnológico externo: bases, supuestos y versiones

3 octubre 2026, México. Corte de análisis y documentación local. **Recomendación: conservar el stack del producto para cerrar el MVP; no adoptar otro framework administrativo ahora.** No significa que Refine o ra-core sean inferiores: el ahorro de CRUD todavía no está medido y parte del flujo FCM no es CRUD.

## Objetivo, alcance y contexto

Resolver un recorrido comprensible: elegir base y versión, revisar supuestos y evidencia, guardar un borrador, revisar impacto y ejecutar transiciones permitidas. Evaluar soluciones externas que reduzcan código estándar sin duplicar autenticación, datos maestros ni fórmulas. Los [wireframes y estados](../design/COST_BASES_EXTERNAL_STACK_WIREFRAMES_2026-10-03.md) acompañan esta comparación; no representan una UI implementada.

Se inspeccionaron contratos, servicios y pantallas del checkout físico `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. Había 187 entradas en el estado de Git al iniciar: se conservaron. La revisión de seis aplicaciones del [baseline del ecosistema](ECOSYSTEM_REUSE_BASELINE_2026-10-03.md) se reutiliza como fotografía documentada; no se verificaron otra vez todos sus despliegues o contratos.

La [comparación anterior](B2_EVIDENCE_REUSE_COMPARISON_2026-10-03.md) midió sólo un inspector de lectura sintético: 19 líneas específicas con el stack actual frente a 44 con Refine, y 45407 bytes gzip adicionales. **No demuestra el costo ni el ahorro de formularios, persistencia o administración de versiones.** Sus pruebas no se repitieron en este corte.

## Tres enfoques viables

| Enfoque | Capacidad concreta reutilizable | Ajuste e integración | Costo total y mantenimiento | Decisión propuesta |
| --- | --- | --- | --- | --- |
| A. Next/React + TanStack Query + RHF + componentes Base UI/shadcn existentes | Consultas, mutaciones, validación y controles; tablero y editor ya existen | Mantiene App Router, BFF, sesión y marca actuales; las acciones de dominio siguen explícitas | Menor cambio incremental; conservar componentes propios sigue teniendo costo. No hay ahorro nuevo de CRUD medido | Usar para cerrar el recorrido MVP |
| B. Refine Core, headless | Recursos, proveedores de datos, hooks y formularios conectados | Adaptador al BFF y comandos custom; reutilización visual posible sin reemplazar el backend | Nuevos contextos y adaptadores, más una capa que mantener. Ventaja potencial en muchas pantallas repetitivas, no acreditada en FCM | Candidato condicionado, no instalado en el producto |
| C. Shadcn Admin Kit sobre ra-core | List/create/edit/show, tablas, referencias y formularios administrativos | Cercano a Base UI, Tailwind, Query y RHF actuales; requiere contextos ra-core y React Router | Mayor base administrativa preconstruida; integrar navegación, sesión y comandos específicos cuesta. No es copiar una tabla independiente | Primer candidato externo si aparece una necesidad amplia de administración estándar |

El [repositorio oficial de Shadcn Admin Kit](https://github.com/marmelab/shadcn-admin-kit) documenta las capacidades y tecnologías de C. Su [DataTable](https://github.com/marmelab/shadcn-admin-kit/blob/main/src/components/admin/data-table.tsx) utiliza hooks y contextos de ra-core. La semejanza visual no elimina esas dependencias. La [integración oficial React-admin/Next](https://marmelab.com/react-admin/NextJs.html) describe una aplicación cliente sin SSR; no prueba por sí sola compatibilidad con nuestra versión concreta ni justifica sustituir el router global.

### Versiones, licencias y costos

- Manifiesto web inspeccionado: Next 16.3.3 y React 19.2.4; rangos Query `^5.100.14`, RHF `^7.76.1`, Base UI `^1.5.0`, Tailwind `^4.3.3`, Zod `^3.23.8`. Un rango no acredita la versión instalada de cada paquete. API actual Fastify 5.12.3/Prisma 5: conservarla.
- Refine Core **5.0.12**, MIT, verificado en el paquete del prototipo aislado ya existente. No se instaló otra versión. [Licencia Core](https://github.com/refinedev/refine/blob/main/LICENSE). Los ejemplos de [multitenancy](https://refine.dev/core/docs/guides-concepts/multitenancy/) incluyen herramientas Enterprise: no contarlas como capacidad gratuita adoptada.
- ra-core **5.15.4** en el [manifiesto de la rama oficial consultada](https://github.com/marmelab/react-admin/blob/master/packages/ra-core/package.json): React 18/19, Query 5, RHF 7 y React Router como peers. No está instalado ni fue probado en FCM. Shadcn Admin Kit: código de `main`, sin versión de paquete adoptada; [licencia MIT](https://github.com/marmelab/shadcn-admin-kit/blob/main/LICENSE). Antes de incorporarlo habría que fijar revisión exacta y conservar sus avisos.
- A/B/C no exigen por sí solos otro servicio alojado. Código abierto no significa que hosting, mapas, Auth o mantenimiento sean gratuitos. No se activó servicio, suscripción, telemetría nueva ni cargo. No hay estimación monetaria ni porcentaje de ahorro sustentado para este CRUD.

No incorporar Frappe/ERPNext o Windmill para esta capacidad: añadirían una plataforma diferente donde ya existe un backend de dominio. Son referencias del baseline, no sustitutos evaluados del motor ni integraciones operativas comprobadas.

## Frontera entre estándar y específico

Estándar: tablas, filtros, formularios, estados de carga/error y validación de captura. Aquí procede reutilizar bibliotecas y patrones externos. **No se declara innovador todo FCM para justificar código propio.**

Específico comprobado: relación base/versión/perfil/segmento, inventario canónico, aplicabilidad, revisión de calibración vigente, impacto, publicación y activación separadas; fórmulas CFU/CVU y trazabilidad de supuestos. Un framework puede presentar estas reglas, no reemplazarlas por un CRUD genérico ni certificar su calibración.

### Contratos reales y adaptación mínima si se elige B o C

| Contrato FCM inspeccionado | Adaptación segura | Lo que no corresponde hacer |
| --- | --- | --- |
| GET `/cost-bases`: array; GET `/:id`: objeto con versiones | Envolver en el contrato de datos del framework; conservar IDs | Inventar paginación de servidor o enviar relaciones anidadas al guardar |
| PATCH `/cost-bases/:id`: nombre, descripción, moneda | Allowlist explícita de metadatos | Inferir todo el formulario desde la respuesta GET; moneda puede estar congelada |
| GET `/assumptions/sets/:id/params`: agrupado por sección | Proyección plana sólo para visualización si hace falta | Crear otro catálogo maestro de parámetros |
| PATCH de parámetros: array `{section, field, value}` | Una solicitud con el lote y su identidad canónica | Un `updateMany` genérico que dispare escrituras independientes por campo |
| Respuesta del lote: `{params, warnings}` | Adoptar filas autoritativas y mostrar advertencias conservadas | Confundir advertencia de rango con rechazo, o mostrar éxito antes del servidor |
| Nueva versión, perfil, revisión, impacto, publicar, activar, archivar | Comandos explícitos con sus payloads y permisos actuales | Convertir publicación en PATCH de estado o archivo en DELETE genérico |

Los [data providers de Refine](https://refine.dev/core/docs/data/data-provider/) permiten operaciones `custom`; [React-admin](https://marmelab.com/react-admin/DataProviderWriting.html) también admite métodos propios. Esto permite adaptar el frontend **sin normalizar el backend a costa de perder reglas**.

La API deriva organización de la sesión verificada. Las mutaciones anteriores requieren ADMIN; no ampliar permisos por ocultar o mostrar botones. Supabase sigue siendo Auth, no un permiso para sustituir Fastify por escrituras directas a tablas. Reutilizar `/api/v1/*`, `fetcher`, manejo de 401 y separación por cuenta/organización/base/versión; evitar toasts duplicados y caché visible de otra cuenta.

Guardar/publicar deben esperar confirmación del servidor. Refine documenta modo [pessimistic por defecto](https://refine.dev/core/docs/guides-concepts/forms/); React-admin `<Edit>` documenta [undoable por defecto](https://marmelab.com/react-admin/Edit.html): configurarlo explícitamente si se usa ese componente. No se atribuye ese default a todos los componentes del Kit. Sin reintentos automáticos de comandos cuyo resultado sea incierto; tampoco se afirma garantía exactamente-una-vez.

El backend ya protege versiones publicadas/archivadas, claves y aplicabilidad, y usa locks transaccionales. Publicar exige 210 parámetros canónicos válidos, perfil explícito y las revisiones/impacto que correspondan. El framework no añade esa garantía. Tarifas de terceros conservan su entidad y metodología: no forzarlas al inventario de flota propia.

## Decisión y siguiente entrega de producto

**Estado: propuesta de decisión, no adopción arquitectónica.** Continuar sobre A. Reutilizar las bibliotecas externas ya presentes; mantener B/C como alternativas documentadas, sin crear otra demo por defecto. No hay evidencia suficiente para que una migración administrativa sea el camino más corto al resultado solicitado.

La arquitectura skill orientó esta separación de responsabilidades y el costo de adaptación. La skill de handoff incorpora las interacciones y estados en el documento enlazado, sin introducir otra marca o diseño genérico.

La inspección también encontró **un inspector B2 ya implementado** en `/scenarios/benchmark/evidence` y una ruta de lectura en API. No proponer construirlos otra vez ni presentar la vieja demo como único trabajo existente. Se revisó su código, no su operación autenticada actual.

Siguiente corte recomendado: comprobar y enlazar el recorrido existente **caso → base/versión → supuestos/evidencia → resultado y faltantes**, reutilizando tablero, editor, calculadora e inspector. Resolver sólo los saltos o estados faltantes comprobados. Mantener separados resultado calculable, referencia no adoptada y base publicable. No usar el benchmark tecnológico para anunciar que B2 económico o los 210 parámetros están calibrados.

Si después se decide adoptar una plataforma administrativa, su puerta de entrada es una comparación acotada de edición realista contra A, incluyendo adaptador, dependencias, permisos, errores y mantenimiento; no sólo número de líneas del formulario. Esa instalación y elección arquitectónica requieren una decisión específica. No son requisitos nuevos para seguir con A.

## Criterios de cierre y evidencia

Este corte: comparación de tres opciones con fuentes primarias, contratos de escritura y reglas de negocio inspeccionados, recomendación y wireframes documentados. No se instaló ni ejecutó CRUD con Refine/ra-core. Compatibilidad de dependencias es parcial, por manifiestos; no una certificación del stack completo.

Para una implementación posterior: guardado de borrador con readback/recarga, advertencias retenidas, 403/409/422 visibles, edición publicada bloqueada, cambio de cuenta/sesión sin filtración, doble envío controlado, impacto antes de publicar y activación separada. Primero verificar que los tests existentes cubran esos riesgos; añadir sólo lo faltante. Auth/persistencia real y aceptación humana se reportan aparte de fixtures.

Modelo por actividad —benchmark, análisis de contratos, wireframes y documentación—: responsable único Codex/OpenAI, `gpt-6.1-sol`, esfuerzo **alto solicitado** conservado; modelo/esfuerzo nativos exactos no observables. Claude considerado sin invocación: continuidad de contexto y evidencia verificable bastan para este corte. Sin subagentes, inferencia auxiliar ni cambio automático. Tope anunciado 60 minutos; sin instalaciones y máximo dos correcciones documentales diagnosticadas. Consumo de tokens, cuota y cargos atribuibles desconocidos; no se equipara ausencia de nuevos servicios con consumo de inferencia cero.

## Integridad y rollback

Únicos archivos añadidos por este corte: este documento y su wireframe. No se modificaron dependencias, API, motor, Auth, datos o infraestructura. Verificación documental ejecutada: nueve SHA-256 antes/después sin diferencias; cinco enlaces locales resueltos y cero líneas con whitespace final en los documentos nuevos. No se ejecutaron pruebas de producto: estos resultados no acreditan CRUD, Auth ni persistencia. Hashes de referencia previos a la edición:

| Archivo | SHA-256 |
| --- | --- |
| `package-lock.json` | `ED99EE3B784F30A6BC166B5CCEC08D0B1FD1326C12E6418EF29DA93E7971DFAF` |
| `apps/web/package.json` | `B81CE088A8AD2441DB330115873C14833A74C2B4E551E1A4E4423F26D2BA2AA3` |
| `apps/api/package.json` | `CD425E3452E7EB4CCE1A8278B5A1ED1ABCEE006C0D70ADE3C02575107F787F8B` |
| `cost-bases.routes.ts` | `895E508401087578E98BF0D0A461A3D290DFA13D6073FB09AE8A2B8DC0EB4344` |
| `cost-bases.service.ts` | `971D55D000341C988915715F900069AF4805A36A3C7C2B6E262C999E2551CCA4` |
| `assumptions.service.ts` | `F27F216849D6A03F298B8A46527201A3DE1F31FCB7A310B377AAD55C853E5BF5` |
| `engine.outputs.ts` | `3640A05D4CC10820F84DE5F295F8D7E0413AD48A87A3921BE8981336B6EF5D8B` |
| `cost-bases-board.tsx` | `639B1F623E20949F69EB5192D48F452B9D56EAA6127B308D99FDAE89D161850F` |
| `assumptions/[setId]/editor.tsx` | `BF23C9FBF82C29727A3209725ABF64490BD226CAF1F1104CA4B0442AA4FC1A66` |

Rollback documental: retirar únicamente estos dos archivos nuevos después de comprobar que no recibieron cambios posteriores. No ejecutar restauración global ni borrar el prototipo previo. No se ejecutó rollback.
