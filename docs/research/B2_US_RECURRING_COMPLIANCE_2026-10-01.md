# B2 · HVUT como componente, no presupuesto completo

## Resultado y comparación previa

El consolidado ya separaba UCR por entidad/año, registro de caja e IRP pendiente. Se adapta esa base: incorporar HVUT es pertinente; sustituir permisos por una cuota plana Texas o sumar todas las alternativas UCR no lo es. No se introduce servicio, dependencia ni costo contratado. El diferencial sigue siendo el reparto económico de dos tractores y una caja, no reconstruir tablas fiscales.

El [Form 2290 IRS, revisión julio 2026](https://www.irs.gov/pub/irs-pdf/f2290.pdf), página impresa 2 (física 4), distingue U: 74,001–75,000 lb, USD 540; V: más de 75,000 lb, USD 550 no logging. La columna logging no corresponde al modelo de caja seca. Se cotejó visualmente el PDF original, preservado con SHA-256 en el JSON.

Las [instrucciones IRS 07/2026](https://www.irs.gov/instructions/i2290) abarcan julio 2026–junio 2027. El peso fiscal incluye la combinación; una caja no genera un segundo HVUT autónomo. Registro extranjero no prueba exención; millaje de odómetro no determina suspensión. Peso anunciado de 80,000 lb no acredita peso fiscal. Primera utilización fiscal y fecha de viaje no son equivalentes. La regla especial de compra usada a particular con impuesto previo acreditado no se aplica automáticamente a una oferta de distribuidor.

## Entregable y aceptación

Referencia V condicional, sin elegir registrante ni periodo del piloto: USD 550/12 = 45.833333… por vehículo-mes medio. Tabla parcial oficial capturada en JSON. Octubre: desembolso USD 412.50 por nueve meses, no 412.50/12; junio USD 45.83 por uno. Conservamos redondeo publicado, sin redondear prematuramente el costo anual medio. No sumamos meses alternativos. La aplicabilidad real sigue desconocida, no cero.

Flujo local: fuente archivada → hash → componente mensual/tabla parcial → referencias de permisos. No cambia UI: no se necesita nuevo wireframe. Nunca completa por sí sola US_TRACTOR_PERMITS ni modifica CFU/CVU. Pruebas de tabla, unidades, no duplicación y archivos alterados; lectura CLI debe conservar importes completos nulos, cero adopciones y salida 2 por economía incompleta. Detalle de verificación registrado en estado del sprint tras ejecutarla.

## Modelo, consumo y límites

2026-10-01: GPT-6.1 Sol recomendado, high para alcance fiscal/económico; medium para integración/QA. Catálogo desktop admite low/medium/high/xhigh/max/ultra; no prueba inferencia efectiva. No hay mecanismo usado para cambiar el modelo principal/esfuerzo. Observados codex-cli 0.159.2 y Claude Code 2.1.286, sesión Claude Max autenticada: no confirma modelos específicos, cuota ni excedentes. No se llama Claude: no aporta ventaja justificada aquí. Consumo relativo bajo frente a duplicar revisión/contexto; tokens, cuota y ahorro no estimables. Presupuesto: 20 minutos de integración/QA, máximo dos intentos por fuente inaccesible, una reparación antes de reevaluar. FAQ UCR inaccesible: no se infiere su contenido ni se abre otra investigación general.

## Pendientes y rollback

Completar presupuesto fijo compatible, capacidad propia y ciclo del caso, variables y piloto SaaS; B2/MVP no cerrados. IRP exige distancias jurisdiccionales de flota/periodo, no asignación de este viaje. No pedir históricos privados ni activar fuentes pagadas. No filing/pago/DB/Auth/infra/deploy/negocio/IA de aplicación.

Rollback local: retirar exclusivamente el pin recurringCompliance, su lectura/proyección y pruebas nuevas; retirar las dos notas de estado añadidas y este suplemento con sus dos archivos originales IRS. No restaurar archivos enteros: contienen cambios previos ajenos. Dossier original de permisos, datos y producción quedan intactos. Branch codex/cost-tires-release-s14; HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd, worktree físico D: verificado antes de editar.
