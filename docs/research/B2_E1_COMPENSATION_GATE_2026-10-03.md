# E1 · prestaciones recurrentes y frontera de doble conteo

Estado: **componente comparativo desarrollado y probado; E1 NO aprobado**. No es una calibración del paquete laboral ni una cotización. Referencia del negocio: septiembre de 2026, empresa binacional existente, relevo propio MX/US y misma caja. Observación pública: 3 de octubre de 2026.

## Antes, ahora y siguiente cierre

Antes había una oferta con vales mensuales identificada, pero sin una transformación reproducible a componente por ciclo. Ahora hay una revisión local que conecta ese importe con los dos ciclos existentes, compara tres FX sin seleccionar ninguno y conserva desconocidos separados de importes medidos. No añade esos importes al motor ni a las bases canónicas.

El avance concreto es `MX_DRIVER_TOTAL`: un componente adicional publicado puede medirse, sin sumar toda la nómina/SBC ni una segunda cuota fija. En US se comprueba el agregado existente y su cobertura de prestaciones, sin cargar otro porcentaje encima. No se abre otra pantalla ni se cambia la arquitectura.

Para aprobar E1 faltan importes/frecuencias de bonos recurrentes, ahorro y pensiones MX, derecho del relevo, aplicabilidad temporal/cohorte, tratamiento patronal y reconstrucción de septiembre. También siguen abiertas pernocta mixta MX/US, cumplimiento recurrente, seguro de flotilla y otros remanentes B2. **No hay una nueva pregunta de negocio necesaria para ejecutar este corte**; la investigación pública sigue siendo responsabilidad del desarrollo. E2/E3/E4 no se declaran completos por este resultado.

## Benchmark previo y decisión

| Alternativa | Ajuste y costo de mantenimiento | Decisión |
|---|---|---|
| Porcentaje genérico de prestaciones/bonos | Barato de escribir, sin sustento de composición, recurrencia ni asignación; retrabajo y falsa precisión | Rechazado |
| Añadir bonos/prestaciones al total US BLS ya integrado | Duplica categorías del agregado; confunde referencia ocupacional con contrato real | Rechazado |
| Componente publicado aislado, usando compositor y cálculo patronal existentes | Trazable, sin dependencias nuevas; permite comparar sin adoptar y preserva brechas | Seleccionado dentro de la continuidad autorizada |

Capacidad estándar reutilizada: Zod, cálculos de contribuciones, capacidades por ciclo, perfil confirmado y fuentes fijadas. Trabajo específico: vínculo de evidencia económica y prevención de doble conteo. No otro servicio de nómina ni biblioteca/infraestructura. Sólo aplicación local; ninguna contratación, API nueva o consumo auxiliar de IA.

## Evidencia pública y límites

