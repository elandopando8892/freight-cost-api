# B2 — Desgaste bobtail MX: contraste público opcional

Fecha UTC: 2026-10-03. Workspace físico D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; rama codex/cost-tires-release-s14; HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd. Se conserva el trabajo ajeno. B2 sigue activo: este corte no entrega todavía el costo D2D completo.

## Antes y después

Antes, combustible y operador incluían todos los km MX, pero mantenimiento, lubricantes y llantas sólo los km con caja. El bobtail permanecía sin importe. Ahora existe una comparación monetaria opcional para ese faltante que se añade una sola vez a las 8 variantes de contado y 128 de financiamiento, cada una con 2 alternativas de seguro de caja. No se alteran CFU, capacidad, reloj operativo, capital, US, caja ni administración.

La sensibilidad usa un C3 rígido no articulado: **no es el Cascadia DD15 del piloto**. Su carrocería propia, configuración cargada, potencia, edad, peso y ciclo de llantas no están conciliados con el tractor bobtail. No se conoce el sentido del sesgo. No es un límite inferior ni calibración. El valor real tractor-only permanece null, también cuando se calcula esta alternativa.

## Benchmark y decisión

Se reutilizó el PDF primario ya archivado del [IMT, Publicación Técnica 881](https://imt.mx/archivos/Publicaciones/PublicacionTecnica/pt881.pdf), SHA256 816728964103158f0a99f44c41bbe5d2bb7240c33e35651fcbd90c0b391412f4. Se inspeccionaron visualmente las páginas completas 47–48 y 63 del PDF: tablas 3.25 y 4.4, páginas impresas 37–38 y 53. La skill PDF ayudó a comprobar identidad, unidades y límites del vehículo, no sólo a extraer cifras.

| Enfoque | Evidencia y ajuste | Decisión |
| --- | --- | --- |
| C3 no articulado IMT 2025 | Cuatro gastos monetarios publicados, sin semirremolque; vehículo rígido y carga distintos del piloto | Adaptar únicamente como sensibilidad identificada; sin afirmar compatibilidad |
| Dividir el T3S2 50/50 o por número de llantas | El conjunto incluye tractor y caja; no existe reparto publicado compatible para los cuatro gastos | Rechazar; no construir un precio tractor-only de esa división |
| Modelo histórico estadounidense de tractor separado | [UGPTI/NDSU, Truck Costing Model 2003](https://www.ugpti.org/resources/reports/downloads/mpc03-152.pdf): método separable, precios y configuración antiguos | Rechazar sus importes para este caso; no inventar actualización por inflación ni tipos de cambio históricos |

La suma de los gastos impresos seleccionados es 3,380.23 MXN/1,000 vehículo-km: trabajo de mantenimiento 820.06, partes 1,696.51, lubricantes 172.97 y llantas 690.69. No se reconstruyen gastos multiplicando cantidades y precios redondeados. Se excluyen combustible, operador, depreciación, interés y gastos generales de esa tabla: ya tienen tratamiento independiente.

La carrocería rígida incluida en C3 no puede separarse: ausencia de semirremolque no demuestra un costo tractor-only compatible. No se incorporan sus equivalentes de llantas al contrato canónico de vida útil. No se añade otra caja del piloto.

## Reproducción y resultados

Contrato: quinta opción `IMT_C3_NON_ARTICULATED_PROXY` de `consolidateBinationalReferenceBudget`; requiere cuarta opción `PUBLIC_LINK_FORECAST` y tercera `POSTAL_REFERENCE`. La quinta opción predeterminada `UNPRICED` conserva los importes previos y la incógnita, sin convertirla en cero. La salida nueva es `supportingMxBobtailWearReference`.

Desde el workspace, usando el Node disponible y `tsx` instalado:

```powershell
& 'C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' --import tsx -e "const {consolidateBinationalReferenceBudget:run}=require('./apps/api/scripts/consolidate-binational-reference-budget.ts'); console.log(JSON.stringify(run(undefined,undefined,'POSTAL_REFERENCE','PUBLIC_LINK_FORECAST','IMT_C3_NON_ARTICULATED_PROXY').supportingMxBobtailWearReference,null,2))"
```

Fórmula: `km bobtail MX × 3.38023 MXN/km ÷ 18.3688 MXN/USD`. FIX de determinación del 1/oct/2026; gastos netos del modelo 2025 transferidos sin inventar inflación, IVA recuperable o una cohorte conjunta. Los km son el pronóstico del enlace fronterizo, no recorridos gate-to-gate observados.

| Ciclo | Km bobtail | Adición condicional MXN | Adición condicional USD |
| --- | ---: | ---: | ---: |
| Red con vacío esperado | 100.67607992477375 | 340.3083056441179 | 18.526430994083334 |
| Retorno dedicado misma caja | 16.09344 | 54.3995286912 | 2.9615178286659987 |

Ejemplo de contado, capital NET_PLUS_VAT, pago MX RATE_EXCLUDES_WEEKLY_REST, patio NET_PLUS_VAT_RESERVE, alternativas de prima de caja LOW/HIGH:

| Ciclo | CVU conocido + sensibilidad | CFU conocido LOW/HIGH | Suma conocida + sensibilidad LOW/HIGH |
| --- | ---: | ---: | ---: |
| Red | 3,589.00831433379 | 984.469913373365 / 1,004.6713516075797 | 4,573.4782277071545 / 4,593.6796659413685 |
| Dedicado | 6,808.526579236404 | 2,242.439728442629 / 2,285.125937182836 | 9,050.966307679033 / 9,093.652516419239 |

Importes USD. **Son sumas parciales de componentes y una sensibilidad no compatible, no estimaciones D2D completas, límites, tarifas de compra o venta.** Los seis outputs completos de la raíz siguen null y los siete indicadores de cambios externos false. Cada variante alternativa de impuestos del patio recibe la misma adición variable y conserva su CFU, sin arrastrar totales anteriores como si fueran actuales.

## Verificación local y alcance

324 pruebas PASS en 6 archivos: bobtail (12), consolidado (237), enlace (13), variables (18), patio (10), mantenimiento/llantas (34). TypeScript estricto sobre módulo, consolidado y sus dos archivos de pruebas: PASS, modo ESNext/Bundler. Readback confirma 78 pins y fuente archivada; git diff --check PASS, con advertencias CRLF existentes.

Se conservaron los intentos fallidos: primera ejecución tuvo una expectativa incorrecta del identificador de error de hash y un suite que requería DATABASE_URL al importar Prisma; primera revisión de tipos utilizó NodeNext incompatible con import.meta del proyecto y detectó una propiedad sintética mal tipada en el test. Una reparación local ajustó el test y los comandos, no los datos ni Prisma. El segundo test usó una URL sintética al loopback puerto 1 sólo en el proceso, sin conectar, consultar ni modificar una base. Las pruebas invocan métodos puros; no prueban persistencia ni producción.

Incluye regresiones de doble aplicación, km solapados, fuentes alteradas, sumas, identidad de escenarios, joins contado/financiamiento, impuestos, cantidades inválidas, default sin precio e inputs inmutables. No se modifica frontend, Auth, usuarios, Neon, infraestructura, DB, datos maestros ni despliegues. Sin llamadas de negocio, IA auxiliar o APIs facturables. Por ser cálculo local sin UI nueva, no se agrega un wireframe distinto.

## Ejecutor, recursos y rollback

Elección humana registrada: Codex gpt-6.1-sol / high, 2026-10-02T16:46:22Z. Continuidad dentro del máximo B2 autorizado de 240 horas; no programación ni autorización de gasto. El selector principal no es observable por esta superficie, por lo que no se afirma cambio ni verificación del runtime. Claude, Sonnet, Fable y subagentes no fueron invocados. Se reutilizó la skill claude-review sólo para registrar la elección y coordinar el único escritor; no se activó inferencia.

Lectura soportada de cuota Codex 2026-10-03T01:08:38Z: ordinaryUsageAllowed=true, ventana semanal 10,080 min usada 11%, reposición Unix 1791580450; ventana de cinco horas no informada. Claude cinco horas/semanal y Fable desconocidos; no se usa evidencia histórica como actual. No se puede atribuir porcentaje ni costo monetario a este corte. Los intentos fallidos no se contabilizan como consumo cero. Límite del contrato: 80 pasos, reintentos automáticos cero, máximo 2 reparaciones locales antes de inspeccionar; aquí se empleó una reparación. El paquete auxiliar máximo de 6,000 bytes no se transmitió.

Rollback funcional inmediato: omitir la quinta opción o usar UNPRICED. Rollback de código, si se solicita: retirar sólo import/call/output/pin nuevos del consolidado, restaurar expectativa 77, y retirar estos dos archivos nuevos de módulo/test y dos archivos nuevos de investigación, conservando todos los cambios previos ajenos. No requiere migración ni rollback externo. No se realizó eliminación en este corte.

## Pendientes hacia el entregable completo

Resolver la prima comercial fronteriza compatible del tractor MX y la alternativa económica de seguro de carga; completar la conciliación de peajes del itinerario y los supuestos aún no compatibles. Mantener como sensibilidad el C3 hasta disponer de un método público tractor-only mejor sustentado. No pedir contabilidad privada para sustituir el benchmark público. No declarar B2 cerrado por estos tests o por esta suma parcial.
