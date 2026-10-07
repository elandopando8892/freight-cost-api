# B1→B2 · overhead y exposición: familias y control de asignación

Corte 29 sep 2026 · D: · rama `codex/cost-tires-release-s14` · HEAD `4f5fc2d`. [Expediente JSON](B1_OVERHEAD_EXPOSURE_BRIDGE_2026-09-29.json). Piloto D2D caja seca MX→US con dos carriers e intercambio, sin transbordo; referencia pública, no contabilidad privada XBF.

## Resultado de negocio

Se relacionaron los **23 conceptos Qty×PU / 46 claves de COST_COMPANY** con sus familias y exclusiones. Se reforzó el auditor económico **local** existente: overhead agregado y exposición deben compartir periodo, y los días-vehículo no pueden exceder el calendario de ese mes. No se creó otro motor ni se rellenaron conceptos con ceros/promedios. La fórmula activa de cotización no cambió.

La evidencia permite contrastes parciales, **no un fijo completo por vehículo**. B1/E1 abiertos, 135/135 claves documentadas, 3 candidatos / 47 contrastes / 85 faltantes, cero adopciones y 0/4 gates. No se exige conseguir facturas XBF: el objetivo sigue siendo una base pública modelada. Cada hipótesis necesitará justificación y revisión antes de adoptar, no una etiqueta de “aprobado” enviada por el cliente.

## Adoptar / adaptar / rechazar

- **Reutilizar** ADR-007 y el contrato local de nómina/capital: ya admite administración y corporativo conjuntos. No implementar un segundo contrato equivalente.
- **Adaptar**, sólo en investigación local, la validación de periodo mensual y capacidad calendárica. Antes aceptaba overhead de otro periodo y hasta 31 días por vehículo en cualquier mes.
- **Rechazar** “otros gastos = overhead fijo”, distribución arbitraria de agregados en 46 claves y división de gastos EAT entre parque SICT o kilómetros ATRI/VIUS de otra cohorte.

## Fuentes y frontera de gasto