- [Trayecto · Operador ALA](https://careers.trayecto.com/operador-ala-u1hSQWtXJaoU/): 3430 MXN por empleado-mes; incentivo de bienvenida separado y ahorro/pensión sin cantidades. Vacante cerrada; sin fecha exacta ni oferta histórica de septiembre acreditada. Un empleador, no promedio del mercado binacional. La oferta de Querétaro no recibe automáticamente esta frecuencia.
- [BLS · ECEC, publicación 9sep2026](https://www.bls.gov/news.release/archives/ecec_09092026.htm): tabla 2, industria privada, grupo ocupacional Transportation and material moving; no subfila industrial ni sólo conductores. Total36.38, salarios24.97, prestaciones11.41 USD/h. Desglose redondeado2.13+1.31+3.51+1.47+3.00=11.42; se conserva11.41 y el factor36.38/24.97, no se sustituye con la suma redondeada.
- [BLS · conceptos ECEC](https://www.bls.gov/news.release/ecec.tn.htm): permisos pagados, remuneraciones complementarias, seguros, retiro/ahorro y prestaciones obligatorias ya están representados conceptualmente. Esto no demuestra que un carrier concreto otorgue cada beneficio ni valida la transferencia del grupo a truck drivers.
- [INEGI · UMA2026](https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/uma/uma2026.pdf):117.31 MXN diarios desde1feb2026, compatible con el primitivo ya usado.
- [LSS vigente](https://www.diputados.gob.mx/LeyesBiblio/pdf/LSS.pdf), artículos27–30, reforma15ene2026: integración/exclusiones condicionadas. No se ha probado clasificación, requisitos contables ni SBC real del patrón. No se presume exención de vales ni se aplica la mecánica /30 como sustituto de registros de remuneración variable del bimestre.

Se registran hechos y localizadores propios, no archivos originales de páginas ni reproducción integral de ellas. Documento nuevo fijado con SHA256 normalizado sólo CRLF→LF: `3bde7f883fc16c12014c650fba822475a5a19eb737708001079b338974a93416`. Los 83 pins previos no cambian; la CLI nueva consulta84 incluyendo este documento.

## Transformación y cifras obtenidas

Directo publicado: `3430 MXN × 1 empleado-mes`. No se multiplica por todos los operadores ni por el relevo; su derecho/frecuencia siguen sin evidencia. Bono de contratación no convertido en gasto mensual recurrente.

Sensibilidad **hipotética**: una prestación totalmente integrada al SBC agrega `3430/30` a la base diaria anual-media histórica ya existente. Se usa el primitivo dos veces con30días, prima de riesgo de empresa existente desconocida y mismos límites; se resta después−antes. No es determinación fiscal, nómina observada ni prueba de una exención. No sustituye la nómina de septiembre. No se añade SBC como gasto.

Resultado de la sensibilidad en ambos ciclos: cuota fija EM adicional0; delta de contribuciones conocidas sin riesgo689.8759 MXN/mes; componente directo+delta4119.8759 MXN/mes. Riesgo, impuesto estatal, comisiones, efectos adicionales sobre devengos estatutarios, relevo y paquete total permanecen `null`, no cero. No se declara mínimo ni máximo del costo real.

| Comparación | Capacidad histórica ciclos/mes | Vales directos USD/ciclo (FX28/29/30sep) | Directo + contribuciones hipotéticas conocidas USD/ciclo (FX28/29/30sep) |
|---|---:|---|---|
| Red / vacío esperado | 6.187678251 |31.07 /30.67 /30.68 |37.32 /36.84 /36.85 |
| Retorno dedicado misma caja |2.928346267 |65.65 /64.82 /64.82 |78.86 /77.85 /77.86 |

**Las cifras mezclan capacidad/SBC históricos de octubre con sensibilidades FX de septiembre sólo para comparación. No son un cálculo reconstruido para septiembre.** La etiqueta de período incompatible se conserva en cada punto. No se selecciona FX, financiamiento, tratamiento fiscal ni valor canónico. Se compara el mismo componente laboral; contado/financiado no cambia la prestación y no se reescriben sus proyecciones. La nueva revisión no cambia CFU/CVU publicados, compras ni precio de venta. Todos los totales completos siguen `null`.

## Alcance, criterios y ejecución

Responsable: Codex, único escritor local D:. Proveedor/superficie: OpenAI/Codex Desktop. Elección conservada: **gpt-6.1-sol / high** solicitados/autorizados; modelo y esfuerzo efectivos del runtime no expuestos por esta superficie. No se invocaron Claude, Astra, Luna, Fable ni subagentes. No se requiere elección adicional de proveedor para este adaptador pequeño y verificable. Acceso Claude actual no comprobado ni inferido de un catálogo; no se dispara inferencia para compararlo.

Presupuesto de este corte:45min, máximo2 reparaciones diagnosticadas; no ampliación de240h ni nuevo gasto. Reparaciones de código:0. Tokens/costo real del modelo principal no observables; no se afirma consumo cero del turno. No llamadas auxiliares de inferencia, credenciales ni activación de uso extra. Fuentes leídas públicamente; no datos privados de XBF.

Criterios cerrados para este **componente**, no para E1: fuente fijada; importe/frecuencia correctos; hiring no recurrente; no doble cuota fija/US; desconocidos preservados; comparación reproducible; ambos ciclos existentes; seis FX/ciclo-puntos sin selección; ninguna adopción/cambio de composición vigente.

Comandos desde el worktree físico:

```powershell
node node_modules/tsx/dist/cli.mjs apps/api/scripts/review-b2-compensation-evidence.ts
# exit 2 esperado: PARTIAL_COMPONENT_NOT_GATE_PASS, no fallo de ejecución
node node_modules/tsx/dist/cli.mjs apps/api/scripts/project-b2-evidence.ts --check
# exit 0: huella del expediente previo intacta
```

En PowerShell, ejecutar `exit $LASTEXITCODE` al comprobar códigos desde una shell envolvente; sin ello el host anterior reportó1 pese a salida válida2 del hijo. La repetición verificó2 explícitamente. La CLI rechaza argumentos/importes externos con1.

## Verificación real ejecutada

- **160/160 pruebas, 6archivos PASS**: nueva revisión13, perfil12, expediente23, forecastMX28, reglas variablesMX21, compositor público63. Incluye límites, invalidaciones, input ajeno, doble inclusión, ambas capacidades, desconocidos, determinismo y huella pública intacta. Las pruebas unitarias usan SBC1000 y capacidad4 como sentinelas sintéticos; la prueba integrada/CLI usa investigación pública y proyecciones existentes, no nómina real.
- Typecheck estricto del adaptador y su prueba:0errores/PASS; typecheck de API:0errores/PASS.
- CLI positiva:2esperado, dos ciclos/seis comparaciones/84pins; CLI con importe externo:1esperado. Snapshot empaquetado existente:0/PASS, cuatro contextos/83pins/SHA`99594a2ee1e31c67351a77d1124e75ec53d8d5ccbee593c7a5fce2baa264059f`.
- No cambios de UI, por lo que no se añade un wireframe ni se repite validación visual ajena. No prueba nueva de login real, persistencia, nómina de carrier, uso operativo o aceptación humana. Los cuatro fallos antiguos de fixture recapeadas quedan fuera de este corte y no se declaran corregidos.

## Archivos, continuidad y rollback

Nuevos: `apps/api/scripts/lib/b2-recurring-benefits.ts`, `apps/api/scripts/review-b2-compensation-evidence.ts`, `apps/api/tests/benchmark-b2-compensation-evidence.test.ts`, fuenteJSON y esta entrega. Actualizado sólo el encabezado de estado vigente. No cambios de motor, perfil confirmado, snapshot, manifests, lockfile, rutas, Auth, usuarios, DB o infraestructura. No despliegue.

Inicio: rama`codex/cost-tires-release-s14`, HEAD`4f5fc2de0c3d178dace917231e1092040dec21fd`, worktree`D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`; cambios ajenos conservados. No rama/worktree/commit nuevo.

Rollback: retirar únicamente estos cinco archivos nuevos y el párrafo de estado de este corte, después de verificar que no recibieron cambios posteriores. No ejecutar reset/clean general ni tocar otros archivos sin seguimiento. El motor/GET/UI originales no dependen del adaptador nuevo, por lo que no requiere rollback de datos ni Auth. La fuente y el análisis pueden preservarse aun retirando el código.

Siguiente trabajo dentro de E1: cerrar remuneración extra como canasta comparable y reconstruir su aplicabilidad a septiembre; después pernocta mixta y cumplimiento/seguro recurrentes. No abrir E2 ni llamar aprobado al gate con esta sensibilidad parcial.
