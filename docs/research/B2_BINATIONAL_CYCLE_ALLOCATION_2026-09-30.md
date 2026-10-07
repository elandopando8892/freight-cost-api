# B2 · Exposición binacional: tractor, frontera y remolque

Actualización posterior: el usuario ya eligió **relevo propio MX/US conservando la misma caja**. Véase [registro de selección y validación](B2_BINATIONAL_OWN_RELAY_SELECTION.md). La descripción original inferior conserva la cronología; no implica que la elección siga pendiente ni acredita tiempos/costos reales.

Corte iniciado 2026-09-30. Worktree físico `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`; inspeccionados rama/worktrees/estado/historial antes de modificar. Cambios previos conservados. Sólo desarrollo y pruebas locales: no despliegue, SQL, Auth, usuarios, proveedor de rutas, cupos o IA de aplicación.

## Resultado tangible

Antes, la validación del remolque exigía un ciclo mínimo igual a la suma de los ciclos completos MX y US. Es conservador mientras no haya un desglose, pero puede rechazar un ciclo válido cuando un tractor sigue ocupado en su retorno después de entregar la caja. **No se reprodujo un sobrecargo en una cotización real:** el caso público sigue sin costos.

Ahora se puede proporcionar, como argumento interno de investigación, el tiempo de la caja con cada tractor y en frontera sin tractor. Se conserva el ciclo completo de cada tractor para su CFU y sus vacíos para CVU. No se copian esos vacíos ni ese retorno automáticamente al remolque. Reutilizamos el compositor existente; no otro motor, dependencia, servicio o base.

La variante desarrollada requiere **dos tractores físicos distintos y un remolque**, compatible con relevo propio binacional. No se eligió esa variante para el usuario: empresa binacional, Puente III y caja seca 53′ no acreditan por sí mismos cómo se mueve la caja. Un único tractor D2D se rechaza en esta variante para evitar dos presupuestos nacionales del mismo activo; aún necesita asignación económica específica y capacidad operativa acreditada.

## Benchmark y alternativas previas

| Enfoque | Ajuste/riesgo | Decisión |
| --- | --- | --- |
| Mantener suma de ciclos completos de tractores | Compatible con entradas antiguas, pero puede incluir retornos sin caja | Mantener sólo como comportamiento anterior, no inventar equivalencia física |
| Quitar la comprobación de tiempo del remolque | Podría omitir su exposición fronteriza o aceptar un ciclo demasiado corto | Rechazar |
| Partición explícita y referenciada de tiempos de la caja | Distingue recursos y conserva costos nacionales; mantenimiento mínimo, misma tecnología | Adoptar para investigación interna, sin exponerla todavía en formulario/HTTP |

Fuentes públicas pertinentes:

