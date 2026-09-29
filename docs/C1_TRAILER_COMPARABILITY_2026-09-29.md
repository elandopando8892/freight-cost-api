# Contraste de vendedores y comparabilidad: caja seca usada

Consulta 2026-09-29; base Git `9a72c3a9cc29f36c0ea76cbbb72f0c60d1a4b97f`, rama `codex/cost-tires-release-s14`, worktree limpio en D:. Recomendación: Luna alto para recopilación; Astra alto para comparabilidad. No hubo cambio de modelo ni delegación. Solo investigación documental.

Referencia previa: FE stock 444831, Stoughton 2014, 53×102, swing, air ride, compra USD 13,500; observación documentada en [precios públicos](C1_TRAILER_PUBLIC_PRICES_2026-09-29.md), no revalidada en este corte.

## Segundo vendedor: River-Roads

[Inventario primario](https://listing.river-roads.com/inventory/?/listings/stoughton-dry-van-trailers-semi-trailers-for-sale-in-illinois/?Category=15022&Manufacturer=STOUGHTON&State=ILLINOIS&dlr=1&dscompanyid=10922&settingscrmid=358201), consultado hoy, actualización declarada 15 septiembre 2026, Granite City IL.

| Stock | Configuración | Precio anunciado USD/unidad | Decisión |
| --- | --- | --- | --- |
| 763678–763696 | Stoughton 2014, 53×102, air ride, roll-up | 8,950 | Excluir de cohorte swing: puerta distinta |
| 2501 | Stoughton Z-Plate 2016, 53 ft, swing, air ride | 12,500 | Comparación secundaria; dos años más nuevo, composición/accesorios y estado pendientes |
| 902 | Stoughton Z-Plate 2017, 53 ft, swing, air ride | 13,500 | Comparación secundaria; tres años más nuevo |

No se cuentan los ocho equipos del primer anuncio como ocho observaciones verificadas. No se infiere un descuento causal por tipo de puerta o edad. Los precios son de oferta, no ventas realizadas. Impuestos, entrega y acondicionamiento no están conciliados. El precio de otra cohorte no valida el valor de FE.

## Tercer vendedor: East Coast Trailer

[Inventario primario](https://www.ectrailer.com/inventory/?/listings/for-sale/stoughton/dry-van-trailers-semi-trailers/15022?dlr=1&dscompanyid=8406&settingscrmid=362295). La búsqueda sugería equipo 2014, pero la página abierta presenta dos anuncios 2002 de USD 5,950: uno para almacenamiento y otro de 53×102, swing/air ride, descrito para recorridos locales. Excluir ambos de la cohorte objetivo por edad y uso; no presentar snippets antiguos como inventario actual.

## Resultado y decisiones para FCM

La segunda fuente independiente se revisó, pero no se obtuvo aún un par estrictamente equivalente en año, configuración, condición y términos. Los comparables secundarios no forman un rango calibrado. No calcular media ni adoptar residual con estas observaciones.

Reglas de aceptación documental para el siguiente candidato:

1. Misma familia de activo: dry van 53×102, swing, air ride; distinguir plate/composite/aluminio, piso, neumáticos y accesorios.
2. Cohorte de edad explícita; no aplicar ajuste monetario por edad sin evidencia que lo sostenga.
3. Estado y uso: carretera vs local vs almacenamiento; inspección, reparaciones, condición de piso/llantas y exclusiones identificadas.
4. Compra separada de renta; USD explícito o marcado como inferido; precio de oferta separado del puesto en servicio.
5. Stock/VIN y vendedor para deduplicar; fecha de consulta separada de fecha de anuncio y vigencia.
6. Permiso de intercambio/uso MX, costos de traslado e impuestos pendientes de sustento antes de representar D2D real.

Una diferencia entre precio nuevo actual y usado actual NO representa depreciación longitudinal ni residual futuro del mismo activo. El CFU requiere valor inicial, residual a horizonte definido, plazo y financiamiento compatibles; siguen pendientes. El catálogo de ofertas por sí solo no cierra COST_CAPITAL, UTILIZATION ni el inventario general.

## Continuidad, evidencia y rollback

Siguiente actividad: buscar evidencia pública de vida económica/residual y revisar su aplicación a la cohorte, en vez de seguir ampliando ofertas heterogéneas. Si no existe respaldo comparable, conservar esos parámetros sin valor adoptado y trabajar escenarios explícitos, no defaults ocultos.

Dos sitios primarios abiertos, decisiones de inclusión/exclusión documentadas. Sin cambios de código: no se ejecutaron pruebas de software. git diff --check; sin mutaciones de datos, Preview, Auth o infraestructura. Ninguna cotización generada. Rollback: revertir únicamente el commit documental. No se requiere wireframe porque no cambió UI.
