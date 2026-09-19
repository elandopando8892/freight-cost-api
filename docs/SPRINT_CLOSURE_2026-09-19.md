# Cierre de sprints y preparación de producción

Fecha: 19 septiembre 2026. Responsable de ejecución: Codex. Responsable de aceptación y autorización productiva: André.

Este documento sustituye el calendario del plan del 8 de septiembre. Conserva el trabajo existente y congela funcionalidades. La fecha anterior del 22 de septiembre deja de ser un compromiso sustentado. Las ventanas siguientes son estimaciones de capacidad, no ejecución programada en segundo plano.

## Objetivo y terminado

Entregar un MVP SaaS de Freight Cost Model listo para decisión de producción: un usuario entra con Google, cotiza una ruta, comprende el costo y resultado, guarda y reabre la cotización, consulta su trazabilidad y revisa su presentación comercial. Cada rol opera dentro de su organización. La experiencia usa la marca MARKSMAN y wireframes desktop/móvil.

El cierre exige una versión web/API del mismo commit, demostración autenticada, cero defectos críticos o altos en el recorrido, evidencia fechada y rollback. Publicar producción requiere autorización puntual posterior sobre el candidato concreto. Un bloqueo documentado no equivale a una prueba aprobada.

## Baseline verificado

- Worktree D:/andre/worktrees/freight-cost-model/supabase-auth-migration-20260830.
- Rama codex/supabase-auth-slice; fuente c9d9f631675dc4518d78ab2897b761f419923ce6; checkout limpio antes de este documento.
- Corrección de enlace heredado Supabase implementada. Publicación y aceptación autenticada pendientes de confirmar.
- Evidencia histórica de ADMIN, revisión comercial y responsive disponible; requiere reconciliarla con el candidato final.
- Estado cloud actual no confirmado: el conector Vercel presenta incompatibilidad de esquema.

## Dos sprints de cierre

Se reserva 75% de capacidad y 25% para bloqueadores. Las fechas se revisan con evidencia al final de cada sprint; no se añaden funciones para llenar la ventana.

| Sprint | Ventana objetivo | Entrega visible | Criterio de salida | Modelo recomendado / esfuerzo |
|---|---|---|---|---|
| C1 · MVP operativo | 21 septiembre–2 octubre | Una URL de preview con acceso y cotización completa | Google, sesión/renovación y tres roles verificados; captura → cálculo → guardado → detalle → reapertura; revisión comercial probada; aislamiento correcto | GPT-5.6 Sol alto para flujo; GPT-6 Astra alto para Auth/permisos |
| C2 · Candidato de producción | 5–16 octubre, adelantable si C1 cierra antes | Demo final, matriz de aceptación y paquete de release | Recorrido 390/1280/1440 contra wireframes; mismo SHA web/API; smoke; cero P0/P1; rollback; transición Auth y configuración productiva revisadas | Sol medio para UI; Sol alto para integración; Astra alto para decisión técnica |

### C1: orden y capacidad

1. Recuperar publicación verificable y desplegar arreglo de identidad en preview alineado (1 día).
2. Validar ADMIN, OPERATOR, VIEWER, pertenencia y renovación real; corregir bloqueadores (2 días).
3. Completar cotización y reapertura en entorno/datos de prueba autorizados, con trazabilidad (2 días).
4. Revisar presentación comercial y restricciones sin envío (1 día).
5. Integración y demo C1 (1.5 días); reserva 2.5 días.

Dependencias: disponibilidad de las cuentas existentes y del despliegue. Si una cuenta exige credenciales, interviene su titular. Verificar el destino de datos antes de cualquier registro sintético; no inferir aislamiento sólo por usar URL preview.

### C2: orden y capacidad

1. Confrontar recorrido núcleo con wireframes MARKSMAN y corregir bloqueadores responsive/accesibilidad (2 días).
2. Consolidar candidato y repetir sólo validaciones afectadas (1.5 días).
3. Revisar configuración productiva vigente, proveedor Auth por frontend, vínculos de identidad, redirects y compatibilidad de esquema. Preparar cambio y rollback concretos; no ejecutar migraciones ni retirar Kinde (1.5 días).
4. Preparar procedimiento de publicación, señales de fallo y recuperación, evidencia y demo (1.5 días).
5. Decisión técnica y aceptación (1 día); reserva 2.5 días.

Dependencia: C1 aprobado. Si la transición requiere modificaciones de Auth o datos, dejar alcance exacto y autorización pendiente; no declarar producción lista con ese requisito sin resolver.

## Matriz de cierre

| ID | Aceptación | Estado inicial |
|---|---|---|
| A1 | Login Google y renovación en candidato final | Pendiente |
| A2 | ADMIN/OPERATOR/VIEWER y aislamiento, UI y API | Pendiente |
| A3 | Cotización guardada y reabierta con resultado consistente | Pendiente |
| A4 | Revisión comercial sin efectos externos | Evidencia anterior; repetir en candidato |
| A5 | Recorrido desktop/móvil conforme a wireframes | Evidencia anterior; completar candidato |
| A6 | Misma revisión web/API, configuración efectiva, smoke y rollback | Pendiente |
| A7 | Paquete de producción: Auth, datos, dominios, monitoreo y decisión | Pendiente |

Cada aceptación debe enlazar SHA, URL, fecha, rol, resultado y evidencia sin secretos. Reportar aceptaciones cerradas sobre siete, no porcentajes estimados de código. No eximir A1/A2 por falta de cuenta ni presentar pruebas locales como sesión real.

## Control del alcance y narrativa

Sólo entra trabajo que cierre A1–A7. Gmail, envío/persistencia de propuestas, IA, automatizaciones, nuevas integraciones y rediseños van al backlog posterior. No se abre un tercer sprint de pulido: un incumplimiento se reporta con defecto concreto, impacto y estimación restante.

Después de cada entrega Codex comunica: qué puede hacer ahora el usuario, qué evidencia lo acredita, qué aceptación cerró, qué falta y modelo/esfuerzo recomendado. Las etiquetas de modelo no afirman cambios del selector de la conversación.

## Decisión y publicación

Primero entregar candidato, demo y plan exacto de cambios productivos para autorización. Después de autorización puntual: publicar la pareja aprobada, verificar acceso/lecturas seguras y observar señales definidas en el runbook; revertir ante fallos de login, permisos, tenant o cálculo. No ejecutar operaciones comerciales para probar producción.

El objetivo activo termina con el candidato demostrado y el paquete de decisión; producción sólo se declara completada tras despliegue autorizado y verificación real.
