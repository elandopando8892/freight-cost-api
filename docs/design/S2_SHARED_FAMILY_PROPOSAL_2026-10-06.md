# S2 · propuesta compartida por organización/base/versión

Decisión humana: «adelante continua»,6oct2026, después de recomendar compartir
la propuesta entre ADMIN/OPERATOR de la organización, conservando autoría y
protección contra duplicados. Sólo desarrollo local en el checkout D:, rama
codex/cost-tires-release-s14, HEAD4f5fc2de0c3d178dace917231e1092040dec21fd.

## Revisión previa, objetivo y alcance

Se reutiliza la comparación CRUD externa del3oct (A:stack actual; B:Refine;
C:ra-core/admin-kit), verificada contra los mismos módulos/dependencias actuales,
y la [revisión Fable adjudicada](../reviews/S2_FABLE_REVIEW_ADJUDICATION_2026-10-06.md).
Compartir por versión/org reutiliza B3, CostBaseAuditEvent, middleware y locks.
Mantener propiedad privada por actor contradice la elección; agregar transferencia
manual crea comandos/proceso sin necesidad. Sin nuevo framework, servicio o tabla.

Objetivo: operadorB recupera la propuesta deA y puede conservar la siguiente
planeación válida de esa misma versión; el autor original sigue en el evento/body,
sin reescribir historia. No nuevo permiso de VIEWER ni acceso entre organizaciones.
Replay se conserva sólo para el actor que originó UUID/comando. Una propuesta
CURRENT es única para el recibo B3, aunque cambie el operador; otra UUID no duplica.

Cambio backend mínimo: validar cada propuesta histórica con el autor auditado,
no con el caller actual; B3 ya verifica record.savedBy/actorId y el contenido.
Para preparar, verificar cálculo contra la identidad de su autor original, sin
exigir que el lector autorizado sea ese mismo autor. No cambiar fingerprints,
esquema de eventos, sourcepack, fórmulas, importes,210params o V3.

## Wireframe y estados UX

Conservar layout, Button, colores y tipografía MARKSMAN existentes:

```text
Propuesta por familias
Compartida con tu organización. Autoría y fuentes conservadas.
Se usa el cálculo B3 guardado, revisiónN.

CURRENT: Propuesta vigente · revisiónN
  [Consultar propuesta] [Guardar propuesta: deshabilitado]

STALE después de replay:
  Propuesta anterior · revisiónN. No corresponde al cálculo actual.
  Recibo recuperado sin duplicar. La propuesta es anterior;
  recupera el cálculo B3 para continuar.
  [Consultar propuesta] [Guardar propuesta por familias]
```

No nuevo control ni rediseño visual. El mensaje distingue recuperación de recibo
de vigencia económica; flags no cotizable/no calibrado siguen visibles. Conflicto,
401/403, recarga/cambio de cuenta, respuesta tardía y UUID incierto conservan guardas.

## Cierre y presupuesto

TDD: lector y escritoresA/B (ADMIN/OPERATOR), autoría/calculation owner intactos,
UUID ajeno rechazado, no duplicación de CURRENT, otra org/VIEWER rechazados, mixed
history válido, corrupción rechazada. PostgreSQL descartable/HTTP con nuevo cliente
y baseline210 intacto; UI replaySTALE distingue estado sin inventar fallo/success.
Pruebas/suites/tipos/builds pertinentes después del último cambio, browser sólo
fixture estable sin builds concurrentes; no sesión/Neon/Auth real ni despliegue.

Codex ejecuta localmente; OpenAI GPT6.1Sol/high recomendado/solicitado, observado
desconocido. Fable ya revisó y su cupo1de1 está cerrado: ninguna llamada nueva ni
router/política activada. Presupuesto60min,2reparaciones por causa, sin más accesos
ni cargos. TDD y design:ux-copy guían evidencia y texto; verificación al cierre.
Rollback retira sólo hunks de sharing/copys y tests añadidos, no eventos históricos,
datos, valores ni cambios ajenos. No commit, rama/worktree,PR o preview por defecto.

## Entrega y prueba después de los cambios

Antes: comparación del autor contra el caller bloqueaba una versión íntegra a
otro operador; prepare también exigía que el recibo B3 fuera suyo. Ahora: el store
valida cada body histórico con su savedBy auditado y devuelve scope del caller
autorizado. Prepare compara savedBy con calculation.scope y recalcula la referencia
con esa identidad original. La nueva propuesta pertenece al equipo/version pero
su body/evento conserva al actor que la guardó. No se reescribe cálculo ni evento.

Replay conserva digest actor+comando; otra cuenta no puede reutilizar UUID ajeno.
Además, estado CURRENT impide otra propuesta del mismo recibo aunque el caller
cambie. Un nuevo recibo B3 válido permite append de revisión con otro autor y
recuperación de todo el historial. Source drift/corrupción siguen fail-closed,
no conversión automática a STALE ni cambio de periodo/pins. El texto replaySTALE
ahora distingue «Recibo recuperado» de vigencia y solicita recuperar cálculo B3.