| Evidencia | Hallazgo verificado y uso |
| --- | --- |
| [INEGI CEAT2025](https://www.inegi.org.mx/contenidos/programas/eat/2018/doc/CEAT2025.pdf), pp.4–6 | Definiciones, no respuestas: K820 reúne comunicaciones; K590 excluye equipo de transporte; K060 mezcla primas vehiculares/inmuebles; K999 contiene servicios varios y excluye remuneraciones, gastos financieros e impuestos. J000 es remuneración dependiente; K000 excluye compra/depreciación de activos. |
| [EAT 2024/4841, extracción previa](B1_INEGI_EAT_2024_4841_COST_OBSERVATIONS_2026-09-29.json) | Electricidad + renta no vehicular + publicidad + comunicaciones suman **4,468,461 miles MXN**, 3.129237% de bienes/servicios. Son sólo cuatro rubros nacionales; no overhead completo, costo fijo de oficina probado ni tasa del piloto. Se reutiliza la captura documentada del 29 sep; el tabulado no se refrescó en este corte. |
| [ATRI 2025](https://truckingresearch.org/wp-content/uploads/2025/07/ATRI-Operational-Costs-of-Trucking-07-2025.pdf), fig.27 p.53/PDF56 | Caja seca: ingreso 3.015 USD/milla; “other costs” 28.5% del ingreso, equivalente aritmético 0.859275 USD/milla. Etiquetas redondeadas; pérdida 2.3% dibujada aparte. No identifica todas las familias, no se infiere total desde el gráfico ni se adopta como CFU. Km/días nacionales publicados son otra cohorte. |
| [Heartland 10-K 2025](https://www.sec.gov/Archives/edgar/data/799233/000079923326000006/htld-20251231.htm), resultados pp.36–37 y estados p.55 | Miles USD consolidados: salarios/prestaciones 329,158; comunicaciones/servicios 8,552; otros gastos operativos 45,662. Salarios mezclan conductor/oficina/taller; publicidad ya está en “otros”. Carrier principalmente caja seca, consolidación US y servicios MX: no costo administrativo unitario separado ni denominador de oficina comparable. |
| [IMT PT630](https://www.imt.mx/archivos/Publicaciones/PublicacionTecnica/pt630.pdf), p.18/PDF34 | Comunicación: 3,000 MXN/mes produce 36,000/año, no 79,200 impreso. Administración: 4,000/mes y 48,000/año; 1,728 viajes dice “al mes”, pero 27.77/viaje requiere tratarlos como anuales. Se conservan ambas interpretaciones; no se corrige el PDF ni se adopta el caso histórico. |

Las tres páginas críticas (CEAT5, ATRI56 e IMT34) se inspeccionaron visualmente. PDF/hash/localizadores en JSON; Heartland leído directamente en SEC. Disponibilidad del lector web no es verificación de frescura: EAT usa captura previa del mismo día y los dos informes históricos usan PDFs previamente descargados, reverificados localmente. No hubo formularios, DB, credenciales ni datos privados.

## Relación de los 23 conceptos con el inventario

El JSON contiene una fila por par **Qty/PU**, sin valores ni asignaciones artificiales. Este cruce es interpretación documentada, no equivalencia estadística uno-a-uno.

| Conceptos de COST_COMPANY | Fuente/definición útil | Qué falta / solape a resolver |
| --- | --- | --- |
| Agua, Luz | K412 para luz; agua sin apertura independiente | Oficina frente a otros usos; cantidad de instalaciones y tarifa no inferidas del sector |
| Telefonía fija, celular, internet | K820, agregado | Un paquete no se carga tres veces; separar operador y back office |
| Renta patio | K590, agregado no vehicular | Patio doméstico vs renta de vehículo vs patio de cruce |
| Software, subscriptions | Sin importe público separado aquí | TMS/GPS/licencias y suscripciones incluidos en paquetes |
| Capacitaciones, representación | Sin importe público separado aquí | Conteo de capacitación no es precio; no duplicar remuneración/venta/cruce |
| Útiles, imprenta | K200/K810, parciales | Material operativo o publicidad no equivale a papelería de oficina |
| Seguros otros | K060, parcial | Excluir póliza de flota y prestaciones; inmuebles no desagregados |
| Mant otros, Comb otros | K950/K421, parciales | Excluir mantenimiento/llantas/combustible del viaje ya incluidos |
| Depr otros, Depr equipos, Office equip | Fuera de K000 para depreciación; K590 si renta | No sumar compra, renta, depreciación y mantenimiento del mismo equipo |
| Gestorías, Legal | K620/K999, sin apertura suficiente | Permiso, trámite, rol administrativo y honorario no se suman automáticamente |
| Office Cleaning, Security | K999 parcial, no K610 por defecto | Servicios contratados vs personal suministrado/incluido en renta |
| Banking | Frontera L000, no K999 | Cargo administrativo vs financiación de activos/capital de trabajo/FX |

Los cuatro rubros EAT identificados **no sustituyen** nómina administrativa, seguros, capital, resto corporativo, gastos fiscales/financieros ni viajes. Los “otros” de ATRI tampoco se dividen por una flota mexicana. Un agregado puede cubrir varias familias sólo cuando su definición lo demuestra y éstas se cobran una vez.

## Cómo se asignará al viaje

Con gasto fijo mensual de flota `F`, km productivos totales de la misma flota/mes `K` y días-vehículo productivos `D`, el cálculo actual asigna:

`CFU = max(km totales del ciclo × F/K, días del ciclo × F/D)`.

No se suman los dos repartos: son alternativas para el mismo fijo. Overhead es una parte de `F`, no el total. Km cargados/vacíos deben estar explícitos; no añadir vacíos dos veces. El denominador `D` es tractor-días, no días laborales de empleados, horas del conductor o cantidad de tractores de cierre. Promediar un dato anual entre 12 es normalización contable, no prueba de producción mensual ni estacionalidad.

Control local añadido al contrato existente: periodo `YYYY-MM`; coincidencia del periodo de overhead con exposición; límite de flota × días reales del mes (incluye febrero bisiesto). Country/cohort/equipo, evidencia sólo contextual, inclusiones duplicadas y beneficios ya tenían controles y ahora se vuelven a probar con bloque conjunto. Resultado compatible sigue **UNVERIFIED**, sin CFU, CVU, compra/venta ni importes adoptados. Sin endpoint nuevo ni modificación de ruta/UI: wireframe no requerido en este corte; futuros cambios UI conservarán wireframes MARKSMAN.

## Salida pendiente y próximo corte acotado

La investigación de esta familia queda entregada con límites concretos. Faltan, para cada país, bloque administrativo/corporativo atribuible, exposición conjunta, perfil/tenencia/territorio y una revisión del supuesto modelado que podría usarse. No se abrirá otro sprint para buscar más índices genéricos.

**Siguiente corte: revisión de suficiencia del dossier B1 por bloque del piloto**, con una tabla única: utilizable como referencia modelada / sólo contraste / faltante; decisiones concretas para B2 y ruta de cierre del MVP. Si las fuentes no sustentan aún un rango numérico, se informa ese faltante; no se declara una cotización completa ni se pasa a producción.

Modelo recomendado único: **GPT-6.1 Sol · alto**, sin Astra; no se cambió automáticamente el selector. La guía de validación provocó el control de periodos/solapes; la guía PDF, la inspección visual de tablas/figura. Evidencia y rollback quedan en este expediente.

## Validación y rollback

Validación aprobada: **201/201 pruebas locales**, 34 nuevas del expediente/23 pares/fórmula y 16 adicionales del contrato, más regresiones; typecheck API y `git diff --check`. Se probó primero una expectativa incorrecta del test de equipo: el esquema lo rechaza antes del auditor; se corrigió la expectativa y se repitió el conjunto completo. No aceptación autenticada. Auditor canónico sin deriva: 135/135, 3/47/85, cero adopciones; SHA registro `a31864f52ce5cd3d9f111056ec4dc58181587e99258614f1e2636e61ff992f0a`, requisitos `9c8510de32dbdd8a9a86f99f571f1e41171f683ce005106eeb26fbae1e46001d`. Plantilla B2 se conserva sin importes con SHA `cabfda00873356406d838306bfa87b912eccd9a6026449c0ebb26046acd8bd85`.

Rollback: retirar sólo el JSON/MD y prueba documental nuevos; deshacer exclusivamente las adiciones de este corte en el auditor local y su prueba, y los textos añadidos/modificados del registro/plan/status. No revertir archivos completos: contienen trabajo anterior. Ninguna fórmula activa, DB/Neon, Auth, usuarios, infraestructura, deployment ni operación de negocio cambió. Scratch público conservado, no fuente activa del motor.
