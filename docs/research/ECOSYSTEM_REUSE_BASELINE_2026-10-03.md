# Ecosistema MARKSMAN — corte 1 de reutilización

3 octubre 2026. **Matriz y selección del flujo terminadas; prueba comparativa e integración pendientes.**

## Resultado

Se clasificaron 15 capacidades: 12 para reutilizar, una adopción condicionada a una prueba y dos trabajos específicos pendientes. Estas cantidades describen decisiones, no porcentajes de código ahorrado ni capacidades integradas entre todas las apps. El registro verificable está en [la matriz JSON](ECOSYSTEM_REUSE_BASELINE_2026-10-03.json), con 22 archivos fuente y sus SHA-256.

El primer flujo seleccionado es **revisar la evidencia de pernocta MX/US y su impacto en CVU**. Es un faltante real del perfil B2 confirmado. El usuario puede localizar qué falta, entender qué cubre cada fuente, revisar vigencia y ver por qué el importe sigue pendiente. Una pantalla o biblioteca no completa el benchmark monetario.

## Alcance y continuidad

Escritor único en `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`; rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. Se revalidaron rama, HEAD, raíz física y worktrees antes de editar. El árbol ya estaba sucio; sus cambios quedan preservados. Este corte escribe únicamente documentación y el registro de revisión, sin tocar implementación, dependencias o los expedientes económicos previos.

La revisión usa snapshots locales de seis checkouts y documentos de autoridad del portafolio. No certifica qué commit corre en producción, acceso autenticado actual ni aceptación real de todos los contratos. Los documentos Graphify de fronteras y contratos tienen cortes anteriores y estados propuestos: orientan ownership, pero requieren revalidación del par de módulos al implementar una integración.

| Checkout leído | HEAD observado | Tecnología observada |
| --- | --- | --- |
| FCM | `4f5fc2d` | Next16.3.3, React19.2.4; Fastify5.12.3/Prisma5/Zod3; Query5/RHF7/Base UI/Supabase SSR |
| Rateware release-main | `e030ff8c` | JavaScript ESM y Auth Supabase; contrato Edge consumido por Bidware |
| Bidware | `0b19f091` | React18, Vite6, TypeScript, React Router7 y Supabase |
| Loads / QuickPay | `c4a0742` | Node24, pg8.23, MCP2.1 y contratos JSON versionados |
| Demand Radar | `1587087` | React19, Vite6, Supabase, libsql y MapLibre |
| Graphify Portfolio | `d0e553c` | Node, MCP2.1, Supabase SSR, Neon serverless y Zod4 |

Los rangos de manifests no son una comprobación de las versiones instaladas. No se unifican React18/19, Zod3/4 ni todos los transports como resultado de esta revisión. FCM declara `packages/*` en workspaces, pero no existe una carpeta `packages` en este checkout: no hay un SDK central que podamos afirmar ya distribuido.

## Matriz de decisión

Las referencias de esta tabla son IDs de archivos fijados en el JSON.

| Capacidad | Decisión | Base concreta y motivo | Evidencia |
| --- | --- | --- | --- |
| Sesión e identidad | Reutilizar | Auth Supabase existente; conservar renovación y cambio de cuenta | RATEWARE_AUTH, FCM_WEB, RADAR_SESSION |
| Organización y permisos | Reutilizar | La API propietaria deriva identidad y hace cumplir los roles | FCM_ROLES, FCM_ASSUMPTIONS, FCM_BENCHMARK_HTTP |
| Maestros | Reutilizar | Autoridad por dominio e IDs estables; no duplicar masters | PORTFOLIO_MAP, PORTFOLIO_BOUNDARIES |
| Componentes MARKSMAN | Reutilizar | Buttons, inputs, cards y dialogs existentes; tokens y assets aprobados | FCM_WEB, FCM_BRAND |
| Tablas/formularios repetitivos | Adoptar condicionado | Refine Core v5 sólo si su adapter y dependencia cuestan menos que la implementación actual | FCM_WEB, FCM_FETCH; fuentes oficiales abajo |
| Clientes de API | Reutilizar | BFF FCM y Edge Bidware tienen transports distintos; compartir sólo contratos compatibles | FCM_FETCH, BIDWARE_API |
| Validación y contratos | Reutilizar | Zod y JSON Schema existentes; contrato del productor versionado | FCM_API, FCM_CLOSEOUT, QUICKPAY_CONTRACT |
| Huella de revisión | Reutilizar | Checklist y fingerprint existentes, donde su semántica sea aplicable | FCM_CALIBRATION, FCM_ASSUMPTIONS |
| Idempotencia y recibos | Reutilizar | Comandos/receipts de la API ejecutora; correlación por sí sola no evita duplicados | FCM_HANDOFF, RATEWARE_CORRELATION, QUICKPAY_CONTRACT |
| Ledger de benchmark | Reutilizar | Registro/reconciliador, inventario y source pins actuales | FCM_EVIDENCE, FCM_INVENTORY, FCM_CLOSEOUT |
| Lectura visible de cierre B2 | Desarrollar | Proyección pequeña desde el cierre existente, sin una segunda fórmula | FCM_CLOSEOUT, FCM_BENCHMARK_HTTP, FCM_PROFILE |
| Motor CFU/CVU | Reutilizar | Composición económica FCM actual | FCM_PROJECTION, FCM_CLOSEOUT |
| Importes faltantes | Desarrollar evidencia | Investigación pública y normalización económica; no otro motor ni plataforma | FCM_PROFILE, B2_DELIVERY |
| Contexto Graphify/MCP | Reutilizar | Catálogo federado consultivo con procedencia | PORTFOLIO_MAP, PORTFOLIO_BOUNDARIES |
| Handoffs financieros/operativos | Reutilizar | Contratos de los receptores y límites ERP/Fleet Rocket | QUICKPAY_CONTRACT, PORTFOLIO_BOUNDARIES |

