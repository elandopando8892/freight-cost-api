# COST_TIRES — mapa de comparabilidad IMT por segmento

```text
REFERENCIA OFICIAL IMT · 2025
[Tres configuraciones y costo de llantas / 1,000 veh-km]

MAPA DE COMPARABILIDAD · COST_TIRES               0 adoptados
¿Dónde sirve el contraste IMT?
Referencia por vehículo-km, no por llanta ni tarifa de socio.

Contraste condicionado · sólo tramo MX comparable
┌ FTL Intra-México ──────────┐ ┌ D2D propio MX/US ──────────┐
│ Viaje interurbano propio   │ │ Sólo tramo MX propio        │
│ Verificar equipo/condición │ │ Separar MX, cruce y EE. UU.  │
└────────────────────────────┘ └─────────────────────────────┘
┌ D2D línea MX + socio US ──┐ ┌ D2D transbordo ────────────┐
│ Sólo costo propio MX       │ │ Sólo arrastre MX separado   │
│ No tarifa del socio        │ │ No maniobras/espera        │
└────────────────────────────┘ └─────────────────────────────┘

Sin comparación directa
[D2D socio MX] [MX Drayage] [MX Local] [Intra-US] [US Drayage]

[Ver 6 verificaciones antes de contrastar CVU ▾]
Sin conversión automática de cohortes históricas.
Ningún costo IMT entra a CVU, CFU o cotización.
```

En móvil, tarjetas y exclusiones se apilan. El mapa no contiene selector que pueda sugerir una elegibilidad calculada; registra una clasificación editorial de investigación, cuyo uso real exige las seis comprobaciones documentadas. El catálogo de segmentos se valida en pruebas contra `OPERATIONAL_SEGMENTS` para detectar incorporaciones o renombres.
