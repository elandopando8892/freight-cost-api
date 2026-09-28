# Sprint 17 — expediente público de investigación de llantas

Modelo recomendado: GPT-6 Sol; esfuerzo medio. Objetivo: que la pantalla explique por qué el benchmark público todavía no puede producir un CVU defendible ni un expediente de calibración.

## Evidencia disponible

- El paquete fechado `FCM_TIRE_LIFECYCLE_SOURCES_2026-09-27.json` conserva dos precios de llanta nueva, un rango de renovado, discrepancias de identidad y siete evidencias pendientes. Sus precios son observaciones históricas; no se afirman vigentes el 28 de septiembre.
- La ficha del fabricante RM185 confirma medida 11R22.5 y rangos G/H. La guía de aplicaciones 2024 ubica RM275 11R22.5 H en posición de tracción para larga distancia. La descripción del vendedor del paquete no coincide plenamente con la del fabricante; permanece sin resolver.
- La página pública de Renovadora de Pachuca muestra precios para 11R22.5, pero no define si incluyen carcasa, impuestos ni montaje. Su contenido accesible al verificador estaba indexado hace meses, por lo que requiere reconfirmación comercial.
- Las dos URL de producto de Eurotyres del paquete no respondieron al verificador en esta fecha. Un catálogo indexado recientemente muestra RM185 11R22.5 a $5,727.92, pero eso no sustituye una comprobación de precio y condiciones de venta vigentes. RM275 no se pudo reconfirmar.
- No se encontró en este paquete kilometraje de primera vida y renovados observado para una cohorte comparable de XBF, ni costo entregado e instalado por posición. Las afirmaciones generales de fabricante sobre renovado no sustituyen ese dato.

Fuentes revisadas: [RM185 fabricante](https://www.roadmastertires.com/on/demandware.static/-/Sites-goodyear-master-catalog/default/dwe2635e8e/pdf/product-specifications/roadmaster/RM185.pdf), [guía Roadmaster 2024](https://www.roadmastertires.com/on/demandware.static/-/Sites-Roadmaster-Library/default/dw1b2979bb/pdf/addtional-resources/Roadmaster-Commercial-Product-Application-Guide_2024.pdf), [Renovadora de Pachuca](https://www.renovadoradepachuca.com/routeway), [catálogo Eurotyres](https://eurotyres.mx/collections/llantas-camion?page=2).

## Producto entregado

La pantalla `Calibración de llantas` agrega un expediente **de investigación** de sólo lectura con tres observaciones, enlaces a fuentes, fecha de captura y las siete piezas faltantes. Se alimenta del paquete JSON versionado. Mantiene separado el inventario de expedientes de **calibración** persistidos: el primero no incrementa el conteo del segundo. [Wireframe](design/tire-public-research-wireframe.md).

## Límite metodológico

La salida utilizable exige identidad y posición aprobadas, costo instalado completo, ciclos cerrados medidos, inspección de carcasa y etapas renovadas comparables. Hasta entonces: `adoptedParameterCount=0`, sin propuesta económica, CFU/CVU nuevo, activación de base ni cotización elegible por estos precios. La interfaz presenta valores de catálogo como históricos y bloqueados para adopción.

## Verificación y rollback

Typecheck web, siete pruebas existentes de workbench y build Next pasaron. El cambio sólo agrega una sección de lectura a la página; quitar el componente y el prop `researchPanel` revierte la UI sin migración ni cambio de datos. La validación visual y, si se despliega, la identidad exacta del preview se registran a continuación.
