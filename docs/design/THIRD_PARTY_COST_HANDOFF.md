# Costos de socios · wireframes y contrato visual

Alcance: estimar la compra D2D de un viaje sencillo con intercambio entre línea MX y US. Entrada desde Cotizar → Costos de socios. No se reutiliza el perfil de activos propios. Se conservan las bases y fórmulas V3 existentes.

## Wireframe desktop · 1280 px

```text
← Cotizar   COSTOS DE SOCIOS                         D2D · viaje sencillo
Suma las tarifas de tus líneas y los cargos del intercambio
┌ 1. Movimiento ─────────────────────────────────────────────────────┐
│ Empresa principal [MX / US]   Dirección [MX→US / US→MX]  Fecha [  ] │
│ Origen [              ]       Destino [             ] Equipo [   ]│
│ Intercambio MX [              ] Intercambio US [                  ]│
│ Supuestos del viaje: carga, tiempos, responsabilidades [          ]│
└────────────────────────────────────────────────────────────────────┘
┌ 2. Línea mexicana ─────────────┐ ┌ Línea estadounidense ────────────┐
│ Transportista / referencia    │ │ Transportista / referencia     │
│ Vigencia desde / hasta        │ │ Vigencia desde / hasta         │
│ Tarifa por viaje / moneda     │ │ Tarifa por viaje / moneda      │
│ Diesel [pendiente/incl./extra] │ │ Diesel [pendiente/incl./extra] │
│ Peajes [pendiente/incl./extra] │ │ Peajes [pendiente/incl./extra] │
│ Condiciones y exclusiones     │ │ Condiciones y exclusiones      │
└───────────────────────────────┘ └──────────────────────────────────┘
┌ 3. Cruce e intercambio ────────────────────────────────────────────┐
│ Cruce [pendiente / incluido MX / incluido US / cargo separado]     │
│ Intercambio [pendiente / incluido MX / incluido US / separado]     │
│ Cargo separado → proveedor, referencia, vigencia, importe, moneda │
│ FX MXN por USD [   ] Fuente [    ] Fecha [    ]                    │
└────────────────────────────────────────────────────────────────────┘
[Calcular costo de compra]
┌ Resultado ────────────────────────────────────────────────────────┐
│ Por completar: conceptos pendientes / fuera de vigencia           │
│ O: desglose de conceptos → Costo conocido de compra USD           │
│ Estimación sin guardar. Impuestos y contingencias no incluidos.   │
└────────────────────────────────────────────────────────────────────┘
```

## Wireframe móvil · 390 px

```text
← Cotizar
Costos de socios
1. Movimiento
[Campos en una columna]
2. Tarifas
[Línea mexicana]
[Línea estadounidense]
3. Cruce e intercambio
[Conceptos en una columna]
[Tipo de cambio y fuente]
[Calcular costo de compra]
[Estado / desglose / total]
```

Usar tokens existentes MARKSMAN: `primary` #ea5e27 con texto `primary-foreground`, `foreground` #1e1e1e, `muted-foreground` #484848, `background` #efefef. Tipografías y logo del shell vigente. Ancho máximo 1152 px, espacio entre bloques 24 px, tarjetas padding 20 px; dos columnas desde 768 px, una debajo. Inputs de 44 px mínimo y labels persistentes. Importes con tipografía mono. Sin activos ni fuentes nuevos.

Estados: vacío sin tarifas ni FX precargados; conceptos inicialmente pendientes; campos de importe extra sólo cuando corresponden. Validación HTML para campos obligatorios más errores del servidor con nombres legibles. Durante cálculo bloquear campos y CTA; al editar borrar resultado para evitar presentar un total anterior. Error conserva captura y permite reintento; una respuesta pendiente muestra conceptos faltantes y ningún total completo. Resultado sólo contiene compra conocida; no ofrece guardar/enviar. Navegación por teclado en orden del documento, `fieldset/legend` para grupos, labels para cada input, `role=alert` para errores y `aria-live=polite` para resultado. No animaciones necesarias.

Reutilización: adoptar shell, tokens y BFF existentes; adaptar formularios nativos accesibles; rechazar fórmulas V3 de capital/activos para tarifas externas. Sin dependencias nuevas. Esta primera calculadora es una estimación en sesión; la integración de persistencia/versionado y aceptación de tarifas reales queda como siguiente dependencia.
