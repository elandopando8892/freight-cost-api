# W2 · Wizard en una versión de la aplicación

## Objetivo y revisión previa

Conservar el recorrido aprobado W0/W1 y el slider solicitado por el usuario,
ahora accesible desde la versión concreta de una base, con persistencia de sus
decisiones como metadata. Alcance inicial: las mismas tres referencias fijadas.
No adopción, activación, aplicación de valores al motor ni cobertura de 210 inputs.

Comparación con el stack inspeccionado (2026-10-04):

| Alternativa | Ajuste y coste | Decisión |
| --- | --- | --- |
| `AssumptionSet.calibrationEvidence` o notas de parámetros | La revisión tiene esquema estricto y es reemplazada al calibrar; las notas son texto operativo. Mezclar borrador con aprobación falsearía el gate. | Rechazada |
| Metadata JSON discriminada en `CostBaseAuditEvent.payload` existente | Sin nueva dependencia ni migración; snapshots append-only por org/base/versión. Límite finito y validación estricta; los parámetros continúan siendo la fuente del motor. | Recomendada para W2, acotada |
| Campo/tabla dedicada a drafts del wizard | Semántica directa y crecimiento futuro; requiere migración y verificación en un entorno autorizado. | Reservada para necesidad demostrada, no se aplica ahora |

Acción existente `METADATA_UPDATED`, con nota explícita y discriminator
`FCM_WIZARD_VERSION_DRAFT_V1`: no se etiqueta como calibración ni activación.
El estado del wizard se recupera de su última revisión válida por número, no por
orden de fechas. Sus datos son propuestas versionadas; `AssumptionParam` y la
revisión de calibración actuales no se modifican. Esta adaptación es reversible
sin cambios de esquema; no sustituye el módulo de auditoría ni crea event sourcing
general. Los snapshots públicos empaquetados evitan leer Drive/docs en ejecución.

