# Revisión D2D: wireframe y contrato visual

Ruta local propuesta: /scenarios/benchmark. Separada del Scenario Lab de cotizaciones: no reutiliza sus acciones de aprobación/escritura.

```text
← Scenario Lab
REVISIÓN DE BENCHMARK
Escenarios D2D                  [Solo lectura · No calibrado]
Archivo pegado localmente: no recalculado ni autenticado
[ Pegar JSON de calculateOwnedD2DScenarios                  ]
[Revisar resultado] [Limpiar]
Vacío: Sin resultados cargados (nunca mostrar $0 como faltante)
Error: Contrato no compatible; no conservar resultados anteriores
Incompleto: campos/códigos pendientes, sin tarjetas de importes
Válido: tarjetas de escenarios
  ID | CFU | CVU | Frontera | Total USD declarado
  [Fuentes del remolque ▾: identificador / URL / locator]
Pendiente: suficiencia de fuentes / calibración / adopción
```

Reutilizar tokens MARKSMAN existentes en globals.css: background, card, border, primary, muted-foreground y tipografía configurada. No cambiar logo/paleta. max-w-6xl, px-4, py-8; separación gap-4, tarjetas p-4. Una columna hasta md (768px), dos después. Textos largos break-words, URLs break-all; no truncar montos ni advertencias. No animaciones.

Interacciones: textarea con label; botón de lectura valida estructura localmente. Limpiar elimina texto, errores y vista. Sin red ni almacenamiento. Hasta 1 millón de caracteres y 20 escenarios. Detalles nativos desplegables con teclado; fuentes HTTPS abren pestaña nueva con noreferrer. Orden: regreso, textarea, revisar, limpiar, detalles y enlaces. Error role=alert; actualización aria-live polite. No estado de carga de red porque no hay petición.

Se rechaza calibrated=true. Un JSON compatible no acredita autenticidad ni recálculo: aviso permanente. Contrato incompleto muestra issues y no cifras. UI no ofrece publicar, aplicar, cotizar o aprobar. Sin backend integrado todavía; futura integración deberá sustituir importación manual por resultado autenticado y recalculado.
