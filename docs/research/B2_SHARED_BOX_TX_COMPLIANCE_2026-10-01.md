# B2 · caja compartida: renovación Texas de referencia

Resultado local: cuotas anuales de referencia **USD101.75**, equivalente exacto **USD8.4791666667/mes** (pantalla monetaria8.48). Una caja, una renovación anual; no cargo completo por tramo o país. No es costo D2D, recibo pagado, permiso binacional completo ni parámetro adoptado.

## Benchmark y decisión

1. Conservar únicamente15USD de base: evidencia correcta pero insuficiente para presupuesto de renovación.
2. Componer cuotas oficiales para un escenario acotado Texas/Webb: recomendado. Reutiliza fuentes/lector/contrato actuales; sin proveedor, infraestructura o dependencia nueva.
3. Adoptar una renta con servicios incluidos: no comparable con el objetivo de modelar contado/financiado; no sustituirlo silenciosamente.

No innovación en normalizar cuotas. El valor del FCM es componer recursos y exposición sin duplicar la caja y mantener la trazabilidad del costo.

Hipótesis documentada: semirremolque comercial elegible, ya registrado, renovación anual en Webb; inspección CDEC anual a máximo publicado de estación, pago presencial no electrónico. No acredita matrícula, clasificación legal ni pago de un transportista real. México y alternativas de matrícula siguen sin selección; no se exige contabilidad privada para modelarlas.

| Concepto | USD/año | Evidencia |
| --- | ---: | --- |
| Token |15| [TxDMV programa](https://www.txdmv.gov/motor-carriers/commercial-fleet-registration/token-trailers) |
| County agregado |20| [Cuotas2026, Webb](https://www.txdmv.gov/sites/default/files/body-files/FeeChart_1C.pdf) |
| Procesamiento renovación |4.75| [Manual agosto2026,1-3](https://www.txdmv.gov/sites/default/files/body-files/Motor_Vehicle_Registration_Manual_Book_298.pdf) |
| Estación comercial, máximo |40| [DPS](https://www.dps.texas.gov/section/vehicle-inspection/cost-inspection) |
| Parte estatal CDEC |22| Manual22-10, tabla22-2 |

Se corrigió la lectura inicial de50USD como total: manual detallado establece22 estatales, estación hasta40, suma62. El subtotal legal de50 no reemplaza la tabla de cobro. No se suman reemplazo no comercial7.50, child-safety por segunda vez, automation adicional, TexasSure del vehículo motorizado ni cargos electrónicos omitidos. Exclusiones son por alcance explícito, no convertir desconocidos en cero. Entrada/operación MX, aduana, eventos de adquisición y costos de viaje siguen pendientes fuera de esta renovación.

## Implementación y aceptación

JSON `B2_SHARED_BOX_TX_COMPLIANCE_2026-10-01.json` congelado por SHA256, función determinista `calculateSharedBoxTexasComplianceReference`, integrado en consolidación existente bajo `supportingSharedBoxTexasCompliance`. Sin motor paralelo, API nueva o UI nueva. No wireframe porque no cambió interfaz.

43pins. Archivos binarios originales y HTML token verificados por hash; county y tabla inspección renderizados/inspeccionados. DPS leído en web sin archivo original, marcado `archive:null`. Se conserva worksheet original: **0/10 familias binacionales completas** y seis resultados finalesnull. El presupuesto Texas acotado no autoriza cerrar la familia binacional.

Validación:265 pruebas focalizadas PASS (189 consolidación,30 presupuesto,33 seguro/employer,13 cuotas caja), typecheck PASS, lectura raíz confirma101.75/8.4791666667/62 y resultadosnull; diff-check PASS. Pruebas: duplicación de cuotas/caja, año/plazo incompatible, jurisdicción/pago electrónico, importe estatal incorrecto, fuentes duplicadas/faltantes y adulteración de archivos. Evidencia pública real + hipótesis/modelo/pruebas locales; sin prueba autenticada SaaS, despliegue o uso operativo.

## Ledger del corte

- Objetivo íntegro: costoD2D MéxicoDF→FortSmith, relevo propio/caja53′, contado y financiado; B2 activo. Esta contribución resuelve aritmética de renovación Texas, no el total del servicio.
- Inicio2026-10-01T23:31:17MX; límite25min, un reintento por fallo; reservar cierre/verificación dentro del límite. No reconstruir presupuesto integral a partir de esta cuota.
- Responsable/escritura/verificación: Codex principal. OpenAI GPT‑6.1 Sol/high recomendado para conciliar clasificación y fuentes; catálogo soporta esfuerzo, no acredita selector/acceso. Modelo/esfuerzo principal exactos no observables; sin cambio de selector. No Astra, Claude ni agentes auxiliares invocados: determinismo verificable y sin ventaja suficiente para duplicar contexto.
- Cuota automática al inicio23:31:17MX, refresco hacia23:51MX: ventana10080min usada100%, ordinaryUsageAllowed=false, reposición6oct13:08MX; secundaria no informada, créditos disponibles. Usuario autorizó continuidad; sin activar facturación/extra. Tokens/cargos reales del corte no observables, reserva porcentual no cuantificable. No equivalencia inventada entre créditos, tokens y cuota.
- ClaudeMaxx5 declaración histórica; ventana5h/semanal/Fable/reposición/ruta de suscripción y uso extra actuales desconocidos. Sin llamadas ni instalación de lectores. Fable no necesario para esta tarea, no inferir facturación/inclusión.
- Consumo relativo esperado: una implementación/prueba local evita contexto e invocación auxiliar duplicados; ahorro exacto desconocido. Mantener margen para integración; sin builds generales repetidos.
- Fallos conservados: dos nombres de archivos adivinados inexistentes, resueltos mediante `rg --files`; URLs antiguas de capítulos Texas redirigieron a portada, no ley válida; endpoint nuevo de548.504 falló. Se reutilizó manual vigente, sin encadenar reintentos. Consumo fallido desconocido, no cero. Lectura inicial de skillPDF truncada se completó. No fallo de prueba/código en este corte.
- Workspace D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD4f5fc2de0c3d178dace917231e1092040dec21fd; cambios existentes preservados. Local lineal, sin commit/staging/PR/preview.

## Pendiente y rollback

Completar paquetes económicos coherentes de capital/seguro/permisos MX-US y pool único; después capacidad/cicloUS/frontera/vacíos y variables hasta estimaciónD2D completa. No abrir otro sprint fiscal/FX genérico. Matrícula preguntada como elección de escenario, no bloqueo para investigar modelos públicos.

Rollback: retirar sólo import/pin/cálculo/verificación de archivos/referencias/propiedad Texas y los casos de prueba de este corte de los dos archivos compartidos; retirar los tres archivos nuevos de modelo/helper/test y este informe junto con sus dos originalesPDF nuevos, si ya no se requieren. No borrar los archivos compartidos (eran untracked con contenido previo), ni resetear worktree. Retirar sólo los párrafos de estado añadidos. Sin migración, cambiosAuth/Neon/DB/usuarios/infra/producción, operaciones de negocio, llamadasGoogle ni IA de la aplicación.
