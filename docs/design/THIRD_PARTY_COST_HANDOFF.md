# Costos de socios · wireframes y contrato visual

## Incremento: economía congelada y persistencia

```text
DESKTOP 1280 / MÓVIL 390 (misma secuencia, una columna)
Costos de socios                 [Estimaciones guardadas]
[Captura existente → Calcular]
[Desglose + costo conocido USD]
[Guardar estimación / Guardar nueva versión]
Guardado: versión N · [Abrir versión guardada]

Estimaciones guardadas          [Nueva estimación]
Origen → Destino · Fecha viaje · vN · [Abrir]
[Siguientes 20]

Versión guardada N — evidencia histórica, no tarifa vigente
[Costo congelado + desglose]
[Ver tarifas, referencias, vigencias y supuestos ▾] (FX y captura congelada)
[Versión anterior] [Versión siguiente, si existe]
[Preparar nueva versión ▾]
  Captura precargada → editar → recalcular → guardar vN+1
```

Reutiliza ancho, tokens y espaciado existentes. Guardar sólo aparece tras un cálculo completo y revisable; no implica cotización de venta ni verificación de fuentes. Una edición invalida el cálculo visible. En guardado se bloquea la captura; si la respuesta se pierde, el reintento conserva clave y contenido y la captura sigue bloqueada para reconciliar el intento. Éxito muestra enlace persistente. Conflicto de versión pide abrir la sucesora; no sobrescribe. VIEWER consulta historial/detalle, sin controles de escritura. Historial vacío lo indica, un fallo no se representa como lista vacía. Tarjetas y texto largo se ajustan al ancho; botones de 44 px, foco visible, orden de lectura natural, errores con alert y confirmación con status. Detalle muestra la versión congelada sin recálculo implícito ni FX actualizado.

La base de datos guarda versiones append-only separadas de Quote: sólo compra, sin margen comercial inventado. La migración se valida en PostgreSQL desechable antes de proponer su aplicación remota. Los wireframes inferiores describen la captura original; la indicación de no persistencia corresponde únicamente a esa primera entrega.

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
