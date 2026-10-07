# B2 · ISN Nuevo León, referencia anual de monitorista

## Resultado y alcance

Antes: el escenario público mexicano calculaba sueldo, prestaciones y cuotas; ISN sin referencia. Ahora: el consolidador integra separadamente el ISN anual condicionado, conservando el snapshot anterior y su impuesto mensual desconocido. No hay adopción ni nómina real.

Objetivo: reducir un faltante del presupuesto público sin transformar una vacante de monitorista en costo real del operador o del grupo binacional. Se conserva General Escobedo, Nuevo León; no se traslada la tasa a CDMX o Tamaulipas. Flujo local: salario público → hipótesis bruto/primer año → remuneraciones anuales → referencia ISN → subtotal parcial, nunca cotización habilitada. Sin UI nueva; no aplica cambio de wireframe/branding en este corte.

## Benchmark y decisión

- Reutilizar el cálculo patronal y añadir componente limitado de ISN: recomendado; sin infraestructura, dependencias o servicios nuevos, aritmética comprobable y aislamiento de evidencia histórica.
- Aplicar el 4% de la iniciativa: rechazado; una propuesta no sustituye el artículo 157 consultado (3%).
- Construir un motor fiscal general multiestado: diferido; no es necesario para este escenario y amplía mantenimiento, permisos y alcance.

El proceso diferencial sigue siendo la asignación gobernada por recurso y exposición para CFU/CVU. Este impuesto es una capacidad estándar, no motivo para crear arquitectura propia adicional. Codex realiza la única escritura e integración; no se duplica implementación ni se llama un auxiliar.

## Evidencia consultada

