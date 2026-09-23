# Estimación de compra por socios · FCM_THIRD_PARTY_FLAT_V1

> Actualización: el incremento de persistencia sobre `10739ca` está implementado localmente. Ver [evidencia, límites y rollout](partner-cost-persistence.md). Las secciones inferiores conservan la evidencia de la primera entrega, que calculaba sólo en sesión; ya no describen por sí solas el alcance del código actual.

Fecha: 2026-09-23. Implementación local sobre `a2bfe23` en `codex/quote-integrity-sprint`, worktree en D:. El objetivo es que XBF componga costos de terceros por modalidad a partir de tarifas documentadas. Este primer incremento cubre D2D de un viaje sencillo, con línea MX y línea US e intercambio de equipo. La nacionalidad de la empresa principal es independiente de la dirección del viaje.

## Flujo disponible

Cotizar → Costos de socios (`/quote/partners`) → movimiento y supuestos → dos tarifas → cruce/intercambio y FX → desglose de compra. ADMIN/OPERATOR pueden calcular. VIEWER tiene aviso de consulta y la API devuelve 403. El cálculo se ejecuta en `POST /engine/third-party-cost`, protegido por la autenticación existente y `Cache-Control: no-store`; el frontend utiliza el BFF existente.

Las dos tarifas son flat por viaje, netas antes de impuestos. Cada una conserva transportista, referencia, moneda, vigencia, importe, combustible/peajes incluidos o adicionales y condiciones/exclusiones. Cruce e intercambio se declaran una sola vez: incluidos en MX, incluidos en US o como cargo separado con proveedor y referencia/vigencia propios. Un concepto desconocido se conserva como `UNKNOWN`, nunca se rellena con cero. Un adicional cero requiere captura explícita.

MXN se convierte a USD dividiendo entre `fx.mxnPerUsd`; se exige fuente y fecha cuando hay MXN. Cada línea convertida se redondea a centavos con mitades hacia arriba mediante aritmética entera; el total suma esos centavos y coincide con el desglose. Por ejemplo, 2.01 MXN / FX 2 produce 1.01 USD, sin perder el centavo por representación binaria. No se aplica redondeo V3 a cientos, margen de venta, capital de flota ni supuestos predeterminados. Se admiten dos decimales por importe y seis por FX. El FX de referencia no puede tener fecha posterior al viaje; no se consulta un proveedor externo para verificar su valor.

`ESTIMATE` significa que los conceptos requeridos están declarados y las vigencias cubren el viaje. `INCOMPLETE` retorna incidencias por campo y `purchaseCostUsd=null`. El subtotal de conceptos conocidos puede existir, pero la pantalla no lo presenta como compra completa. `sourceStatus=USER_SUPPLIED_UNVERIFIED` evita atribuir verificación documental a una declaración. En la captura se piden responsabilidades por tramo, carga y tiempos. Esas condiciones se conservan como texto; el sistema no interpreta ni verifica automáticamente contratos, geografía, equipo o responsabilidad legal.

## Caso reproducible

`tests/fixtures/third-party-cost.ts` contiene datos sintéticos. A FX 17 MXN/USD: tarifa MX 17,000 + combustible MX 1,700 + peajes MX 850 equivalen a 1,150 USD; tarifa US 1,200 + peajes US 30 + cruce 150 suman 1,380 USD. Total: **2,530 USD**. Combustible US e intercambio ya incluidos no se agregan de nuevo.

Prueba manual local: `node apps/web/tests/visual/server.mjs`, abrir `http://127.0.0.1:4317/tests/visual/viewports.html?page=partners`, cargar ejemplo sintético y calcular. El harness bloquea todo fetch ajeno al fixture y ejecuta en memoria el mismo módulo matemático. No prueba Supabase, el BFF ni persistencia remota. Los [wireframes y estados](../../../docs/design/THIRD_PARTY_COST_HANDOFF.md) preceden a la implementación y usan los tokens MARKSMAN vigentes.

## Límites y siguiente incremento

Este flujo calcula en sesión y no guarda ni confirma una cotización. Recargar o salir pierde la captura. No emite `previewId` del motor V3 ni se conecta a guardar/enviar propuestas. Las bases versionadas de ambos segmentos siguen `MODEL_PENDING`: esta calculadora separada no habilita `BROKERED` o `LEASED` en el modelo de flota. Transbordo, MX Drayage, roundtrip, tarifas por km/milla/hora y combinación de costo propio con un tercero quedan fuera de este contrato. No se aceptan silenciosamente esos tipos de servicio en el endpoint.

La compra conocida excluye impuestos y cargos por demoras, almacenaje o contingencias que no estén en las tarifas capturadas. No implica precio all-in garantizado ni precio de venta. Para el siguiente incremento: guardar una versión independiente e inmutable de tarifas y condiciones, reapertura/reproducción con fechas, cargos contingentes explícitos y una base por segmento. Después, conciliar casos reales representativos de XBF y completar el recorrido autenticado en preview.

## Release y rollback

Evidencia local final: Node 24.19.0; API 542 pruebas aprobadas y 2 PostgreSQL omitidas existentes; web 17 aprobadas; build API y Next.js aprobados, incluyendo `/quote/partners`; lint web aprobado. La primera compilación con Node 20.14.0 emitió advertencia de Supabase por runtime antiguo; se conservó el resultado y se repitieron suites y builds con Node 24, sin cambiar la instalación del sistema. Typechecks incluidos en ambos builds.

Inspección de navegador: fixture con los componentes reales y aritmética en memoria, caso 2,530 USD; al cambiar cruce a UNKNOWN se retiró el resultado anterior y se mostró la incidencia sin total. Vista 390 px: documento interior `clientWidth=scrollWidth=371`; vista 1280 px: `clientWidth=scrollWidth=1261` (scrollbar del iframe). Captura, resultado e incompleto inspeccionados visualmente. No incluye shell ni sesión autenticados; el fixture de roles HTTP usa identidad simulada y comprueba 401/403 y cálculo autorizado sin acceso a DB.

Este incremento no requiere nueva migración; el branch contiene migraciones anteriores cuya aplicación remota debe verificarse antes de liberar el conjunto. No se desplegó ni se modificaron Auth, Neon, usuarios, infraestructura o datos de negocio; no hubo llamadas a IA ni compras de recursos. La promoción requiere API y web del mismo commit y prueba autenticada de ADMIN/OPERATOR y rechazo VIEWER. Rollback: revertir el commit de este incremento en API y web; no hay registros nuevos que eliminar.

Modelo/esfuerzo recomendado: Astra alto para contrato económico y permisos; Sol medio para formulario y wireframes. Se mantuvo la configuración de modelo de esta tarea, sin cambiarla desde herramientas ni delegar agentes. La guía design-handoff orientó estados, accesibilidad, tokens y breakpoints.
