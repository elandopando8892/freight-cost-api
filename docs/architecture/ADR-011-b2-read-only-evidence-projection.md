# ADR 011 — Proyección de lectura del expediente B2

Fecha local: 2026-10-03. Alcance: corte 3 autorizado; integración local, sin despliegue.

## Contexto y benchmark reutilizado

El corte 2 comparó componentes existentes y Refine 5.0.12 con el mismo wireframe A de MARKSMAN. Ganaron los componentes actuales: 19 frente a 44 líneas propias de variante y 45,407 bytes gzip menos. La comparación vigente está en `docs/research/B2_EVIDENCE_REUSE_COMPARISON_2026-10-03.md`; no se agregan dependencias al producto.

El compositor `prepare-b2-closeout.ts` ya concilia 210 parámetros y evidencia pública con hashes. Su perfil confirmado es septiembre de 2026; la proyección histórica de octubre no es una cotización de septiembre. `ScenarioReview` exige quoteId y modificaciones económicas: no es un registro de notas de investigación independiente.

## Alternativas y decisión

| Alternativa | Ajuste / costo / mantenimiento | Seguridad y dependencia |
| --- | --- | --- |
| Ejecutar CLI por GET | Reutiliza cálculo, pero lee decenas de documentos por consulta y exige empaquetarlos en runtime | Amplía superficie de filesystem; no encaja con rootDir src |
| Proyección JSON derivada y verificada (elegida) | Una generación local, contrato pequeño; comprobación de deriva antes de release | Sólo lectura, fuentes pinneadas; ninguna DB o servicio nuevo |
| Registro nuevo en DB | Permitiría notas persistentes, pero duplica investigación y requiere migraciones | Más permisos y operaciones fuera del alcance |

El generador invoca el compositor existente para dos ciclos y dos comparaciones de capital. No calcula otra fórmula. Los presets son referencias comparativas, no decisiones financieras del usuario. La API conserva autenticación Supabase, organización y roles ADMIN/OPERATOR. El BFF existente transporta la respuesta; no se amplía el modo temporal de revisión local.

## Contrato y experiencia

Perfil + período + ciclo + modalidad → dos conceptos de pernocta combinada MX/US, referencias, remanentes, incompatibilidades, huella y outputs nulos. Los IDs de conceptos no son claves canónicas: ese vínculo sigue null. La pensión pública es un comparador observado, no tarifa histórica adoptada; IRS M&IE no es alojamiento.

Wireframe A existente: encabezado de caso y período; selectores ciclo/capital; lista de dos conceptos; inspector de fuentes, inclusiones, faltantes y efecto CVU. Mobile apila lista y detalle. No habrá botón de guardar una nota ficticia ni edición de parámetros.

## Cierre, presupuesto y consecuencias

Responsable: Codex. Elección solicitada: OpenAI gpt-6.1-sol, esfuerzo high; modelo nativo exacto no observable. Claude sería candidato para UX/arquitectura, pero no hay nueva invocación autorizada/necesaria en este corte acotado y verificable. 60 minutos; máximo dos reparaciones diagnosticadas; sin gasto/API/inferencia adicional. Cuota y consumo exactos desconocidos.

Criterios: regeneración reproducible y fail-closed ante deriva; GET autorizado y no-store; rechazo de inyección y huella obsoleta; UI con fuentes reales del expediente, estados de error y limpieza al vencer sesión/abandonar vista; recarga sin adopción ni notas persistidas; tipos y regresiones afectadas pasan. Prueba de transporte/Auth simulado no acredita login real.

Corrección puntual autorizada 3oct: texto de tarjetas explícito Cloud Grey sobre Charcoal (no nueva dirección visual) y huellas de código UTF8 normalizando únicamente CRLF→LF. Evidence pins conservan bytes originales. Una ronda adicional acotada, objetivo20min; misma elección de modelo/esfuerzo, sin inferencia auxiliar. Ver entrega para mediciones y límites (Auth real, CI Linux y suite previa de cotización siguen pendientes).

Pendiente fuera de alcance: contrato de notas persistentes, aceptación autenticada real, revaluación de septiembre, remuneración y pernocta completas, mapeo canónico y adopción. B2 sigue abierto. Rollback: retirar únicamente los nuevos archivos de este corte y revertir sus dos inserciones identificadas; conservar todo cambio ajeno, motor, CLI original y cortes 1/2. No rollback SQL porque no hay escrituras DB.