Los consumidores compartidos son objetivos de reutilización. No se afirma que exista una biblioteca común desplegada ni que toda capacidad ya tenga un intercambio operativo certificado.

## Benchmark y decisión tecnológica

Se reutilizó la investigación de esta conversación y se releyeron fuentes oficiales el 3oct2026. La comparación para la prueba local será:

| Enfoque | Ajuste y ahorro potencial | Integración y costo total | Decisión |
| --- | --- | --- | --- |
| Componentes actuales + adapter pequeño | FCM ya dispone de RHF, Query, Base UI y Zod; menor cambio de dependencias | Requiere proyección de lectura B2 y composición del flujo; no tiene costo nuevo de licencia | Baseline de control y alternativa preferida si no se demuestra ventaja externa |
| Refine Core v5 + UI MARKSMAN | Estandariza recursos, consultas, formularios y tablas | Core MIT. Adapter debe usar BFF/API vigente; versionado, cache y peers requieren verificación. No reemplaza permisos server-side | Candidato para comparar, no instalación ni adopción definitiva |
| Plataforma más completa | Windmill reduce orquestación; Frappe/ERPNext aporta procesos administrativos estándar | Nuevos runtimes y mantenimiento; licencias y límites por edición; no resuelve los importes B2 | Referencia funcional, fuera del camino inmediato de cierre |

Referencias primarias y límites concretos:

