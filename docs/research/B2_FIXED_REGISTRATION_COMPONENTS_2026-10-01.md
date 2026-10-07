# B2 · importes públicos de registro y permisos, 1 octubre 2026

## Resultado y alcance

Antes: diez importes del presupuesto binacional sin respaldo completo. Ahora: componentes oficiales con números, unidades, periodicidad y exclusiones, ligados al caso DF → Fort Smith vía Puente III, relevo propio MX/US y misma caja. **No es un presupuesto completo ni calibración de las bases.** La fecha del servicio, perfiles y reparto siguen pendientes. No se pide información privada ni se identifica un transportista real.

## Benchmark y decisión previa

| Enfoque | Ajuste, costo y límite | Decisión |
|---|---|---|
| Cuota plana de permisos por tractor/mes | Rápida, pero mezcla entidad, vehículo, altas y renovaciones; retrabajo y doble conteo | Rechazar |
| Componentes de fuentes oficiales + conciliador existente | Consulta pública sin proveedor de pago; mantiene alcance, periodo e incertidumbre; requiere completar aplicabilidad | Adoptar para investigación |
| Cotización completa para transportista identificado | Resolvería el perfil concreto; implica datos y eventos ajenos al caso público actual | No abrir ahora |

La capacidad estándar es consultar tarifas y normalizar unidades: reutilizamos documentación oficial, lectura local, hashes y conciliador existentes. La parte propia es su vínculo con tres recursos físicos y un fondo compartido para CFU/CVU. **No se crea otro motor, servicio, dependencia o infraestructura.** Cierre de este corte: datos públicos rastreables, contraste de periodicidad y prueba de que un componente no completa ni modifica el presupuesto.

## Cifras y tratamiento

| Componente | Observación | Tratamiento de referencia |
|---|---|---|
| UCR | B1 (0–2 vehículos definidos por la tabla): USD 46 para año de registro 2026; USD 55 para 2027 | Una cuota por entidad aplicable/año, no por tramo. Ejemplo B1: 46/12 o 55/12, sin seleccionar flota ni registrante |
| Texas token trailer | USD 15/año de base | USD 1.25/mes de base; cargos locales, perfil y registro pendientes; no total de permisos |
| FMCSA operating authority | USD 300 por autoridad individual solicitada | Evento de apertura no reembolsable; no renovación anual ni USD 25/mes automático |
| SICT SCT-03-008-A | MXN 5,078.80 presencial o 3,873.42 electrónico | Expedición carga general; canales alternativos, vigencia anual no acreditada |
| SICT SCT-03-039-A | MXN 948.55 presencial o 307.89 electrónico | Franja fronteriza/arrastre, no sustituto de permiso long-haul DF; no suma automática |
| IRP | Método por porcentajes de distancia jurisdiccional | Sin importe: no usar la distancia de esta cotización como exposición anual de flota |

