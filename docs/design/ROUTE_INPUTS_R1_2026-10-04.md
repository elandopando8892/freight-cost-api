# R1 — Inputs del viaje separados de la base

## Objetivo y benchmark previo

Cerrar el primer recorrido base → ruta/fecha → revisión de diésel USA → cálculo → snapshot reproducible. No adoptar las decisiones W2 en parámetros productivos, ni escribir en Neon durante este corte.

Preflight: D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd. Worktree previamente sucio: conservar cambios ajenos. Se revisaron lane-resolver, fuel.service, engine/calculator, quote-by-route, snapshots, formulario rápido y wizard guiado; docs Next instaladas use-client.md. Reutilizar benchmark de COST_BASE_WIZARD_SPEC_2026-10-04.md.

Comparación proporcional:

| Alternativa | Capacidad concreta | Costo/mantenimiento/limitación |
| --- | --- | --- |
| Reutilizar UsaFuel + resolver + snapshot | Referencia por estado de salida, revisión y precio propio por viaje | Sin proveedor/dependencia nueva; caché sin fecha de observación, no precio de estación/corredor |
| Consultar EIA en cada cotización | Series oficiales semanales/regionales | Repite llamadas y agrega dependencia en línea; tampoco identifica compras del transportista |
| Proveedor de estaciones/plan de abastecimiento | Precio local/contratado y mezcla por compras | Otro alcance y posible costo; requiere patrón de abastecimiento real |

Recomendación: primera alternativa, con aceptación explícita de referencia provisional y manual opcional. EIA vigente consultada 2026-10-04: https://www.eia.gov/petroleum/gasdiesel/ publica diesel USD/gal por regiones y semanas. No copiar precios web al catálogo productivo ni inventar fecha para UsaFuel. Diferencial: premisas y gobierno MARKSMAN; resolución regional, formularios y snapshots son capacidades existentes reutilizadas.

## Alcance, datos y arquitectura

- Base: rendimiento/CFU/mantenimiento y mezcla fronteriza permanecen intactos.
- Viaje: fecha explícita; precio USA USD/gal con contexto de ruta y empresa. Referencia = caché UsaFuel por outState y region; fecha de observación desconocida.
- Cotización: precio, modo, fuente declarada, fecha de observación (manual), advertencia y contexto congelados dentro de usaLeg en snapshot con checksum existente. FSC separado, no derivado del precio manual ni cambiado de metodología.
- Endpoint de resolución sólo lectura, roles ADMIN/OPERATOR. Calculación por ruta con USA exige decisión; sin combustible no usar cero silencioso. Históricos/direct calculate no reescritos.
- Huella de contexto es detector cooperativo de cambios, no firma ni prueba de identidad. Autorización sigue middleware actual.

## Propuesta visual y wireframe

Dos opciones: revisión en línea en la cotización (recomendada), o página aparte (duplica navegación). Conservar shell, tokens MARKSMAN, controles existentes, foco y diseño responsive. Sin otro wizard/slider para combustible: faltan extremos observados.

```text
BASE / RUTA / EQUIPO
Fecha del servicio [aaaa-mm-dd]
[Generar tarifa → resolver inputs]
┌ Inputs de este viaje ──────────────────────┐
│ Diésel USA · estado / región · USD/gal     │
│ Fecha observada: desconocida · provisional │
│ ( ) Usar referencia (aceptar limitación)   │
│ ( ) Precio propio [importe] [observación]  │
│     [fuente/premisa de abastecimiento]     │
│ FSC separado; base y mezcla MX no cambian │
│ [Confirmar y calcular]                    │
└──────────────────────────────────────────┘
RESULTADO → revisar → guardar preview existente
```

## Cierre y presupuesto

Responsable Codex local. Recomendado OpenAI GPT-6.1 Sol/high; modelo nativo/esfuerzo efectivo no observables. Sin Claude, subagentes, IA por card ni llamadas facturables. Ventana objetivo 45 minutos, hasta 2 rondas de reparación focal; consumo de tokens/costo real desconocido, sin prometer cuota.

Criterios: aceptar o manual afecta fuelCost/CVU real con mismos parámetros; estado/fecha/ruta/base cambiados invalidan revisión; referencia cambiada devuelve conflicto; precio inválido/faltante no escribe preview; snapshot reproduce aunque cambie caché y detecta manipulación; roles y sesión vencida; rápido/guiado comparten decisión; recarga exige nueva revisión; QA visual desktop/móvil. Pruebas locales con persistencia mock no equivalen a Auth/DB real.

Pendiente aparte: fecha semanal en ingesta/catálogo, plan de compras multirregional, diésel MX/mezcla fronteriza, peajes y descansos completos. No presentar R1 como inventario completo calibrado.

Rollback: revertir sólo hunks R1 y sus archivos nuevos, conservando W1/W2/cambios ajenos. Sin migraciones, cambios de Auth, infraestructura o producción; no hay rollback remoto que ejecutar.
