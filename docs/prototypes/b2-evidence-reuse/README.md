# B2 — comparación local de reutilización

Fixture aislada, no pantalla productiva. Ganador del corte: componentes actuales; Refine se conserva únicamente como comparación reproducible. Los cuatro registros y todas las notas son sintéticos; no hay importes de mercado.

Requiere las dependencias existentes del repositorio (Vite, TypeScript, Vitest, RHF y Button/Input). No es un starter independiente ni se integra al build de Next. El paquete y lock propios fijan React19.2.4, Query5.100.14 y Refine5.0.12. No cambiar los manifiestos principales para ejecutarlo.

Desde esta carpeta física en D:

```powershell
npm ci --workspaces=false --ignore-scripts --no-audit --no-fund
npm run dev --workspaces=false
```

Abrir `http://127.0.0.1:4320/actual.html` o `/refine.html`. Loopback y puerto estricto; si está ocupado, investigar antes de detener un proceso ajeno.

Comprobaciones:

```powershell
npm run typecheck --workspaces=false
node ../../../node_modules/vitest/vitest.mjs run --config vitest.config.mjs
npm run build --workspaces=false -- --mode actual
npm run build --workspaces=false -- --mode refine
node measure.mjs
$env:FCM_PLAYWRIGHT_MODULE = 'C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
node browser-check.mjs
```

Playwright1.62.1 es la dependencia ya disponible en este host; ajustar su ruta al runtime instalado, sin instalarlo automáticamente. Las pruebas de navegador necesitan el servidor local activo. Producen JSON y PNG en `tmp/reuse-spike-evidence`, no en bases de datos. La medición usa builds separados para evitar sesgo por chunks compartidos.

La nota usa sessionStorage, con identidad/rol/perfil/período/ciclo/compra/estado/concepto en su clave. Una segunda escritura reemplaza la misma nota. El cambio de contexto borra la selección y el borrador no guardado; un refresco simulado del mismo usuario no cambia su huella. Esto no prueba sesión Supabase, aislamiento multi-tenant server-side ni persistencia de API. No introducir datos reales en esta fixture.

Refine tiene telemetría desactivada, liveMode off, proveedor sintético de lectura y create/update/delete rechazados. Los controles de rol, error, vencimiento y obsolescencia son simuladores claramente identificados. Ningún botón aprueba parámetros.

Diseño: wireframe A; logo oficial y paleta del manual MARKSMAN. Los archivos de las fuentes aprobadas no se incluyen; Arial/Courier son fallbacks declarados. No se afirma aceptación humana del diseño.

[Resultado y límites del corte](../../research/B2_EVIDENCE_REUSE_COMPARISON_2026-10-03.md). No migrar esta fixture completa al producto: en el siguiente corte se conserva sólo el enfoque ganador y se conecta al contrato existente de B2.