UCR: tablas finales de [Federal Register, página impresa 56072, §§367.40/367.50](https://www.federalregister.gov/documents/2026/09/01/2026-17893/fees-for-the-unified-carrier-registration-plan-and-agreement). JSON conserva seis rangos por año. Vigencia de la regla (1 octubre 2026) y año de registro son distintos. El grupo binacional no prueba que ambas entidades legales tengan un solo registro; no se selecciona cantidad ni reparto. Mantener anual/12 sin redondeo prematuro: USD 3.83 × 12 no conserva USD 46.

Remolque: [TxDMV token trailers](https://www.txdmv.gov/motor-carriers/commercial-fleet-registration/token-trailers). Requiere peso bruto superior a 6,000 lb y tractor/placas elegibles; longitud 53′ no basta. Periodo 1–5 años cobrado anticipadamente, cargos locales adicionales; tarjeta añade USD 0.25 + 2.25%, ACH es alternativa. Placa no expirable no equivale a registro pagado perpetuo. No duplicar la misma caja por pasar a otro tramo.

Autoridad: [FMCSA FAQ](https://www.fmcsa.dot.gov/faq/what-cost-obtaining-operating-authority-mcffmx-number), actualización indicada 20 mayo 2023, lectura pública actual; descarga original respondió 403, **no archivo ni hash simulado**. Amortizar una apertura requeriría escenario y plazo explícitos, no convertirla en gasto recurrente.

México: [SICT tabla de trámites, filas 12 y 44](https://micrs.sct.gob.mx/index.php/transporte-y-medicina-preventiva/autotransporte-federal/tramites-y-servicios/requisito-y-costos-de-los-tramites). Sin año tarifario expreso. [Ficha gob.mx](https://www.gob.mx/tramites/ficha/expedicion-del-permiso-para-el-servicio-de-autotransporte-federal-de-carga-general/SCT1699) indexa 4,858/3,705, pero lectura viva falló: comparación histórica indexada, no tarifa vigente. **No promediar diferencias ni declarar vigencia 2026 por fecha de consulta.** No conversión MXN/USD ni adopción.

[TxDMV IRP](https://www.txdmv.gov/motor-carriers/commercial-fleet-registration/apportioned-registration): registro prorrateado según porcentajes por jurisdicción. Faltan perfil, peso, base y periodo de registro, y distancias del periodo o criterio permitido de promedios. No extrapolar una cuota plana de placas Texas al total IRP; otras obligaciones no se hacen cero.

## Frescura y entrega

La [oferta RODAL](https://rodaltruckfinancials.com/catalogo/freightliner-cascadia-2021--vhc-f8668c8f02) sigue publicando MXN 1,198,275.86 + IVA (usado 2021, 694,920 km), precio pedido sujeto a confirmación, no adquisición capitalizable completa. La [ficha Schneider 20753](https://schneider.com/used-equipment/semi-trucks-for-sale/20753) devuelve 404. Se preserva su evidencia de septiembre como histórica, sin sostener disponibilidad actual ni moneda anteriormente no confirmada.

Datos: `B2_FIXED_REGISTRATION_COMPONENTS_2026-10-01.json`; cuatro originales HTML archivados con SHA-256; caso, selección y hoja anterior fijados por hash. Los doce rangos UCR, cuota base de caja y evento de autoridad son datos públicos; su aplicación al caso no está aprobada. Los dos trámites MX conservan vigencia pendiente. No se rellenaron los diez importes, no se alteraron las bases ni cambió el contrato del motor.

Verificación dirigida: **51/51 pruebas PASS (21 de este expediente + 30 del conciliador existente)**: integridad de originales/pins, comparación de tablas UCR extraídas del HTML, normalización de prepago, canales MX alternativos, exclusión de apertura como recurrente y presupuesto incompleto sin adopción. Typecheck estricto del test y dependencias con ES2022/ESNext/Bundler PASS. Invocación inicial de Vitest buscó una dependencia en el workspace API en vez del `node_modules` raíz; corregida sin instalar paquetes. Primer typecheck usó NodeNext/CommonJS incompatible con `import.meta` de los scripts existentes; se corrigió el comando a ESNext/Bundler, no el código.

Readback del CLI existente con los cinco manifiestos: exit **2 esperado INCOMPLETE**, 41 incidencias del caso, 15 condiciones del presupuesto, `costs:null`, `compositorInvoked:false`, cero adopciones y cero gates cerrados. No fallo de ejecución ni nueva fórmula económica. `git diff --check` PASS (avisos LF/CRLF de cambios anteriores, sin whitespace errors). No suite general ni build repetidos sin cambio en producto. No pruebas autenticadas, DB, UI, deployment, casetas/API de pago ni uso operacional. Sin UI nueva: no wireframe requerido en este corte; SaaS posterior sí requiere wireframe MARKSMAN.

## Cierre y recuperación

B2 sigue parcial: 15 condiciones de la hoja (10 importes y 5 perfil/periodo/reparto), no 15 nuevos sprints; caso previo conserva 41 incidencias y 0/4 gates. **Siguiente único: capital y seguro por los tres activos con horizonte/exposición compatibles**, reemplazando el ancla US no disponible y separando responsabilidad vehicular, carga y remolque; después presupuesto completo → CFU/CVU → SaaS. Sin reiniciar Auth/FX ni ampliar infraestructura.

Modelo recomendado: GPT-6.1 Sol, alto para conciliación económica/fuentes; medio para captura e integridad. No se confirma modelo del selector ni se mide consumo/tokens. Guía engineering:testing-strategy aplicada para integridad y fronteras económicas; no prueba disponibilidad legal ni aceptación operativa.

Rollback local: este corte sólo añade expediente, cuatro originales y test; retirar exclusivamente esos nuevos archivos y las dos notas de estado deshace su efecto documental. Hoja anterior y producción no cambiaron. No ejecutar reset, eliminación recursiva ni borrar cambios ajenos. HEAD de referencia `4f5fc2de0c3d178dace917231e1092040dec21fd`, rama `codex/cost-tires-release-s14`, worktree físico en D: verificados antes del corte; sin commit/stage/deploy.
