# Bases de costo por segmento operativo

Estado: implementación local en `codex/quote-integrity-sprint`; migración aditiva pendiente de cualquier entorno remoto. No se crearon bases en un tenant. Modelo recomendado para esta implementación: Astra, esfuerzo alto. La UI estructurada no llama al consultor de IA automáticamente.

## Objetivo y frontera de cálculo

Una base tiene `scope` amplio, segmento opcional y versiones de supuestos. El segmento se asigna al crear una base y no se puede editar para reinterpretar cotizaciones históricas. Las bases anteriores mantienen `operationalSegment = null` y aparecen como “Sin clasificar · base histórica”. Varias bases pueden compartir alcance; sigue existiendo una sola predeterminada por alcance al activar. En la cotización, el usuario elige la base concreta.

| Segmento | Estado V3 | Base inicial | Motivo |
| --- | --- | --- | --- |
| D2D propio en MX y EE. UU. con mismo tractor | Configurable | STD-XB | Ambos tramos consumen costos operativos propios |
| D2D línea MX → socio US | Pendiente | Ninguna | Falta tarifa del tercero y contrato de intercambio |
| D2D línea US → socio MX | Pendiente | Ninguna | Falta tarifa del tercero y contrato de intercambio |
| D2D con transbordo | Pendiente | Ninguna | Faltan maniobras, espera, ubicación y riesgo |
| MX Drayage | Pendiente | Ninguna | El Drayage actual es estadounidense |
| FTL Intra-México | Configurable | STD-MX | Motor mexicano doméstico |
| MX Locales | Configurable | STD-LOC | Motor local con tractocamión |
| FTL Intra-EE. UU. | Configurable | STD-US | Motor estadounidense doméstico |
| US Drayage | Configurable | STD-DRY | Ciclo con chasis en EE. UU. |

“D2D propio” no certifica una estructura legal binacional: confirma únicamente que el modelo actual calcula ambos tramos con costos propios y `THROUGH_TRACTOR`. Si cada entidad necesita margen, FX o liquidación propios, requiere contrato y cálculo adicional. No usar STD-XB para tarifas de socios o transbordo. Los cuatro segmentos pendientes permanecen visibles como información y el servidor rechaza su creación tipada; escribir otro `scope` no los habilita.

## Wireframe

```text
┌ Bases por segmento operativo ────────────────────────────┐
│ [D2D propio MX+US] [Intra-MX] [MX Locales]              │
│ [Intra-US]        [US Drayage]                           │
│ Elegir → estándar + perfil + código en borrador         │
│ ▸ Modalidades que requieren modelo adicional (4)        │
│   MX→socio US | US→socio MX | transbordo | MX Drayage   │
└───────────────────────────────────────────────────────────┘
┌ Borrador editable: base / versión / supuestos ───────────┐
│ Crear base y revisar supuestos → publicar → activar      │
└───────────────────────────────────────────────────────────┘
```

La API añade `GET /cost-bases/operational-segments` para usuarios autenticados y acepta `operationalSegment` opcional en `POST /cost-bases`. El campo se persiste en `CostBase`; el audit de creación conserva el `presetId` existente. No se modifican las fórmulas, el motor ni los snapshots históricos. La migración `20260922000200_cost_base_operational_segment` añade sólo columna nullable e índice por organización/segmento/estado. Rollback de código: revertir API/web al commit anterior. Conservar la columna y los datos hasta un rollback de esquema autorizado; el frontend anterior ignora el campo.

## Evidencia local de validación

- API: 514 pruebas aprobadas, 2 omisiones existentes; `tsc --noEmit` aprobado.
- Web: 14 pruebas aprobadas, lint, `tsc --noEmit` y build Next.js aprobados.
- PostgreSQL desechable: 39 migraciones aplicadas; la nueva columna resultó nullable. El contenedor se eliminó tras la prueba.
- Fixture aislado de la pantalla: selección y modalidades pendientes visibles en escritorio y a 390 px; `scrollWidth = clientWidth = 370` dentro del iframe móvil. No incluye el shell autenticado ni prueba una creación persistida de punta a punta.

Antes de liberar en preview: desplegar API y web del mismo commit, aplicar la migración de modo controlado, verificar la ruta de catálogo con usuario autorizado, crear una base sintética por segmento soportado, confirmar `operationalSegment` persistido y su versión de supuestos, y probar selección de base y cálculo sin publicar tarifas. Nada de esto se ha ejecutado en un entorno remoto.

Pendiente de producto: definir cómo se captura costo de terceros (tarifa, moneda, vigencia, recargos, demoras y responsabilidad por tramo); para transbordo, evento/ubicación/maniobra; para MX Drayage, ciclo y activos locales. Cada uno exige fixtures económicos propios, pruebas de autorización y revisión humana antes de habilitarlo.
