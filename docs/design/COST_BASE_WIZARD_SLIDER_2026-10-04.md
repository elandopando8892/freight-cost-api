# W1 · Selector horizontal de calibración

## Dirección y benchmark previo

Solicitud humana: mínimo a la izquierda, promedio al centro, máximo a la derecha;
marcador MARKSMAN independiente y dato manual opcional. No cambia la metodología
económica, las fuentes fijadas ni la autoridad para activar una base.

1. Botones de niveles W1 existentes: reutilizan el contrato, pero no permiten
   escoger posiciones intermedias; no cumplen la interacción solicitada.
2. Slider HTML nativo + dato numérico opcional: recomendado para el prototipo
   actual sin framework. Clic, arrastre y teclado, sin paquete, licencia ni cargos
   adicionales. El número exacto se muestra aparte y siempre puede editarse.
3. Slider de librería React: evaluar el componente del stack al integrar W2;
   introducir React/Radix sólo en esta demostración agrega coste de mantenimiento.

Fuentes de capacidad revisadas el 2026-10-04:
- [HTML range / MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/range)
- [Interacción y teclado / WAI APG](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)

## Wireframes y criterio visual

```
Card · Concepto / unidad / calidad de evidencia
          ▼ Estándar MARKSMAN (marcador independiente)
Mínimo ───●──────────────── Promedio ───────────────── Máximo
          ○ Tu elección

Valor elegido: número y unidad
Dato propio, opcional [          ]   [Usar Estándar MARKSMAN]
Premisas / confirmación provisional / guardar borrador
```

El marcador puede estar a 25%, 50% o 75%, por ejemplo; estas posiciones son
ejemplos geométricos, no estadísticas de mercado. Diseño recomendado: una sola
escala con marcador fijo arriba y elección móvil abajo, frente a dos escalas
separadas que dificultan comparar. Se conserva la dirección MARKSMAN W0 aprobada:
naranja #ea5e27, tinta #1e1e1e, gris #484848, fondo #efefef, blanco #ffffff;
tipografía existente con sus fallbacks, logo oficial intacto. Alineación izquierda;
el control y el valor, no nueva decoración, son el centro de la card.

## Reglas y alcance

- Interpolación por tramos: mínimo→promedio ocupa 0–50%, promedio→máximo 50–100%.
  No es un percentil ni una distribución; la distancia monetaria por segmento
  puede ser diferente. El promedio queda al centro aunque no sea el punto medio.
- El estándar usa su propio valor, no se fuerza a coincidir con el promedio.
- Sólo se habilita el recorrido continuo con mínimo < promedio < máximo finitos
  documentados. La falta de extremos NO impide usar MARKSMAN, el promedio o dato
  propio. No se completan rangos con límites técnicos/defaults del catálogo.
- No se coloca un estándar fuera del rango o sin posición demostrable en una
  posición ficticia. Se explica y permanece seleccionable mediante el botón.
- Captura manual opcional y exacta: vaciarla restaura la selección de referencia
  previa; no borra el valor elegido. Los valores manuales fuera del rango siguen
  permitidos con justificación conforme al contrato vigente.
- El clic o arrastre intermedio es una estimación del usuario, no otra estadística
  observada. Se guarda como MANUAL en el contrato W1 sin ampliar enums ni fuentes.
- Usar MARKSMAN no acepta silenciosamente la calidad provisional ni las premisas.
  No se exige un dato manual para continuar con esa referencia.
- No guardar al mover el control: persiste sólo al confirmar la card; se conservan
  revisión, idempotencia y demás controles W1. No cambios DB/Auth/CFU/CVU/producción.

Responsable: Codex local. Recomendación para implementación y comprobación:
OpenAI GPT-6.1 Sol, esfuerzo high; solicitado en este encargo no fijado, observado
desconocido. Claude considerado como alternativa UX, no invocado por continuidad
y verificabilidad local suficientes. Sin llamadas auxiliares ni cambio de modelo.
Presupuesto de este corte: 45 minutos de trabajo local, una pasada de implementación
y hasta dos reparaciones focales; sin inferencia por card ni gasto externo.

## Cierre esperado

Comprobar geometría de ambos tramos y marcador distinto del promedio; referencias
incompletas y fuera de rango; manual vacío; precisión; guardado/recarga W1;
teclado y móvil donde el rango esté disponible. Distinguir tests sintéticos de
las tres cards reales: éstas aún no tienen extremos observados.

Rollback: retirar sólo la adaptación de UI y el helper/tests de este corte;
conservar el archivo de borrador, fuentes fijadas y trabajos previos W0/W1.

## Evidencia del corte

- Implementado en el prototipo W1 servido en http://127.0.0.1:4722/; servidor
  propio reiniciado para servir el módulo de escala, sesión local 86487.
- `node --test docs/prototypes/cost-base-wizard-w1/scale.test.mjs`: 12/12 PASS.
  Geometría sintética asimétrica 10/20/50 y marcadores 15/20/35→25/50/75%:
  no constituyen benchmark económico ni se incorporan al catálogo o borrador.
- Vitest: wizard draft 19/19, cost bases 17/17, calibration 3/3, total 39/39 PASS.
- Sintaxis ES module de wizard.js PASS; chequeo de tipos focal del servidor PASS.
- Navegador real local: input propio 35 sin guardar, elección 35 sin ubicarla
  falsamente en el rango incompleto; vaciar input restaura referencia MX 27 y
  aceptación anterior. Guardado con campo manual vacío y recarga recuperan
  revisión 6, tres decisiones, dos inputs nativos preparados y cero adopciones.
  El 35 fue exclusivamente una prueba transitoria, no quedó persistido.
- Móvil: ancho CSS 390, documento 371, sin desbordamiento horizontal; control,
  marcador y labels inspeccionados visualmente. Viewport restaurado. Consola sin
  errores registrados. [Captura verificada](COST_BASE_WIZARD_SLIDER_VERIFIED_2026-10-04.png).
- La interacción continua de arrastre/teclado NO se probó con datos económicos
  reales: las tres cards reales tienen extremos ausentes y el rango está
  deshabilitado. El cálculo de posiciones sí se probó sintéticamente. No claim
  de aceptación humana, calibración completa o persistencia SaaS.
- Un primer comando de tests usó separador PowerShell en cmd.exe y no ejecutó
  el archivo. Se corrigió ejecutando comandos individuales; sólo sus salidas
  completas se cuentan como PASS. La captura `screenshot` no estuvo disponible;
  se obtuvo con `getScreenshot` del mismo navegador, sin cambiar superficie.

La skill frontend-design dirigió el wireframe y la interacción; no sustituyó
manual de marca ni introdujo otra estética. El siguiente trabajo sigue siendo
W2, persistencia en la aplicación existente, sin desplegar por defecto.
