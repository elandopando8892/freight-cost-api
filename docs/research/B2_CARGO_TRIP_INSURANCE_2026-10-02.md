# B2 · Mercancía por embarque y frontera, sin doble cobro

Checkpoint local, 2 octubre 2026, 21:07 UTC. B2 sigue activo: esto aporta una partida reproducible, **no completa el costo D2D** ni constituye cotización o póliza.

## Resultado y decisión

Antes había una referencia de responsabilidad de carga US dentro del fijo del tracto, pero no un cálculo separado de seguro por valor declarado. Ahora `supportingCargoTripInsurance` reproduce ocho puntos públicos y `applyCargoTripInsuranceToPartialCost` puede añadir una prima por embarque al CVU sobre una copia. No se multiplica por dos tractores, países, relevos, distancia ni regreso vacío. El seguro US existente no se retira: protege otro interés/obligación y no hay sustitución documentada.

| Enfoque revisado | Ajuste y decisión |
|---|---|
| Seguros propios y responsabilidad del transportista | Conservar las partidas existentes; falta resolver RC del tractor MX al cruzar. No equiparar esto a asegurar todo el valor de la mercancía. |
| Seguro adicional por valor declarado | Componente estándar reutilizable, por embarque. Precio público calculable, pero necesita alcance de costo, mercancía, valor e hipótesis fiscal explícitos. Recomendado sólo si se incluye ese servicio. |
| Póliza binacional ajustada al transportista | Podría reconciliar coberturas, pero las fuentes revisadas no publican una prima compatible. No pedir cotización, usar chat del proveedor ni contratar sin autoridad adicional. |

Se preguntó al usuario si desea sólo los seguros del transportista o incluir el adicional, con mercancía y valor de referencia. Al checkpoint **no hay respuesta recibida**. La selección del piloto permanece `UNDECIDED`, importe `null`; ningún valor de un ejemplo se convierte en mercancía real. Si el gasto corresponde por alcance al cargador, sólo esa partida adicional queda excluida; no desaparece la responsabilidad del transportista.

## Benchmark y fórmula verificable

