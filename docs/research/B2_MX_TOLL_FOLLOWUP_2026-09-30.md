# B2 · Seguimiento de cinco puntos de peaje

2026-09-30, local en D:, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. AGENTS/Git/worktrees revisados; cambios ajenos conservados. Sin commit, nueva rama o despliegue.

## Resultado

Antes: nueve coincidencias, cuatro puntos sin contraste primario recuperado y un cero sin sustento. Ahora: **12 coincidencias (7 fechadas, 5 sin fecha), 1 conflicto y 1 cero sin sustento**. Los 14 puntos tienen algún contraste documental, **no 14 tarifas aplicables aprobadas**. Movimientos y aplicabilidad al servicio siguen pendientes. Cero adopciones; total aprobado `null`.

El usuario respondió «sí es una caja seca 53'» a la consulta de tractocamión/semirremolque de cinco ejes. Se registra la confirmación de equipo; **fecha, domicilios exactos y puente no confirmados**. No se reescribe el caso de investigación fijado por hash ni se atribuye su Zócalo/Puente III al usuario.

| Punto | Contraste primario nuevo | Decisión |
| --- | --- | --- |
| México–Pachuca | SICT C5: 137 para México–Lechería/Texcoco y México–Huehuetoca. | Coincidencia sin fecha en esta vista; no usar tarifa completa de Ojo de Agua ni elegir movimiento por importe. |
| Ventura–El Peyote | META público: bypass 7, registro 89 C5, precio 328. | Coincidencia sin vigencia certificada; `updated_at` no es fecha efectiva. Impuestos/pago pendientes. |
| Matehuala | SICT C5: 125, IVA incluido, desde 13-04-2026; SAKBÉ conserva 144. | Conflicto, no sustituir ninguno sin conciliar aplicación/clase/movimiento. |
| Periférico | CAMS Caseta 3: Ojo Caliente II–Periférico C5/C6 338, IVA, desde 13-04-2026. | Coincidencia fechada, distinta de Lincoln. Parcial 221/completo 559 son alternativas, no sumandos. Excluidas tarifas sólo para residentes. |
| La Carbonera | SICT: tramo completo Puerto México–Ent. La Carbonera C5 306. | No identifica el punto cero sobre Libramiento Oriente Saltillo; sigue `ZERO_UNVERIFIED`, sin sustitución o doble cobro. |

## Fuentes y decisión previa

- [SICT México–Pachuca](https://app.sct.gob.mx/sibuac_internet/ControllerUI?action=cmdDatosOperRepDet&idVia=56): lector web; archivo directo agotó tiempo. Sin original fijado ni vigencia inventada.
- [META, sitio del operador](https://autopistasmeta.mx/): componente público TabsSection consulta `/bypasses` y `/rates?bypassID=...` de `https://meta-api.valoran.mx`. GET público sin credenciales identifica bypass 7 como Ventura–El Peyote. [Tarifas originales](https://meta-api.valoran.mx/rates?bypassID=7) archivadas; registro C5 actualizado `2026-04-14T20:56:11.802Z`, no prueba vigencia. Sin login, datos personales ni operaciones administrativas.
- [CAMS, operador](https://operadoravial.com/tarifas/): HTML original archivado; columnas contrastadas con lector web.
- [SICT Matehuala](https://app.sct.gob.mx/sibuac_internet/ControllerUI?action=CmdTarifaRep1&radioSel=1&selectVia=176) y [SICT Carbonera](https://app.sct.gob.mx/sibuac_internet/ControllerUI?action=CmdTarifaRep1&radioSel=1&selectVia=31): lector web, sin originales archivados. ID 176 obtenido del catálogo público, no mediante barrido de IDs.

GET directo SICT Monterrey–Saltillo produjo HTML `Error Page` de 2,415 bytes. `sources/SICT_MTSALTILLO_OPER_REVIEW_20260930.html` se conserva **sólo como diagnóstico**, excluido del manifiesto tarifario. HTTP exitoso no certifica contenido. PASE inaccesible/índices diferentes y tablas históricas no sustituyen al operador.

Se adapta el anexo/preflight existente: sin nuevo SDK, proveedor pagado, infraestructura, calculadora, conector periódico, UI o wireframe. La lectura primaria pública acotada resuelve referencias que faltaban; adoptar resultados de automóvil o extrapolar tablas no satisface esta capacidad. Sólo GET públicos; Google/SAKBÉ y sus cupos intactos.

## Entregable y pruebas

Nuevo manifiesto `B2_MX_TOLL_FOLLOWUP_2026-09-30.json`; anterior intacto. La implementación existente lo acepta como tercer argumento:

```text
node node_modules/tsx/dist/cli.mjs apps/api/scripts/run-d2d-readiness-case.ts docs/research/B2_D2D_READINESS_CASE_2026-09-30.json docs/research/B2_D2D_SAKBE_ROUTE_LINK_2026-09-30.json docs/research/B2_MX_TOLL_FOLLOWUP_2026-09-30.json
```

**75/75 pruebas PASS**: 22 peajes (cuatro nuevas), 27 enlace de ruta, 26 readiness. Typecheck estricto PASS. Skill testing-strategy: integridad, transcripción C5 META, conservación de observaciones/pins y comparación de readiness sin servicios externos.

CLI integrado con archivos reales: salida esperada **2 / INCOMPLETE**, **41 faltantes económicos**, `costs=null`, compositor no invocado, 12 coincidencias/1 conflicto/cero no respaldado. Issues, lineage, observaciones SAKBÉ y handoff intactos. Pruebas adversariales simuladas, fuentes documentales reales; no aceptación SaaS/cotización persistida. Sin SQL/Auth/usuarios/migraciones/operaciones de negocio/IA de aplicación/deploy. Sin build o pruebas visuales repetidas: no cambió UI/runtime.

SHA256:

- Seguimiento: `52cecc69261cfb3b7410389acf978a2c8b544a0b26038daf538e18c26edadee6`.
- Anexo anterior intacto: `4c6e3f761068861f5becdf82795d4a7aa825d58fea5c603942f643ca60f30f3a`.
- META JSON: `76bd543d81f446d584e570b56b591ad81b2392185ec68e866c3990f5b56786d1`.
- CAMS HTML: `6d4e96b9c762a7dd4220e5dd530a0b6cd1f6b95590d95ea2511d86b37c7dfcc5`.

Hashes certifican bytes, no verdad/aplicabilidad. Cuatro referencias SICT no archivadas están expresamente diferenciadas.

## Cierre, siguiente paso y rollback

Corte documental/local cerrado; **B2 parcial, 0/4 gates, cero adopciones**. Siguiente: resolver conflicto Matehuala y cero Carbonera, confirmar movimientos/fecha/domicilios/puente; cerrar cruce/intercambio/ciclo y economía antes de CFU/CVU. Caja seca confirmada no aprueba ruta completa. No repetir búsqueda genérica de todas las casetas.

Rollback: usar anexo anterior en CLI; retirar sólo manifiesto/recibo nuevos, cuatro tests añadidos y notas superiores de estado/plan. Dos archivos primarios nuevos y diagnóstico SICT son documentación prescindible de este corte; preservar archivos previos/cambios ajenos. Sin reversión remota. GPT-6.1 Sol alto aplicabilidad/conflictos; medio documentación/QA. Selector no modificado y tokens/costo no medibles aquí.
