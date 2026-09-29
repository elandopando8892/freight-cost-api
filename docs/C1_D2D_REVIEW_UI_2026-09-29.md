# Revisión visual local de escenarios D2D

Inicio `0046b2c38c53530e634f9f94d1696bdf10a7ac90`, rama `codex/cost-tires-release-s14`, worktree limpio en D:. Recomendación Astra alto para diseño/contrato; sin cambio de selector ni delegación.

Skill design-handoff aplicada para especificar estados, espaciado, tokens, teclado y responsive antes de implementar. [Wireframe](design/owned-d2d-review-wireframe.md). Se reutilizan tokens y tipografía MARKSMAN del proyecto; no se revalidó el manual original ni se cambió identidad gráfica. Se leyeron las guías locales Next de páginas y componentes servidor/cliente exigidas por AGENTS.

Ruta nueva `/scenarios/benchmark`, enlazada desde Scenario Lab y con regreso. No altera el flujo de revisión de cotizaciones existente. La pantalla inicia vacía, acepta JSON pegado de calculateOwnedD2DScenarios y muestra totales declarados por escenario y fuentes del remolque en detalles desplegables. Estado INCOMPLETE presenta campo/código, sin importes. No precarga fixtures ni datos históricos como operativos.

Límite deliberado: aún no existe endpoint autenticado del nuevo calculador. Esta primera vista es un lector local, no ejecuta ni autentica cálculo; aviso permanente. Valida únicamente el subconjunto del contrato que presenta, no linaje completo, aritmética o suficiencia económica. No es evidencia de aceptación operativa. Cambiar texto descarta resultados anteriores; Limpiar elimina todo el estado. Sin solicitudes de cálculo ni almacenamiento del JSON. La sesión/layout de la aplicación sigue el comportamiento existente.

Se limita tamaño, número de escenarios y fuentes. Se rechazan calibrated=true, estados contradictorios y URLs no HTTPS. Valores se renderizan como texto React, no HTML. Fuente externa se abre solo por acción del usuario. No hay botones de publicación, aprobación, adopción ni cotización.

Validación: 4 pruebas nuevas de render/contrato PASS; Typecheck web PASS; git diff --check. No se ejecutó build completo ni prueba visual/interactiva en navegador; responsive y teclado están especificados/implementados, pendientes de inspección real. Las pruebas no confirman despliegue, sesión ni aislamiento remoto.

Sin cambios de API, bases, Auth, infraestructura o Preview. Próximo corte: validación visual móvil/escritorio y prueba del flujo con salida real local del calculador, después conexión autenticada si se define el contrato de ejecución. No presentar el lector manual como integración de producción.

Rollback: revertir únicamente el commit de página, componentes, test y documentos; sin datos remotos que restaurar.