- RED real previo:5fallos API por HISTORY_INVALID/RECEIPT_MISMATCH y1fallo UI por
  texto ambiguo; no errores de colección. GREEN final33/33 API focales (13store,
  20bridge) y17/17 Web focales (8panel,9B3). Se conservan tests anteriores de
  tamper/roles/source drift y se agrega lectura/escritura multiusuario.
- PostgreSQL descartable **6/6 PASS**,inicio07:14:04,duración25.75s,exit0. Roles de
  identidad ADMIN/OPERATOR sintéticos y rol DB limitado, B3/store/pack reales.
  Dos autores compiten bajo locks; uno gana, otro rechazado. Historial leído por
  ambos sin modificación; operador guarda propuesta desde cálculo delADMIN;
  replayUUID ajenoHTTP409,propio200 sin append.7eventos finales,5previos intactos;
  baseline210params/perfil/calibración/V3 exacto. No JWT/OAuth real ni DBexterna.
  Runner aplicó46migraciones existentes sólo a DB loopback/tmpfs propia; no nueva
  migración. finally cerró contenedor y restauró env; fixtures recreables, descartados.
- Web completo **252/252 PASS**,28archivos,inicio07:14:38,duración172.12s,exit0;
  typecheckWeb exit0. Builds API/Next16.3.3 exit0 después de código final.
- API completo **3287PASS/31SKIP**,214archivosPASS/1FAIL/5SKIP,220archivos,
  inicio07:14:26,duración650.52s,exit1. Única suite bloqueada en colección:
  tire-calibration-rls-postgres.test.ts, falta FCM_TEST_ADMIN_DATABASE_URL local
  fcm_tire_s8. Cero tests ejecutados fallidos, no releaseglobalverde.6de31SKIP
  son familias y pasaron en su runner;25omitidos restantes no certificados.
- Lint focal panel/test exit0. Lint global no repetido: conserva limitaciones
  anteriores (artefactos generados/tests/benchmark-form), no afirmar todo verde.
  git diff --check exit0 (avisos CRLF). Sourcepack y paquete Fable atestado SHA
  intactos; el encargo Fable permanece cerrado1de1, no se invocó aquí.

## Evidencia UX y límites

Fixture loopback4740 con componente React real; transporte/identidad/guardado sólo
en memoria, no BFF/Auth/DB reales. La recarga mostró estado sin consultar, como
declara el banner; no se afirma persistencia de ese fixture. Consultar→NONE,
Enter sobre Guardar→CURRENT/revisión1 y botón deshabilitado;403 sintético retiró
tabla, notas y panel B3 (no cifras fallback). ReplaySTALE probado en React/jsdom,
no en este fixture de navegador.

Captura inicialmente expiró; Page.bringToFront de la pestaña propia permitió
capturar, sin cambiar controles de seguridad. No se confirma que esa sea la
única causa histórica. El fixture carecía de variables next/font: se añadieron
Arial/Courier New como fallbacks ya declarados en globals.css, sólo en HTML de QA.
Las fuentes licenciadas oficiales no están empaquetadas según CSS existente;
no se afirma equivalencia tipográfica/pixelperfect del SaaS real.

Viewport CSS medido1280×900 y390×844, sin overflow horizontal de página; la tabla
590px conserva scroll interno. La superficie aplicaba escala/zoom: se ajustó la
dimensión solicitada según medición DOM, sin modificar zoom persistente, y se
restauró el viewport. Capturas nativas JPEG:

- [Desktop](S2_SHARED_FAMILY_DESKTOP_2026-10-06.jpg), fallback corregido.
- [Móvil completo](S2_SHARED_FAMILY_MOBILE_2026-10-06.jpg), incluye banner sintético,
  controles, tabla desplazable, panel/flags y acciones. Captura de recorte no
  mostró el panel; conservada como INVALID_CROP, **no evidencia del panel**.

Sólo pestaña propia cerrada y servicio QA terminado; otras pestañas/procesos no
adoptados. No credenciales, llamada aMaps/IA, OAuth, Neon/QA reabierta, usuarios
Supabase, producción ni publicación. No modelos auxiliares ni cambio nativo.

**Corte de colaboración cerrado localmente.** Sprint2 completo/B4 permanecen
abiertos por aceptación autenticada del panel y revisión/adopción económica.
No hace falta otra decisión para este sharing; siguiente corte: contrastar las
familias y supuestos con el inventario y criterios de adopción, conservando V3 y
requiriendo autorización puntual antes de escribir en entorno externo/publicar.

Archivos: family-base-store y own-relay-family-base (3guardas/contextos), panel
(copy), testsstore/bridge/PG/panel, HTMLfixture (fallback), este documento/status
y capturas. Sin nueva dependencia, schema/contrato público, infraestructura o
fórmula. TDD y systematic-debugging explican la causa; design:ux-copy y revisión
vercel:react-best-practices conservan estados, marca y guardas; cierre guiado por
verification-before-completion. El informe Fable anterior conserva su baseline.
