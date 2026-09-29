# Caja seca: observaciones públicas de compra y arrendamiento

Consulta: 2026-09-29. Inicio Git `6357aea94e05b2fe891e3d87809fafd53562fc38`, rama `codex/cost-tires-release-s14`, worktree limpio en D:. Investigación documental, sin adoptar parámetros. Recomendación: Luna alto para extracción y Astra alto para comparabilidad; no se cambió modelo ni se delegó.

## Observaciones de vendedores primarios

| ID | Equipo/condición | Oferta observada | Unidad y moneda | Plazo/localización | Estado |
| --- | --- | --- | --- | --- | --- |
| FE-444831-BUY | Stoughton 2014, 53×102, swing, air ride, food grade | 13,500 | USD/unidad | Knoxville TN; compra | Precio anunciado, no transacción |
| FE-444831-LEASE | Mismo equipo, stock 444831 | 395–450 | USD/mes | Arrendamiento 12 meses | Inclusiones no determinadas |
| FE-459106-LEASE | Great Dane 2015, 53×102, swing, air ride, food grade | 475–595 | USD/mes | 12 meses, Knoxville TN | Inclusiones no determinadas |
| FE-003490-LEASE | Vanguard 2020, 53×102, swing, air ride | 555–655 | USD/mes | 12 meses, Knoxville TN | Inclusiones no determinadas |
| PT-12M | Caja seca; año/unidad no identificados en plan | desde 669 | $/mes; USD inferido por mercado estadounidense | 12 meses | Precio mínimo promocional, no comparable por edad |
| PT-MONTHLY | Caja seca; año/unidad no identificados | desde 675 | $/mes; USD inferido | 1–12 meses | No confundir con plan cancelable |
| PT-CANCELABLE | Caja seca; año/unidad no identificados | desde 1,034 | $/mes; USD inferido | Mes a mes hasta cancelar | Plazo diferente |
| NH-TVGTDVFTL | Vanguard VXP nuevo 2027; 53×102, tandem, air ride, swing | 39,900 | $/unidad; USD inferido | Fort Lauderdale FL | Discrepancia con tarjeta de portada; no adoptar |

### FE: fuente y alcance

[FE Trailer Sales, inventario de renta](https://www.fetrailersales.com/inventory/?/listings/for-rent/dry-van-trailers-semi-trailers/15022?dlr=1&accountcrmid=362476&settingscrmid=9109087). Localizadores: stocks 444831, 459106 y 003490. Actualizaciones declaradas: 27 y 28 agosto, y 21 septiembre 2026, respectivamente. Los rangos no son intervalos estadísticos. Compra/renta del mismo stock no son dos activos independientes. Impuestos, entrega, seguro, mantenimiento y disponibilidad necesitan confirmación documental; no suponer que faltante significa incluido o cero.

### Pulltail: fuente e inclusiones

[Pulltail, Pricing](https://www.pulltail.com/pricing), bloques Standard 1-year, Monthly y Month-to-month. Publica mantenimiento, registro e instalación incluidos, millaje ilimitado, depósito de $1,000 y programa de reemplazo de llantas. La mención de seguro no demuestra prima incluida; un programa de llantas tampoco significa reemplazo ilimitado sin condiciones. No escribir ceros de mantenimiento/llantas hasta delimitar coberturas y daños. El depósito se conserva separado: no es automáticamente gasto mensual. Fecha de publicación/vigencia no mostrada; consulta no equivale a validez contractual. No se inició solicitud.

### Nationwide: conflicto retenido, no conciliado por suposición

[Portada](https://www.nationwidehaul.com/) muestra 2026/$35,994; [ficha enlazada del stock TVGTDVFTL](https://inventory.nationwidehaul.com/inventory/?/listing/for-sale/245869363/2026-vanguard-vxp-dry-van-trailers-semi-trailers?dlr=1&bgn=Nationwide+Haul+Web&settingscrmid=16824364) muestra 2027/$39,900. La URL conserva 2026, pero el campo Year dice 2027. La ficha excluye FET e indica posible cargo de entrega. No añadir tasa fiscal sin revisión ni tomar el precio como costo puesto en México. Se conserva como observación conflictiva, no como precio calibrado.

## Qué sí aporta al motor

- OWNED: el precio de compra es candidato para el valor del activo, no para monthlyFixedUsd. Aún faltan costos de puesta en servicio, residual, vida/plazo y costo financiero, además de costos recurrentes asignables.
- LEASED: la renta publicada es candidata al componente de renta mensual, no prueba del costo fijo completo. Faltan vigencia, configuración exacta, coberturas y gastos excluidos.
- Ninguna oferta demuestra permiso/cobertura de uso en México, intercambio con otra línea, utilización mensual del remolque ni tiempos de viaje. Es evidencia de mercado US, no calibración D2D MX/US.
- No promediar compra nueva y usada; tampoco planes por plazo ni tres stocks de un vendedor como si fueran tres fuentes independientes. No convertir rangos publicitarios en percentiles.

## Avance y siguiente paso

Se obtuvieron cuatro observaciones de activos identificados (un stock con compra/renta, otros dos de renta y uno nuevo conflictivo), más tres planes de un proveedor sin unidad identificada. Cero adoptadas. No se completaron los cinco inputs económicos/productivos ni se cerró C1.

Siguiente trabajo: contrastar el mismo grupo de edad/configuración con otro vendedor primario y documentar costos excluidos/residual antes de derivar fijo mensual. Mantener la investigación pública; no exigir datos privados de XBF. Las ofertas son puntos de partida verificables, no recomendación de compra ni autorización de contratación.

## Validación y rollback

Lectura actual de páginas primarias, stock/plazo/unidad contrastados, discrepancia registrada. Solo documentación: no se ejecutaron pruebas de software ni se reclaman las 84 previas como validación económica. git diff --check. Sin cambios de UI, Preview, Auth, infraestructura o datos. Rollback: revertir únicamente este commit documental.