[Timi: precio por viaje](https://timi.mx/carga/cuanto-cuesta), revisión publicada 20 septiembre 2026, consultada y archivada 2 octubre: prima neta `max(valor × 0.0045, 250 MXN)`, más derecho observado, después IVA. Se transcribieron ocho filas de valor/prima/derecho/subtotal. La página declara la misma cuota nacional e internacional **sujeta a elegibilidad**, no aceptación del piloto.

Ejemplo **publicado, no elegido**: valor 500,000 MXN → prima 2,250 + derecho 150 = neto 2,400; IVA 384 → bruto **2,784 MXN**. Con el FIX de valoración ya fijado del 1 octubre, 18.3688 MXN/USD, son **151.561343 USD brutos** por embarque. Neto y bruto son alternativas fiscales explícitas, no suma ni declaración de crédito fiscal recuperable. No se infieren límites de intervalos de derechos: un valor sin punto documentado devuelve importe pendiente, no un derecho inventado. Los ocho puntos abarcan valores 50,000–2,000,000 MXN; eso no es una muestra estadística ni un rango del costo del piloto.

No se contactó al agente ni se usó su chat/IA/cotizador. El código diferencia una hipótesis económica con precio público de aceptación del riesgo, certificado, contrato, cobertura de maniobras/patios y fecha efectiva. La mercancía asegurada tampoco se presume apta por ser caja seca.

## Cruce: evidencia, no una prima ficticia

Las [instrucciones oficiales OP-2 de FMCSA, sección IV](https://li-public.fmcsa.dot.gov/LIVIEW/PKG_MX_POPUP_ONLINE.prc_popup_english/pkg_registration.prc_option) describen MCS-90 y evidencia de seguro continuo o por viaje de al menos 24 horas para el supuesto de registro fronterizo. **24 horas no es un precio, una prima por día, autorización long-haul ni acreditación del transportista.** No se adoptaron distancias de zonas de su tabla histórica para el piloto.

La guía solicitada a Timi redirigió a su [página de tractocamión](https://timi.mx/seguro-tractocamion). Su apartado de cruce distingue la RC comercial estadounidense de autos particulares y remite a cotización QIC por unidad/transportista sin precio de lista. Se archivó la respuesta real del redirect. La prima MX→US queda `null`; no se copian los 926 USD de póliza del tractor US, un precio turístico ni el límite de responsabilidad como prima. Esta conclusión sobre RC no contradice las extensiones de daño físico documentadas en el corte de la caja.

Las búsquedas adicionales no produjeron una prima primaria compatible: resultados de seguros turísticos, agregadores y ejemplos no verificados se descartaron. No convertir ausencia de precio público en gasto cero, ni extender esta búsqueda indefinidamente mientras existen otros componentes de B2 que sí pueden completarse.

## Implementación, evidencia y límites

- Biblioteca nueva `apps/api/scripts/lib/reference-cargo-trip-insurance.ts`, JSON del mismo nombre de checkpoint, fuentes HTML originales y conexión al consolidado: **67 pins**.
- **272 pruebas aprobadas / 3 archivos**: 26 nuevas de mercancía, 20 de caja y 226 del consolidado. Incluyen ocho aritméticas, mínimo, IVA/FIX, selección pendiente, rechazo de derechos inferidos, cargo único y duplicado, suma previa incorrecta, FX inválido y alteración de cada HTML fuente.
- Prueba sintética de inclusión sobre **272 comparaciones existentes** de contado/financiado y ambos ciclos/caja: mismo incremento por embarque, CFU intacto, seguros previos intactos. Es una prueba, no 272 valores adoptados ni nuevos sprints.
- TypeScript estricto `noEmit` aprobado. Readback conserva el primer subtotal anterior de caja **4014.867553809634 USD**; seis outputs completos siguen `null`. No confundir subtotal conocido con costo íntegro.
- No UI modificada: no se afirma recorrido B3, persistencia, sesión autenticada, aprobación, despliegue o utilización operativa. Sin DB/Auth/Neon/migraciones/usuarios/infraestructura ni negocio externo.

Comandos ejecutados con Node del runtime instalado:

```text
node node_modules/vitest/vitest.mjs run apps/api/tests/benchmark-cargo-trip-insurance.test.ts apps/api/tests/benchmark-box-insurance-cfu.test.ts apps/api/tests/benchmark-binational-reference-budget.test.ts
node node_modules/typescript/bin/tsc --strict --noEmit --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler apps/api/scripts/lib/reference-cargo-trip-insurance.ts apps/api/scripts/consolidate-binational-reference-budget.ts apps/api/tests/benchmark-cargo-trip-insurance.test.ts
```

Fuente de precio SHA256 `32098a67f7f78dfb66b4c310be89adc42e240327197a8ed196be0da9ca67fe3c`; página de cruce `7c0be90666283ea23d6ee7c0a61b310c61cdd09f6de39fccca7712c96cea9e89`; OP-2 `647a7bdff0d1beb34f359e9ac8490f74df08f42c85922ef3fa5b6ef617655bd7`. Identidad y localizadores completos en el JSON; no se afirma archivo de una página distinta a la descargada.

## Continuidad, consumo y rollback

Rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, worktree físico `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`, revalidados. Cambios ajenos preservados. La fachada C y el repo principal no se editaron. El AGENTS global vigente se leyó desde D; no existe en la ruta C histórica ni en la raíz de este worktree.

Codex investigador/implementador/integrador/verificador único. Elección humana previa: `gpt-6.1-sol/high`, 2oct16:46:22Z, mantenida para el mismo B2; identificador/esfuerzo exactos del runtime actual no observables. Claude/Fable no invocados ni selector alterado. Guía `claude-review` utilizada sólo para registro cooperante de escritor. Nuevo job `cargo-trip-reference`, release fijado `chat-20261002T203733Z`. No transferencia justificada por falta de precio público; evita repetir contexto, ahorro no cuantificado. Cuotas cinco horas/semanal/Fable, uso atribuible y cargos desconocidos, no cero ni evidencia antigua restampada. Máximo humano240h sin dinero adicional; estimación20–35min del tramo de implementación, cero reintentos de proveedor, reevaluar ante dos reparaciones fallidas. Pruebas y TSC pasaron al primer intento.

Rollback selectivo probado **en memoria**, sin restaurar archivos: quitar sólo import/pin/cálculo/validación de fuentes/salida `cargoTripInsurance`; revertir test67→66. Se recuperan exactamente hashes previos del consolidado `674ff1aa519c62150d53ce827c660cc7051fc1f3545f906997ceb7fc9301017e` y prueba `7bb3da2c6f8285d3f66ea6a023159c0cfe1628c4db0df6f7b2665c06dc91546a`. Conservar biblioteca/JSON/fuentes/checkpoint desconectados y retirar sólo las dos entradas de status de este corte si se revierte. No resetear archivos completos ni eliminar investigación ajena.

Siguiente avance independiente: conectar gastos de empresa, oficina/patio y servicios ya investigados a la escala administrativa actual, sin siete plazas/cargos duplicados. Mantener los faltantes de RC/mercancía y los demás componentes del piloto visibles; B2 cierra únicamente con una estimación íntegra y reproducible, antes de B3 SaaS + wireframes MARKSMAN.