- [FMCSA: programa long-haul México](https://www.fmcsa.dot.gov/international-programs/mexico/mexico-long-haul-program), página oficial revisada; actualización publicada 2024-10-04. La operación más allá de la zona comercial requiere autoridad aplicable, no basta el nombre binacional. No consultamos ni afirmamos permisos de una empresa. Lector web accesible; descarga directa HTTP 403, sin original archivado ni evasión del acceso.
- [TTI/BCIS: glosario comercial](https://bcis.dev.tti.tamu.edu/Commercial/en-US/help-and-glossary.aspx), metodología de lectores y límites de medición. El tiempo completo de cruce contiene la espera hasta CBP y las etapas posteriores: no sumar ambos como intervalos independientes. Es metodología, no una muestra vigente de tiempos Puente III. Original HTML archivado en `sources/TTI_COMMERCIAL_TIME_DEFINITIONS_REVIEW_20260930.html`, SHA-256 `8feef0dce2ee5feacc0563ddb2a30e476b66fadf05a6b528c100be0d4ae224b8`.
- Expediente interno [exposición MX/US](B2_REFERENCE_PROFILE_EXPOSURE_2026-09-29.md): conserva cohortes/años y límites, no productividad 2026 calibrada. No se repitió investigación de capital, FX, rutas o índices generales. Fuente/fórmula reutilizada: `allocateFixedCost = MAX(distancia, tiempo)`.

La descarga de `bwt.tti.tamu.edu` sólo produjo un shell de SPA (`TTI_BORDER_TIME_SCOPE_REVIEW_20260930.html`); **no acredita tiempos ni definiciones completas** y no se usa como evidencia numérica. No se activó API ni se capturó una espera de pantalla como supuesto anual.

## Reparto y fórmulas, sin importes inventados

Esquema ilustrativo, no itinerario elegido:

```text
Caja única:   [con tractor MX] [patio si aplica] [con tractor US] → disposición
Tractor MX:   [operación MX] → retorno/reposición propio (puede continuar sin caja)
Tractor US:                  [operación US] → retorno/reposición propio
```

`t_min_caja = t_adherido_MX + t_frontera_sin_tractor + t_adherido_US`.

Cada tiempo adherido debe ser positivo y no exceder el ciclo de su tractor; la caja debe cubrir al menos esa partición. Días con una definición compatible con los denominadores productivos: no se relabelan horas ideales SAKBÉ/Google como ciclo, ni horas de conducción como días operativos. Si la caja cruza con el tractor MX, ese tiempo pertenece a su fase adherida; no también a patio. El desglose declara fases seriales sin solapamiento: referencias presentes **no prueban** que esa declaración coincida con eventos observados.

El método monetario no cambia:

`CFU_activo = MAX(C_mes × km_activo / Q_mes, C_mes × días_activo / P_mes)`.

`CVU_tracto = combustible cargado/vacío + mantenimiento + llantas + conductor + peajes`, con sus inputs existentes. `CVU_caja` sólo usa su propio kilometraje/mantenimiento/llantas. `Costo_D2D = CFU_MX + CFU_US + CFU_caja + CVU_MX + CVU_US + CVU_caja + frontera incremental documentada`.

Si cambia el tiempo adherido o de patio en Δd, la sensibilidad de asignación fija es la diferencia entre los dos MAX con `d` y `d+Δd`; no un porcentaje aleatorio ni necesariamente costo lineal si domina distancia. No se añadió combustible de ralentí ni pago por espera sin una tasa/evidencia compatible. Administración del grupo debe repartirse una sola vez en los presupuestos nacionales; este corte no certifica que las fichas históricas ya contengan ese reparto.

## Implementación y verificación

`benchmark-trailer-attachment.ts` valida identidad, unidades, duraciones y referencias. `calculateBenchmarkD2D(raw, attachment?)` conserva su salida anterior sin segundo argumento. La composición de activos propios admite el mismo argumento y renombra referencias a `trip:...`, sin mezclar fuentes de capital/fijo con tiempos. El contrato HTTP/formulario continúa igual y rechaza `trailerAttachment` en el cuerpo: no se actualizó snapshot, wireframe ni UI.

**136/136 pruebas focalizadas en cinco archivos, 16 nuevas:** cálculo D2D/leg, preflight, anexo y endpoint. Casos sintéticos: retornos separados de la caja, peaje/servicio conservado, ambos sentidos, ciclos cortos, mismo tractor cargado dos veces, identidad tractor-caja, fuentes desconocidas/duplicadas/vencidas, cero documentado y contrato HTTP. Endpoint con identidad simulada y guardia que rechaza DB: no sesión real ni operación autenticada en producción.

Typecheck API y scripts/tests PASS. Se corrigió una anotación de tipo en la tabla de pruebas de arrendamiento (`string[][]`): no cambio de valores o comportamiento. Suite reejecutada después de la última modificación. Metadatos del formulario anterior PASS. CLI del caso real: exit 2 esperado, **INCOMPLETE/41 incidencias/costs null/compositor false/0 adopciones/0 de 4 gates**. El anexo señala soporte interno disponible pero estrategia física sin elegir y sin evidencia de ciclo; no lo activa por defecto.

Hashes intactos: esquema original de remolque `b1ea276d97e248f6eff46c9c6c49cb9c61442f1b138b0aed0bee921126d14dcc`; JSON fronterizo `5a6cce075e02b2dd1e7df2d6339f9f374618e22d950a3f73ccf7541390338827`; fichas históricas de exposición `336c00c88d3e13f64ce6706905cf926142885bc591c7355b3f7a666508bb7857`. Matehuala y Carbonera siguen pendientes. Las cantidades sintéticas de tests no alimentan ninguna base.

## Siguiente, modelo y rollback

**Corte de cálculo local cerrado, B2 económico aún parcial.** Siguiente resultado: elegir variante física de referencia → documentar exposición/ciclo y presupuestos nacionales compatibles por activo, con inclusiones del grupo → ejecutar estimación CFU/CVU sólo cuando sus entradas estén sustentadas. Fecha del servicio pendiente; no inferida de investigación. No pedir facturas privadas para sustituir la investigación pública. La futura captura SaaS requerirá wireframe MARKSMAN antes de modificar UI.

Recomendación: GPT-6.1 Sol alto para reparto/compatibilidad; medio para extracción documental y QA. No se cambió modelo ni se midieron tokens/precios; sin costos recurrentes o infraestructura nuevos. Guía de pruebas aplicada: cálculo unitario + contrato HTTP + preflight local, separando síntesis de evidencia operativa.

Rollback: retirar únicamente argumento opcional/imports/bloques de este corte en ambos compositores, nuevo helper, pruebas añadidas y nota de soporte en revisor fronterizo. Mantener entradas/salidas antiguas, cambios ajenos y fuentes; no revertir archivos completos ni resetear rama. No hay datos ni despliegue remoto que restaurar.
