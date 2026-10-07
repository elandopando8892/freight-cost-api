# B2 · capital usado MX y misma caja: contraste de mercado

Corte 2026-10-01. Worktree físico `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. Entrega local de investigación/integración al reporte, no calibración, compra o cotización.

## Antes / ahora / alcance de cierre

Antes: una oferta de caja 2021 sin comparable MX de menor año-modelo y una oferta de tractor MX sin curva usada admisible. Ahora: **un contraste de caja con especificaciones publicadas coincidentes** y rechazo documentado de la aparente comparación de tractores. Ambos están relacionados con las partidas de capital en el [reporte consolidado](B2_BINATIONAL_REFERENCE_BUDGET_EXPOSURE_2026-10-01.md) y en su CLI existente.

Se completa la revisión de estos comparables, **no las dos partidas de capital**. No existe aún residual neto/vida restante/financiamiento sustentados. Las diez partidas del presupuesto completo siguen sin importe elegible y B2 continúa parcial. No se declara avance porcentual por contar anuncios ni se requiere contabilidad privada XBF.

## Benchmark previo y elección

| Alternativa | Ajuste y riesgo | Decisión |
|---|---|---|
| Importar depreciación fiscal, vida de nuevo o ANL US | Bajo esfuerzo; no acredita vida del usado MX/caja ni su mercado | Rechazada; reutilizar revisión IMT/SEC ya documentada, sin repetirla |
| Comparar ofertas públicas MX del mismo vendedor y especificaciones | Sin costo recurrente ni dependencia nueva; permite medir diferencias de precios y detectar incompatibilidades | Recomendada como contraste parcial, no curva longitudinal |
| Adoptar directamente precio de reventa, intereses cero y horizonte genérico | Completaría artificialmente el presupuesto; contradice las inclusiones y supuestos pendientes | Rechazada |

Objetivo verificable: referenciar precios/moneda/especificaciones del producto exacto, expresar el cálculo admisible y el no admisible, enlazarlo a las dos partidas sin alterar sus importes. Flujo local: expediente → CLI de consolidación → revisión de cifras y limitaciones. Sin pantalla nueva; la etapa SaaS conserva su wireframe MARKSMAN obligatorio. Arquitectura, contratos USD del motor, fuente de verdad del presupuesto y reglas CFU no se modifican.

## Caja seca · comparación primaria

| Campo | [Utility 2021](https://www.remolquesythermos.mx/product-page/2021-utility-4000-d-x-68-000-lbs-53-x102-caja-seca) | [Utility 2019](https://www.remolquesythermos.mx/product-page/2019-utility-4000-d-x-68-000-lbs-53-x102-caja-seca) |
|---|---|---|
| Vendedor / modelo | Remolques y Thermos / 4000 D-X | Igual |
| Configuración publicada | Caja seca 53′ × 102″, 68,000 lb, neumática, puerta de libro, techo aluminio, rin acero 22.5 | Igual |
| Precio de oferta MXN | 630,000 | 540,000 |
| Precio lista MXN | 680,000 | 590,000 |
| IVA | Expresamente +IVA | Tratamiento no establecido en el producto revisado |
| Inventario anunciado | 2 unidades | 3 unidades |

Los conteos no son VINs observados, tamaño de muestra estadística ni cantidades del piloto. No se multiplica el precio por el inventario. Se comparan ofertas vigentes observadas, no compras o una misma caja seguida en el tiempo.

La diferencia aritmética de precios publicados es **MXN 90,000**. El precio del grupo 2019 representa 6/7 = 85.7143% del grupo 2021. Si se usa la separación de dos años-modelo como analogía de una ventana de 24 meses, la diferencia equivale a **MXN 3,750/mes**. Es sólo un contraste aritmético: **no depreciación económica mensual demostrada, residual previsto o vida remanente**.

La compatibilidad fiscal está pendiente. El modelo condicional exige declarar precios comparables, analogía temporal, condición terminal y mercado futuro; no se eligen estos supuestos silenciosamente. Para mostrar qué falta sin dejarlo en cero:

```text
C_caja_MXN_condicional = 3750
  + (ajuste_adquisición_MXN - ajuste_reventa_futura_y_base_fiscal_MXN
     + gastos_disposición_MXN) / 24
  + intereses_mes_MXN
