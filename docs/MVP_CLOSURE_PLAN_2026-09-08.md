# Freight Cost Model · plan único de cierre del MVP

Fecha: 2026-09-08  
Sprint de cierre: 2026-09-09 → 2026-09-22  
Rama: `codex/supabase-auth-slice`  
Baseline documental: `4fe192f`  

## Objetivo

Cerrar Freight Cost Model como MVP SaaS demostrable en un preview alineado y
estable: acceso Google; captura, cálculo, guardado, detalle y reapertura de una
cotización con trazabilidad; revisión comercial sin guardar ni enviar; permisos
ADMIN/OPERATOR/VIEWER; y experiencia desktop/móvil coherente con los wireframes
MARKSMAN. El cierre produce un único release candidate, evidencia y rollback.

## Definición estricta de MVP

El usuario puede entrar, entender el estado de sus costos, cotizar una ruta,
revisar la decisión, guardar la cotización, volver a abrirla y preparar una vista
comercial. VIEWER puede consultar sin ejecutar acciones restringidas. Ningún paso
publica tarifas ni envía comunicaciones automáticamente.

Fuera del MVP: persistencia o envío de propuestas comerciales, Gmail/Quote Desk
operativo, automatizaciones, asistente con IA, nuevas fuentes de mercado, rediseños
adicionales, migración final de Kinde, nuevas integraciones y producción.

## Regla de cierre

Feature freeze desde 2026-09-08. Sólo entra un cambio si corrige un defecto que
impide uno de los gates siguientes. Mejoras de texto, estilo, nuevas herramientas
o arquitectura futura van al backlog. Al pasar los gates se declara MVP cerrado;
no se abre otro sprint de pulido antes de la demostración.

## Estado inicial por gates

| Gate | Estado al 8 sep | Falta para cerrar |
|---|---|---|
| G1 · Alcance, IA y wireframes | PASS | Congelar; no ampliar |
| G2 · Google y roles | PARCIAL | Login real OPERATOR y VIEWER; renovación o bloqueo reproducible |
| G3 · Cotización completa | PARCIAL | Una ejecución autenticada captura → guardado → detalle → reapertura |
| G4 · Revisión comercial | PARCIAL ALTO | Repetir en RC final; acreditar cero guardado/envío |
| G5 · Responsive accesible | PARCIAL | Rutas núcleo en 390, 1280 y 1440; sin overflow ni CTA duplicado |
| G6 · Release candidate | PENDIENTE | SHA final alineado, smoke, riesgos, rollback y aceptación |

No se publicará otro porcentaje subjetivo. El reporte diario indicará gates PASS,
PARCIAL o BLOQUEADO y su evidencia concreta.

## Capacidad

| Capacidad | Reserva |
|---|---:|
| 10 días hábiles | 100% |
| Trabajo comprometido | 7.5 días · 75% |
| Buffer de defectos y dependencias | 2.5 días · 25% |

La ejecución técnica corresponde a Codex; el usuario sólo interviene si Google
exige credenciales/consentimiento de una cuenta o para aceptar la demo final.

## Backlog comprometido

| Prioridad | Entregable visible | Capacidad | Modelo y esfuerzo | Gate |
|---|---|---:|---|---|
| P0 | Congelar un preview/RC y matriz de evidencia única | 0.5 d | Sol · medio | G1/G6 |
| P0 | Completar ADMIN, OPERATOR y VIEWER en las rutas núcleo | 1.5 d | Sol · alto | G2 |
| P0 | Ejecutar cotización sintética completa y reapertura | 1.5 d | Sol · alto | G3 |
| P0 | Repetir revisión comercial sin guardar ni enviar | 0.75 d | Sol · alto | G4 |
| P0 | QA responsive contra wireframes y corregir sólo bloqueadores | 1.25 d | Sol · medio | G5 |
| P0 | Alinear web/API, smoke, rollback y paquete de demo | 1.0 d | Sol · alto | G6 |
| P0 | Revisión crítica de Auth, tenant y release | 0.5 d | Astra · alto | G2/G6 |
| P1 | Corrección de defectos encontrados | 0.5 d | Sol · medio/alto | variable |

No hay elementos stretch. Si aparece un bloqueo, se consume buffer o se documenta
como decisión explícita; no se sustituye por una funcionalidad nueva.

## Secuencia y narrativa de entrega

1. **Días 1–2 · Release candidate:** seleccionar un solo SHA y preview; confirmar
   origen Auth, API_URL, health/ready y cero migraciones. Narrativa: “esta es la
   versión que estamos cerrando”.
2. **Días 3–5 · Recorrido comercial:** ejecutar roles y cotización completa con
   datos sintéticos autorizados. Narrativa: “un usuario entra, cotiza, conserva
   evidencia y puede continuar desde lo guardado”.
3. **Días 6–7 · UI/UX:** revisar 390/1280/1440 contra wireframes; corregir únicamente
   bloqueadores. Narrativa: “el mismo recorrido se entiende y opera en móvil y
   escritorio”.
4. **Días 8–9 · Gate técnico:** repetir smoke, sesión, permisos y aislamiento;
   Astra revisa los límites críticos. Narrativa: “el MVP protege organización,
   roles y sesión dentro del alcance demostrado”.
5. **Día 10 · Demo y cierre:** entregar URL, guion de cinco minutos, tabla de gates,
   riesgos aceptados y rollback. La aceptación cierra el objetivo y mueve lo demás
   al backlog posterior al MVP.

## Dependencias y decisiones puntuales

- OPERATOR: usar una cuenta ya miembro y completar su primer acceso; si Google pide
  credenciales, sólo la persona propietaria puede introducirlas.
- VIEWER: `jgonzalez@xbfreight.com` ya tiene el rol; falta su sesión real.
- Cotización autenticada: requiere autorización puntual para crear un registro
  claramente sintético `QA-MVP-NO-ENVIAR` en el entorno conectado. No se confirma,
  publica ni envía.
- Renovación: se observa una ventana real o se conserva un bloqueo reproducible;
  no se manipulan tokens ni expiraciones en producción.

## Definition of Done

- G1–G6 en PASS, o una excepción aceptada explícitamente y registrada.
- Un único SHA de RC para web/API, checkout limpio y metadatos verificables.
- Guion completo ejecutado con evidencia autenticada, sin secretos en capturas/logs.
- Sin P0/P1 abiertos en login, cotización, detalle, reapertura, revisión o permisos.
- Wireframes desktop/móvil vinculados a cada cambio visual incluido en el RC.
- Rollback probado como instrucción y preview anterior conservado.
- Documento final de demo, limitaciones y backlog posterior.

## Criterio de detención

Cuando los gates pasen, Codex marca el objetivo completo y se detiene el desarrollo
del MVP. Producción y cualquier nueva función empiezan como una decisión separada.

La skill sprint-planning influyó en el objetivo único, capacidad al 75%, gates,
dependencias, buffer y definición de terminado. Modelo real de esta conversación
no verificado; las etiquetas anteriores son recomendaciones mínimas por actividad.