- [Refine en proyectos existentes](https://refine.dev/core/docs/guides-concepts/usage-with-existing-projects/) y [Core MIT](https://github.com/refinedev/refine/blob/main/LICENSE). La integración es por providers; no implica que nuestro payload sea compatible automáticamente. La [multitenancy preconstruida Enterprise](https://refine.dev/core/docs/enterprise-edition/multitenancy/) no se incluye en el baseline gratuito.
- [shadcn/ui MIT](https://github.com/shadcn-ui/ui): base para componentes propios; FCM ya usa esta dirección. Reutilizar código también conserva nuestra responsabilidad de mantenimiento.
- [Windmill LICENSE](https://github.com/windmill-labs/windmill/blob/main/LICENSE): fuentes AGPL/Apache y partes Enterprise propietarias; los binarios Community incluyen código y términos adicionales. No describir cualquier imagen Docker como distribución íntegramente open source. No se ha acreditado necesidad de otro orquestador.
- [Frappe](https://github.com/frappe/frappe) MIT y [ERPNext](https://github.com/frappe/erpnext) GPL3: referencia de procesos estándar. Python/MariaDB y su integración con nuestros maestros/identidad elevan el trabajo de adopción. No sustituye la autoridad fiscal del ERP actual.
- [pg-boss MIT](https://github.com/timgit/pg-boss): alternativa futura si aparece una necesidad comprobada de cola Node/Postgres. No instalada ni autorizada como migración de almacenamiento en este corte.
- [Supabase self-hosting](https://supabase.com/docs/guides/self-hosting): autohospedar añade seguridad, mantenimiento y respaldos. La recomendación actual reutiliza las capacidades existentes; no promete operación gratuita ni mueve Neon a Supabase.

## Flujo elegido y gap verificado

Perfil: `B2_USER_SCOPE_20261003`, empresa binacional existente; misma caja/relevo propio, ambos ciclos, contado/financiado, referencia28–30Sept2026. Pernocta mixta en ambos países. Conceptos: `MX_TRAVEL_EXPENSES` y la porción pendiente de `US_DRIVER_TOTAL`, clasificados como CVU por el contrato actual. No se crean claves canónicas nuevas para hacer parecer completo el inventario.

`prepare-b2-closeout.ts` devuelve el inventario, pins, casos, brechas y comprobaciones del perfil confirmado. La ruta HTTP `benchmark.routes.ts` llama `calculateOwnedD2DScenarios` y devuelve otro contrato stateless; no expone ese cierre. La UI de resultados sólo muestra desglose y fuentes del remolque en el recorrido consultado. Por tanto, el gap seleccionado es la proyección y lectura clara de ese cierre, no volver a calcularlo en React.

Permisos observados: mutaciones de supuestos y registro de calibración requieren ADMIN. Benchmark HTTP exige ADMIN u OPERATOR, incluso para su formulario; VIEWER no obtiene ese endpoint. El futuro adapter debe conservar esta política hasta que haya una decisión explícita distinta. Revisar una fuente tampoco adopta un importe ni convierte un costo completo `null` en cero.

[Wireframes A/B y contrato de la prueba](../design/B2_EVIDENCE_REUSE_WIREFRAMES_2026-10-03.md) preparan el siguiente corte. Es una especificación esquemática, no una pantalla implementada o aceptada visualmente.

## Cierre del corte y continuación

- Matriz completa: 15 decisiones con base, propietario, motivo y evidencia.
- Faltante elegido: lectura de evidencia de pernocta MX/US e impacto CVU.
- Baseline elegido para comparación: componentes actuales frente a Refine Core, con el mismo flujo/datos.
- No hay medición de ahorro, paquete nuevo, adapter B2 HTTP, nueva persistencia o prueba Refine ejecutada.
- B2 sigue abierto según su entrega vigente: 13 remanentes por ciclo y comprobaciones adicionales de aplicabilidad; esta revisión documental no modifica esa situación.

El corte2 usa un snapshot sintético aislado con el mismo alcance. Debe medir código propio mantenido, dependencias agregadas, complejidad del adapter, validación y claridad de uso. Sólo se selecciona Refine si la medición da ventaja concreta; si no, se conserva el baseline. El corte3 integra la alternativa ganadora con el contrato de backend, permisos y persistencia aplicables. No añadir un registry nuevo si la revisión existente sirve; registrar el gap si no sirve.

## Modelo, presupuesto y verificación

Responsable único: Codex, sesión actual. Elección solicitada/autorizada para estos cortes: OpenAI/Codex `gpt-6.1-sol`, esfuerzo `high`; versión y esfuerzo efectivos del runtime no son observables por las herramientas y se registran desconocidos. Claude fue considerado para arquitectura/UI; la continuidad de contexto reduce transferencia en este corte documental. No se invocó Claude, Fable, otra inferencia API ni subagentes. Las skills architecture/system-design orientaron trade-offs y fronteras; sprint-planning se reutilizó del plan anterior.

Tope del corte1:120min y dos reparaciones diagnosticadas; las búsquedas de rutas se corrigieron dentro de ese presupuesto. Tokens, cargos y cuota atribuible son desconocidos, no cero. No se activó gasto, extra usage o un proveedor nuevo; lectura web de documentación pública y comprobaciones locales únicamente.

Verificación local ejecutada: **PASS**, JSON válido, 15 IDs únicos/decisiones completas, 12REUTILIZAR/1ADOPTARcondicionado/2DESARROLLAR, referencias resueltas y SHA coincidente de22 fuentes; tres vínculos locales válidos, documentos sin whitespace final y ausencia de Refine en dependencias. El pin de `prepare-b2-closeout.ts` conserva `d24b0727d67465ac6ee73f2b3c6f11b43463431b73ddc7e82aa039561ccfe1b9`; `engine.outputs.ts` conserva `3640a05d4cc10820f84de5f295f8d7e0413ad48a87a3921be8981336b6ef5d8b`. La comprobación fue un proceso PowerShell de lectura con exit0, sin servicios/DB. `git diff --check` es la comprobación final sobre documentación afectada. No corresponde ejecutar suites del motor por un cambio documental. No se acredita UI funcional, login, persistencia ni aceptación económica.

Rollback: apartar únicamente estos tres artefactos nuevos y retirar la entrada de este corte en `SPRINT_STATUS.md`, conservando una copia si se desea. No restaurar el árbol completo ni deshacer cambios ajenos.