```

24 no se adopta como vida/horizonte de la caja y 540,000 no se adopta como residual futuro. Tampoco se presume que el IVA sea recuperable, se inventa su tasa ni se realiza FX. La exposición propia de la caja sigue pendiente; este importe no se transforma en CFU ni se añade dos veces por los tramos MX/US. No es límite inferior/superior ni intervalo estadístico: cambios de condición, mercado y ajustes pueden alterar el resultado en ambos sentidos.

## Tractor MX · comparación descartada con razones concretas

Las fichas del mismo vendedor de [Cascadia 2021](https://www.remolquesythermos.mx/product-page/2021-freightliner-cascadia-72-detroit-dd15-tractocami%C3%B3n) y [Cascadia 2018](https://www.remolquesythermos.mx/product-page/2018-freightliner-cascadia-72-detroit-dd15-tractocami%C3%B3n) comparten DD15/camarote 72″, pero difieren en diferencial (46,000/40,000 lb), relación (3.42/3.73), rodado y detalle de transmisión. El más antiguo publica menor kilometraje promedio, no una trayectoria de uso adicional. Su diferencia de precio no identifica el efecto puro de edad.

Además, el [RODAL 2021 del expediente original](https://rodaltruckfinancials.com/catalogo/freightliner-cascadia-2021--vhc-f8668c8f02) es manual de 18 velocidades; el comparable 2021 del otro vendedor es automático DT12. No se reemplaza el tractor ni se aplica un coeficiente de esos anuncios al precio RODAL. **No se calcula mensualidad de depreciación MX por esa pareja.**

La metodología previa de [capital usado](B1_USED_CAPITAL_LIFECYCLE_2026-09-29.md) ya distingue precio de mercado, residual neto, horizonte desde adquisición y vida de equipos nuevos. Se conserva; no se repite investigación genérica de vidas contables para justificar un valor aquí.

## Implementación y validación

El [expediente JSON](B2_MX_USED_MARKET_COMPARABILITY_2026-10-01.json) conserva cinco fichas primarias, tres capturas HTML nuevas y dos originales reutilizados, con hashes; revisión externa de los cinco productos documentada. Tres expedientes anteriores permanecen fijados e intactos. El CLI ahora valida ocho JSON de entrada y las cinco capturas de esta revisión; cualquier alteración produce error de integridad. Esto acredita la instantánea local, no vigencia automática futura.

Cambios mínimos: un expediente y test nuevos, más la extensión del script de consolidación **existente** y sus referencias de dos filas. No hay nuevo motor, contrato monetario, dependencia, infraestructura, persistencia o API. La aritmética queda bajo `supportingMxUsedCapital`, nunca dentro de `authoritativeBudget`.

**39/39 pruebas dirigidas PASS**: 17 del nuevo contraste y 22 de consolidación. Incluyen integridad de fuentes, asociación precio/moneda con el producto exacto (no recomendaciones), unidades/cantidad, incompatibilidad fiscal, rechazo de tractores no comparables, ausencia de FX/adopción y salidas completas nulas. Dos primeros checks detectaron URL acentuada vs codificada; se corrigió la normalización con `URL.href` manteniendo identidad exacta, no relajando la validación de precio. Typecheck estricto ESNext/Bundler PASS.

Readback CLI: exit 2 intencional por referencia incompleta, ocho pins, diferencia 90,000 y equivalente aritmético 3,750; **15 condiciones del presupuesto, cero importes completos/adopciones y CFU/CVU nulos**. Suma condicional US anterior permanece sin cambio. La guía de pruebas concentró la verificación en integridad, inclusiones y no promover fragmentos a costos; no se repitieron builds generales ni pruebas de UI sin cambio.

Reproducción, desde la raíz física del worktree:

```powershell
& 'C:\Users\andre\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules/tsx/dist/cli.mjs apps/api/scripts/consolidate-binational-reference-budget.ts
```

No hay recorrido autenticado, guardado de base/cotización, utilización comercial ni despliegue nuevos. Las lecturas públicas reales son evidencia de productos/precios, no prueba operativa del motor.

## Siguiente paso y decisión

No declarar terminados capital, B2 ni el MVP con estas referencias. Para avanzar en términos de capital sin otra ronda genérica de anuncios, separar **escenario de contado y escenario financiado**, o sólo financiado, según la elección solicitada al usuario. Es una decisión de modelo, no solicitud de datos privados ni contratación. Propiedad de los equipos no prueba deuda cero. El benchmark de intereses debe distinguir tasa/fees/principal de interés económico y sus supuestos; tampoco resolvería por sí mismo residual, condición o base fiscal.

Los demás términos siguen priorizados dentro del presupuesto fijo: seguros/permisos compatibles y un único fondo de administración/empresa; luego exposición/ciclo y variables del caso. Si la evidencia no permite una calibración puntual, se propondrá un escenario/rango **con supuestos explícitos**, separado de la adopción y de una cotización aprobada. No activar bases o fijar ceros para saltar condiciones. Fecha de servicio aún pendiente para revisar vigencias.

Modelos recomendados por actividad: **GPT-6.1 Sol · alto** en comparabilidad económica/modelo; **GPT-6.1 Sol · medio** en captura y pruebas dirigidas. Selector y consumo no comprobados; ningún cambio de modelo ni agentes efectuado.

## Rollback

Retirar sólo este MD/JSON, `apps/api/tests/benchmark-mx-used-market.test.ts`, las tres capturas `*_MARKET_REVIEW_20261001.html` incorporadas aquí y los añadidos de este corte al script: pin `mxUsedMarket`, lectura/verificación/cálculo, bloque `supportingMxUsedCapital` y referencias de las dos filas. Retirar sólo los párrafos nuevos de plan/estado. Mantener las capturas anteriores, el presupuesto, las funciones del motor y todo trabajo ajeno. No ejecutar reset ni limpieza global.

Sin cambios de DB/Neon/Auth/usuarios/infraestructura/producción, negocios ni IA de la aplicación. Sin contacto, compra o habilitación de proveedor; no hay rollback externo.