Patrones UI ya revisados: [slider HTML](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/range)
y [teclado WAI](https://www.w3.org/WAI/ARIA/apg/patterns/slider/); componentes React,
BFF Supabase, Fastify, Prisma, locks y reglas de roles existentes reutilizados.
Ninguna llamada de IA por card, API pública facturable o paquete nuevo.

## Flujo y wireframe

```
Bases → versión → Armar supuestos
← Volver a esta base              Versión / estado / revisión
Aviso: referencia septiembre 2026; propuestas, no inputs aplicados
[Conceptos]  [Card / unidad / fuente]
              ▼ Estándar MARKSMAN
             mín ─────○──── promedio ───────── máx
             Dato propio (opcional) [       ] [Usar MARKSMAN]
             Premisas / aceptación provisional / evidencia
             [Guardar decisión en esta versión]
Resumen: decisiones propuestas / inputs preparados / cero adopciones
```

Se mantiene paleta, tipografía con fallbacks y branding de la aplicación y W1.
Sin rediseño del shell; alineación izquierda; la escala es la interacción central.
Propuesta elegida frente a modal: página retomable identificada por base y versión,
sin mezclar revisiones. Móvil: navegación y card apiladas, sin overflow.

## Contrato, permisos y errores

- Lectura autenticada, org del token; nunca resolver base predeterminada al fallar
  el ID solicitado. Primer perfil compatible: CROSS_BORDER / D2D_BINATIONAL_OWN,
  Dry Van, operación propia MX/US, perfil explícito y policy operacional.
- ADMIN guarda sólo metadata de versiones DRAFT no activas y bases no archivadas.
  OPERATOR/VIEWER y versiones publicadas/archivadas sólo lectura.
- Locks existentes de org/versión; confirmar estado después de adquirirlos.
- Doble protección: revisión del wizard y fingerprint del perfil/parámetros/estado
  actual. Recargar ante cambios fuera del wizard, nunca sobrescribirlos.
- Snapshot, contexto, calidad provisional y receipts se validan con el módulo W1.
  UUID repetido exacto no añade otro evento; otro contenido con el mismo UUID falla.
- Hasta 128 guardados por versión en este corte. No corrupción→reset silencioso.
- Cliente sin localStorage ni secretos; BFF vigente, no cambio OAuth. Estado se
  desmonta al cambiar identidad; 401 oculta las decisiones y pide iniciar sesión.
- No transferir automáticamente decisiones entre perfiles, bases o versiones.
- Mínimos/máximos ausentes siguen ausentes. Mantenimiento sigue sin asignación PM.

## Criterios y presupuesto

Responsable: Codex local, un escritor en D:, rama actual sin nuevos worktrees.
OpenAI GPT-6.1 Sol/high recomendado; modelo/esfuerzo efectivos desconocidos.
Claude considerado para UX/arquitectura, no invocado por continuidad y pruebas
focales suficientes; sin política dinámica activada ni llamadas auxiliares.
90 min locales objetivo, una implementación y hasta dos reparaciones focales;
sin gasto externo autorizado. Comprobar UI, permisos, recuperación, datos
incompletos, conflictos, duplicados y vencimiento con transporte/DB simulados.
Prueba autenticada y persistencia PostgreSQL real no se cuentan como comprobadas
sin entorno confirmado y autorización específica. No despliegue/migración/SQL.

Rollback: retirar enlaces/rutas y nuevos módulos de este corte; conservar fuentes,
W1 y cambios previos. Ningún evento previo se modifica o elimina.

## Entrega local y evidencia · 2026-10-04

Antes: W1 era una demostración autónoma con archivo local; no existía acceso al
recorrido desde la versión del producto. Ahora: `Armar supuestos` abre una página
React en la versión solicitada. GET/PUT autenticados reutilizan el BFF y middleware
vigentes. El adaptador transaccional guarda propuestas en metadata versionada;
no escribe `AssumptionParam`, calibración, usuarios, rutas ni cotizaciones.

Estado: **implementado y probado localmente con DB/proveedores simulados**.
No desplegado, no utilizado con usuarios reales y sin persistencia PostgreSQL
real comprobada. W2 no se declara cerrado operativamente. Esta entrega incluye
tres referencias históricas, no el inventario completo ni benchmark calibrado.

### Pruebas después de las últimas correcciones

| Comprobación | Resultado y alcance |
| --- | --- |
| API, cinco archivos focales | 57/57 PASS: drafts, versiones, rutas, calibración existente y frontera local de sólo lectura. Proveedores y DB simulados; locks invocados, no concurrencia PostgreSQL real. |
| Web, tres archivos focales | 36/36 PASS: componente, página y navegación. Transporte simulado, permisos, manual vacío, precisión de unidad, conflictos, UUID/reintento explícito y respuestas tardías tras vencimiento/cambio de cuenta. |
| Escala compartida W1 | 12/12 PASS: geometría, extremos ausentes, conversiones y captura opcional. |
| TypeScript API y Web | Ambos `tsc --noEmit`, exit 0. |
| ESLint, nueva página/componente/contrato | PASS, exit 0; no se presenta como lint de todo el repositorio. |
| Navegador, React real y transporte QA en memoria | Guardar sin dato manual → revisión 1/un input preparado/cero aplicaciones; recuperar conserva esa revisión. VIEWER no ofrece guardado; 401 oculta datos. |
| Teclado de slider | Rango **sintético** 10/20/40, MARKSMAN 30 situado al 75%; ArrowRight produce 30.4 y Home produce 10, conservando el marcador al 75%. No son estadísticas económicas. |
| Móvil | `innerWidth=390`, clientWidth y scrollWidth=371; sin overflow horizontal. Ajuste de viewport físico por zoom existente; restaurado después. |

Los primeros intentos detectaron y corrigieron un cierre JSX/import relativo,
fixtures de prueba incompletos y el retorno de un mock desde beforeEach; ESLint
detectó JSX dentro de try/catch, ahora limitado únicamente al fetch. Las suites
afectadas y tipos se repitieron después. No se ejecutó build/release completo.

Capturas locales del componente integrado:

![W2 escritorio, decisiones recuperadas](COST_BASE_WIZARD_W2_VERIFIED_2026-10-04.png)
![W2 móvil, 390 píxeles CSS](COST_BASE_WIZARD_W2_MOBILE_2026-10-04.png)

Pantalla de revisión: http://127.0.0.1:4730/tests/visual/version-wizard.html.
Servidor sólo loopback, sin leer .env, con CSP de origen local y transporte sin
fallback al BFF real. Los guardados QA viven en memoria y se borran al recargar;
**esa pantalla no prueba la persistencia del adaptador Prisma**. Parámetros
`role=viewer`, `error=expired`, `error=conflict` permiten reproducir UI de errores.
`scale=synthetic` muestra geometría de QA y bloquea su guardado. W1/4722 intacto.

### Archivos y recuperación

- API: `cost-base-wizard-version.ts`, su service, catálogo JSON fijado y dos
  pruebas nuevas; dos endpoints añadidos en `cost-bases.routes.ts`. W1 sólo expone
  su schema de guardado existente; no cambia su semántica económica.
- Web: nueva página `/cost-bases/[baseId]/versions/[versionId]/build`, componente
  y CSS, contrato type-only, enlace acotado en el board; tests y fixtures QA.
- Documentación: este wireframe/entrega, dos capturas y checkpoint en SPRINT_STATUS.

Rama/HEAD antes y después: `codex/cost-tires-release-s14` /
`4f5fc2de0c3d178dace917231e1092040dec21fd`. Checkout usado:
`D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`.
Worktree ya tenía cambios ajenos; no commit/reset/staging/branch nuevos.
Rollback por hunks: quitar sólo import/enlace del board y import/endpoints de
rutas; retirar los nuevos módulos W2 y fixtures si se decide revertir. No restaurar
archivos completos con `git checkout`, pues contienen trabajo previo. No hay
migración ni datos reales creados que revertir; no borrar eventos si se valida
en un entorno real posteriormente. Detener sólo el servidor QA propio del 4730.

### Gate pendiente y actividad siguiente

Identificar **entorno no productivo, organización, base y versión DRAFT no activa**
y autorización puntual para un guardado de metadata. Comprobar sesión Supabase
real, guardar una decisión, recuperar tras recarga/reinicio, misma revisión con
replay y denegación de otra cuenta/rol; verificar que inputs/calibración quedan
idénticos. No crear usuarios, alterar Auth, migrar ni activar/publish por ese gate.
La adopción de inputs y expansión a otras secciones es otro corte explícito, no
se simula ni se incluye como completada aquí.

Responsable/elección por actividad (backend, UI y verificación): Codex/OpenAI,
**GPT-6.1 Sol / high recomendado**, conservando la sesión nativa; versión y
esfuerzo efectivos no observables. `codebase-design` mantuvo una sola lógica W1
y adaptador; `frontend-design` mantuvo el wireframe/slider y tema existentes.
Sin Claude, subagentes, dependencias nuevas ni inferencias auxiliares; no gasto
externo activado. No se infiere cuota restante ni cargos reales de estos checks.
