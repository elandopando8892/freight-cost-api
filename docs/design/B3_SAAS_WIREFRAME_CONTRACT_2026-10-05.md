# B3 · seleccionar, calcular, guardar y recuperar

Autoridad humana: «bueno adelante continua con B3 hasta cerrarlo»,5oct2026. Resultado: recorrido SaaS del piloto de planeación binacional, trazable por organización/base/versión. GPT-6.1 Sol/high recomendado, Codex/OpenAI único escritor/implementador/verificador; efectivos, tokens, cuota y cargos no observables. Claude considerado para UX; no elegido ni invocado, sin inferencias auxiliares. Hasta3h de trabajo desde15:06:36Z; dos reparaciones diagnosticadas por causa. Rama codex/cost-tires-release-s14, HEAD4f5fc2de0c3d178dace917231e1092040dec21fd en D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, cambios anteriores preservados.

## Revisión previa y definición

Reutiliza [baseline del ecosistema](../research/ECOSYSTEM_REUSE_BASELINE_2026-10-03.md), [B2 completo de planeación](../research/B2_PLANNING_CLOSEOUT_DELIVERY_2026-10-04.md), snapshot24casos/88pins, reader actual y [wireframe de relevo propio](W2_OWN_RELAY_REVIEW_WIREFRAME_2026-10-04.md). Comprobados dependencias/componentes, contratos, historial y branch/HEAD. Next16.3.3: guía local page.md leída; params Promise y SSR/BFF vigentes. Sin aritmética económica en React.

Alternativas: (A) página del cálculo ligada a versión y adapter de metadata auditada existente: integra fuentes, controles y guardado, sin paquete/migración nueva; elegida. (B) expediente descargable actual: barato y útil para portátil, pero no conserva un resultado recuperable por organización en SaaS. (C) Refine/plataforma adicional: providers y nuevos contratos sin ventaja demostrada sobre cuatro selects, desglose y guardado existentes; no adoptada. La metodología B2 es la capacidad propia que se conserva; formularios/autenticación/auditoría son capacidades estándar reutilizadas. No nuevo core, maestros o infraestructura.

Objetivo: ADMIN/OPERATOR abre la versión de revisión, elige ciclo/capital/FIX/descanso, consulta cálculo backend, revisa procedencia y límites, confirma planeación y guarda. Reabrir recupera exactamente selección, cálculo y evidencia auditados. VIEWER conserva la política existente de no acceso al benchmark. Guardar escenario no cambia permisos de adopción/calibración.

## Wireframes y dirección elegida

A: página dedicada con enlace desde el wizard, recomendada para concentrar selección y resultado. B: añadir el formulario de guardado al panel expandible existente, con menor navegación pero más acciones dentro del editor de supuestos. Se conserva la dirección A/B ya aprobada de MARKSMAN y se elige A como ajuste de interacción dentro del B3 autorizado. Palette/tipos/logotipo heredados de globals.css y brand existentes; no reinterpretación de marca. Texto y tablas alineados a la izquierda.

```text
Desktop
← Armar supuestos de esta versión
Planeación del viaje       Base · Versión · revisión guardada
México DF → Fort Smith · WTB · misma caja53 / relevo MX-US
[Ciclo] [Capital] [FIX] [Descanso]  [Calcular escenario]
Recurso              Fijo CFU       Variable CVU       Total USD/ciclo
Tractor México          …                …                …
Tractor US              …                …                …
Caja única              …                …                …
TOTAL                   …                …                …
[Componentes] [Supuestos y pendientes] [Fuentes]
[✓ Comprendo alcance de planeación]  Nota [                  ]
[Guardar cálculo] [Recuperar cálculo guardado]  Revisión / fecha

Móvil390
← Supuestos
Planeación / base / versión
Ciclo    [              ]
Capital  [              ]
FIX      [              ]
Descanso [              ]
[Calcular escenario]
Tabla con scroll propio, fuera del flujo sin overflow global
Supuestos / Fuentes expandibles
Confirmación / nota
[Guardar cálculo]
[Recuperar cálculo guardado]
```

Errores: respuesta tardía no revive otra selección/cuenta;401/403 retira importes;409 indica recuperar antes de sobrescribir; fallo incierto conserva requestId para replay explícito, no un segundo UUID automático. Selección modificada limpia resultado anterior y no habilita guardado hasta calcular de nuevo. Navegación/cuenta nueva desmonta estado.

## Datos, alcance y cierre

Adapter guarda snapshot server-side del escenario elegido en CostBaseAuditEvent METADATA_UPDATED con discriminator B3 propio, actor, UUID, revisión, huellas y nota. No mezcla eventos W2 ni modifica AssumptionParam. Una transacción con locks existentes, validación actual tras locks, fingerprint/catálogo exactos, límite128eventos y replay verificable. Revisión vinculada explícitamente OWN_RELAY_SAME_TRAILER; no fallback de perfil V3 ni otra base.

Verificación: cálculos e identidades24, recuperación JSONB, replay exacto, reutilización UUID alterada, revisión concurrente, corrupción, tenant/roles, versión/publicada/archivada, stale referencias, expiración/cuenta/respuestas tardías; UI desktop1280/móvil390/teclado. Probar sesión real y una metadata de cálculo en mismo QA Neon Preview ya verificado, rol temporal existente mismos grants/deadline finito nuevo de este B3, cerrarNOLOGIN/0sesiones. La ventana W2 anterior permanece cerrada/consumida. Sin usuarios/Auth/Google/producción/migraciones/fórmulas/importes/operaciones/IA.

B3 termina cuando el recorrido autenticado guarda y recupera el mismo cálculo/evidencia tras cold restart y recarga, sin duplicar ni tocar economía, junto a pruebas de errores/permisos (sintéticas donde no hay cuentas humanas) y cierre del acceso temporal. B2 calibración/W3 y release B4 se documentan aparte. Rollback por hunks/archivos propios con metadata conservada; no reset ni eliminación de auditoría. Cada avance comunica resultado, límites y pendiente concreto.

## Reparación diagnosticada dentro del B3

Primer arranque se cerró en verify-effective-privileges antes de runtime HTTP/guardado, códigoUNKNOWN; causa exacta inicial no demostrada. Inspección READ_ONLY: NOLOGIN/0sesiones, atributos seguros, sin columnas inesperadas,0secuencias/definers,2eventos anteriores. Un diagnóstico separado reprodujo PostgreSQL42809 en la consulta de secuencias: AND no garantiza evitar evaluación de has_sequence_privilege sobre otro relkind. CASE guarda esa evaluación sin cambiar grants. Reanudación explícita --b3-repair-verified sólo acepta el marcador B3 cerrado, conserva el mismo deadline18:06:36Z y exige que sigan siendo2eventos. Marcador REPAIR1 impide una tercera activación. No fallback owner ni nueva ventana/permiso/HTTPsave; el primer arranque no alcanzó la escritura. Dos preflights posteriores fallaron ETIMEDOUT Vercel antes de activar: parada. Esta reparación consume el presupuesto diagnóstico del corte y conserva el fallo previo; [checkpoint completo](B3_SAAS_DELIVERY_GATE_2026-10-05.md).
