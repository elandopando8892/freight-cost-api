# ADR-010 · capital prospectivo desde valor de mercado

Estado: Accepted para modelo público local de capital US; no adopción de parámetros ni producción.

Extensión2oct2026: [caja](../research/B2_BOX_PROSPECTIVE_SCENARIOS_2026-10-02.md) y [tractorMX](../research/B2_MX_PROSPECTIVE_CAPITAL_2026-10-02.md) conectados como escenarios condicionales locales bajo el mismo criterio de mercado/uso. No se trasladan coeficientesUS, vida nueva ni cuotas de financiación entre equipos. MX compara características principales manual18/DD15450HP/46000lb; precio2019/MXN, condición, generación y trayectoria futura siguen hipótesis explícitas, no curva calibrada. Tres modosMX y dos hipótesis fiscales de caja no se seleccionan ni suman en la base. Las copias de contado con todos los capitales contienen4/10partidas modeladas (incluye primaUS), base2/original0; B2 íntegro continúa abierto.
Fecha: 2 octubre2026. Decisión humana: «autorizo cambio metodologico», en este chat, después de propuesta explícita de valorar uso económico futuro desde mercado en lugar de simular compra con cargos desconocidos. Responsable de integración/verificación: Codex.

## Decisión y comparación previa

El costo de un servicio de terceros no exige simular la adquisición real de un tractor. Para un equipo de referencia ya en uso medimos pérdida de valor de mercado por edad/kilometraje y deuda de referencia, si existe. Se conserva ADR008, costo económico de depreciación más interés, sin sumar principal ni mensualidad completa.

| Alternativa | Ventaja / límite | Decisión |
| --- | --- | --- |
| Adquisición histórica/out-the-door | Apropiada para compra/inversión; requiere cargos/términos no publicados | Conservar como contraste; no completar con ceros |
| Pago mensual de crédito/arrendamiento | Flujo de caja visible, pero principal puede duplicar depreciación | No usar como capital económico |
| Pérdida prospectiva de valor + interés de deuda de referencia | Estimación por uso reproducible, con hipótesis y sin eventos de transacción inventados | Autorizada e implementada US |

`Dmercado = (VactualProxy - VterminalBrutoModelado)/N`.
Contado: `Dmercado`, referencia sin deuda. Financiado: `Dmercado + interés medio del saldo de referencia durante N`, no pago total. N36 es ventana analítica, no vida remanente certificada. Mes representa promedio de ventana, no factura de octubre ni primer interés de préstamo.

Vterminal es una valoración, **no venta**. El modelo no contiene compra, refinanciación, apertura de préstamo, anuncio ni liquidación del activo. Por eso no imputa sus cargos; los importes desconocidos siguen null y no se declaran cero. No equivale a costo de adquisición/disposición/contrato financiero completo. El rendimiento exigido al capital propio queda como política financiera separada, no dentro de depreciación/interés ni supuesto cero.

## Aplicación económica y límites

Una unidad US de referencia2021 usada; precio anunciado Ryder40495USD como proxy de mercado, no tasación independiente. Incrementos de edad/kilometraje ANL2019/2021: .9071 anual y .999 por1000mi adicionales; no añadir odómetro histórico al exponente ni transferir coeficientes a tractorMX/caja. H12026 PAMT se selecciona como **hipótesis de uso futuro**, no observación conjunta ni productividad US-only:11307.27187593797km/mes.

Deuda financiada: saldo proxy90%del valor de mercado,72meses restantes, tasa nominal analítica9%, pagos nivelados/sin gracia/balloon en ese escenario. Fuente prestamista publica APR9%, NO tasa nominal: no convertirla ni afirmar elegibilidad/contrato. No nueva originación, reembolso de principal ni venta al mes36 supuestos. Caja/MX mantienen su metodología pendiente y no reciben coeficientes US por autorización genérica.

Resultado US: contado472.99USD/mes; financiado691.43USD/mes. Capital queda modelado para este alcance prospectivo, no calibrado/observado ni capital transaccional completo. La fila usa `DOCUMENTED_PUBLIC_MODEL`, evidencia y perfil. No cambiar schema/canonical210/engine activo.

Dos copias separadas del presupuesto: `reviewedPublicModelBudgets.CASH` y `.FINANCED`, misma prima y demás filas intactas. La salida heredada `authoritativeBudget` muestra la base contado con etiqueta explícita, no elección de financiación real; ambas alternativas siguen incompletas y ninguna habilita cotizar. Original worksheet permanece vacío/inalterado. No carga de caja ni administración dentro del tractor.

## Verificación, continuidad y rollback

Reutilizados comparadorUS/cronograma y auditor existente, sin tecnología/infraestructura nueva. Pruebas de fórmula, no doble principal, null versus0, perfil/mes/alcance, evidencia duplicada, recálculo, alternativas, copia sin sobrescribir. Resumen de pruebas/fuentes/consumo en [expediente](../research/B2_US_PROSPECTIVE_CAPITAL_2026-10-02.md).

B2 no completo:2/10familias modeladas, ocho importes desconocidos,11condiciones y CFU/CVU/costoD2Dnull. Terminar economía MX/caja/admin única, variables y ciclo/distancias/vacíos/cruce; B3 seleccionar/calcular/guardar/reabrir con wireframes después.

Rollback por hunks: retirar conexión y pin prospectivos, helper/ficha/tests/esteADR y notas de estado; reponer presupuesto de prima US1fila/12condiciones. No restaurar archivos completos compartidos ni modificar originals. Sin DB/Auth/usuarios/Neon/migraciones/deploy/cargos/negocio.