[Ley de Hacienda, HCNL](https://www.hcnl.gob.mx/trabajo_legislativo/leyes/leyes/ley_de_hacienda_del_estado_de_nuevo_leon/): artículos 154/156 definen remuneraciones; 157 fija 3%; 160 distingue exenciones. Se incluyen aquí sueldo, aguinaldo y prima vacacional; no SBC ni cuotas patronales.

[Periódico Oficial, 1 de enero de 2026](https://evalua-pbr.nl.gob.mx/wp-content/uploads/2026/01/Ley-de-Ingresos-2026-POE-Reconduccion-.pdf): páginas físicas 3–4 inspeccionadas visualmente. Decreto ejecutivo 1-2026 reconduce la ley de ingresos 2025 para 2026; no es por sí mismo el artículo de tasa ISN. Original archivado, SHA256 `034e05b9066270ab4d237c7c19a7d0fe48627e7b2d17e336540a4b9400664a6c`.

[Comunicado del Ejecutivo, 14 de enero de 2026](https://www.nl.gob.mx/es/boletines/remite-el-ejecutivo-estatal-observaciones-al-congreso-del-estado-relativas-ley-de): corrobora ausencia de incremento del ISN, no reemplaza promulgación. La conclusión es una referencia legal publicada y fechada, no certificación fiscal del contribuyente ni garantía contra reformas posteriores. Revalidar antes de adoptar.

No se utilizaron declaraciones identificables de contribuyentes aparecidas en resultados de búsqueda. No se solicitaron nóminas privadas.

## Cálculo comprobable

Hipótesis: doce sueldos brutos fijos, aguinaldo de 15 días y prima de 25% sobre 12 días; remuneraciones pagadas en el año; sin persona/entidad especialmente exenta ni crédito particular asumido. Vacaciones ya están dentro del sueldo y no se añaden otra vez. No se presupone un calendario efectivo de pagos.

| Sueldo mensual hipotético MXN | Remuneración anual base MXN | ISN anual referencia MXN | Devengo promedio mensual MXN |
| --- | --- | --- | --- |
| 15,000 | 189,000 | 5,670 | 472.50 |
| 16,000 | 201,600 | 6,048 | 504.00 |

La suma de componentes queda en 20,115.615775753424 / 21,415.19947347032 MXN. Mezcla cuotas del mes completo de octubre con devengos anuales prorrateados de beneficios e ISN: es subtotal de planificación, **no impuesto causado en octubre, pago mensual, mínimo ni costo patronal completo**. Riesgo de trabajo y otros costos continúan sin cuantificar. Sueldo bruto/neto, elegibilidad fiscal, empleador, carga de turnos, flota/exposición y fecha/FX del viaje no quedan acreditados.

## Criterios de cierre y validación

- Componente anual recalculado en ambos extremos; rechaza tasa propuesta, neto, otra jurisdicción/año, bases SBC/cuotas y entradas no soportadas.
- Nuevo dossier pinneado y original PDF verificado por hash; prueba de archivo alterado falla cerrada. Snapshots anteriores no se recertifican ni reescriben.
- Resultado mensual causado y completo permanecen `null`, cero adopciones y partidas completas; seis salidas económicas siguen `null`.
- 260 pruebas focalizadas en cinco archivos y typecheck estricto aprobados. CLI local devuelve 2 por presupuesto incompleto, no por excepción. No prueba de aplicación autenticada, persistencia, producción o aceptación operativa: este cambio es investigación/aritmética local.

## Responsable, modelo y presupuesto

OpenAI/Codex, único integrador. Recomendación: GPT-6.1 Sol, esfuerzo medio; no cambia el selector principal y el ID/versión real de inferencia no es observable desde estas herramientas. Fable/Claude no aportan ventaja suficiente para esta aritmética verificable y no se invocan; sus cuotas, privacidad y uso extra actuales son desconocidos, no habilitados por inferencia. No agentes.

Preflight Codex leído al comienzo del corte (aprox. 20:43 MX, 2026-10-01), fuente soportada de límites: semanal 100% usado, ventana 10,080 min, `ordinaryUsageAllowed=false`, secundaria no observable y créditos disponibles; reposición 2026-10-06 13:08 MX. Usuario autorizó continuidad aun con consumo adicional en el contexto precedente. No se activa facturación ni nuevos proveedores. Cargos reales y consumo de este corte no observables; no se infiere cuota desde tokens o saldo. Claude Max x5 es declaración del usuario, no prueba de disponibilidad actual; 5h/semanal/Fable/reposición/uso extra desconocidos.

Límite previo 12 minutos, una reparación máxima, reserva de dos minutos de cierre; sin llamadas auxiliares ni builds amplios. Reusar contexto/cálculo y cinco suites cuesta menos trabajo que duplicar auditorías o construir motor fiscal, sin porcentaje de ahorro monetario supuesto. Inicio 20:43:25 MX; cierre previsto antes de 20:55:25. Sin reparaciones por prueba fallida. Un wrapper de dependencias no disponible se descartó; uso de ese intento desconocido. CLI diagnóstico consultó primero un nombre inexistente `provenance`: el cero mostrado no era conteo de pins; campo correcto `sourcePins` tiene 29, validado en lectura final. No instalar lectores para cuotas.

## Continuidad y rollback

Cierre verificado 20:53:33 MX: 10 minutos 8 segundos desde inicio; dentro del límite. 260 casos únicos aprobados en la ejecución final después del último ajuste de código (no se cuentan dos veces por la repetición); 29 `sourcePins` leídos, CLI 2 esperado, todos los outputs null, revisión de whitespace sin errores. Rama/HEAD sin cambio y hash del escenario patronal anterior intacto. No se infiere disponibilidad de cuota al cierre desde la lectura inicial.

Rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, worktree físico en D:. Cambios ajenos preservados; sin commit, rama nueva, preview, deploy, Auth, DB, migración, infraestructura, operaciones o IA de aplicación.

Rollback selectivo: retirar únicamente import/pin/validación binaria/mapeo/refs y campos `nlPayrollTax*` añadidos al consolidador, junto con las dos nuevas pruebas de integración; después retirar los tres nuevos archivos de helper/pruebas/dossier JSON, este informe y el PDF tras verificar que ninguna otra referencia los usa. Preservar pruebas anteriores y todos los cambios preexistentes. Retirar sólo las notas de este corte en estado/plan; nunca resetear el worktree.

Siguiente: riesgo patronal IMSS en escenario público explícito y conciliación del pool administrativo con exposición. No extender otra investigación fiscal genérica. B2 y MVP no cerrados: referencias no sustituyen presupuesto completo y ruta/ciclo/variables aplicables.
