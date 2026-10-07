# Revisión binacional · wireframe y contrato del corte autorizado

Respuesta humana «adelante contiinua» recibida el 4 oct 2026 tras la propuesta de 60 min. Autoriza integración local no comercial, no una modificación de V3, DB, permisos, Auth o despliegue.

Benchmark reutilizado: [auditoría vigente](W2_OWN_RELAY_SUPPORT_AUDIT_2026-10-04.md) y [baseline tecnológico](../research/ECOSYSTEM_REUSE_BASELINE_2026-10-03.md). Revalidado el compositor B2, reader con fingerprint, Fastify/roles y wizard. Cambiar sólo el validador no resuelve reparto; adoptar otra plataforma añade mantenimiento y no aporta la metodología. Se elige adapter de lectura al compositor existente, sin dependencias nuevas ni fórmula en React.

Alternativas visuales: A, panel expandible en el wizard (recomendada: conserva base/versión y decisiones pendientes); B, otra página de escenario (más navegación para el mismo trabajo). Se usa A, dirección MARKSMAN ya implementada en globals.css: tema claro #efefef/#1e1e1e y tema oscuro #151515/#efefef, naranja #ea5e27 y bordes existentes; el panel hereda las variables del tema, las tipografías declaradas y sus fallbacks. QA se comprobó en tema oscuro. No logo nuevo, tokens nuevos ni reinterpretación del manual. No se requieren brandkit/imagegen porque no se está creando una identidad o imagen de marca.

```text
Armar supuestos de [base]                  [versión / revisión]
[Consultar escenario de relevo propio]  NO COMERCIAL
┌ Relevo propio MX / US, misma caja 53′ ────────────────────┐
│ México DF → Fort Smith AR72916 · World Trade Bridge       │
│ [Ciclo] [Contado / financiado] [FIX Sep28–30] [Descanso]   │
│ [Consultar planeación]   comparación, no viaje confirmado │
│ Recurso               CFU              CVU       Total   │
│ Tractor México         …                …         …      │
│ Tractor EE. UU.        …                …         …      │
│ Caja compartida (1)    …                …         …      │
│ Costo de planeación …    Compra: pendiente · Venta: —     │
│ [Componentes y exclusiones] [Fuentes y limitaciones]      │
└ Sin cotizar, guardar/adoptar inputs o publicar ───────────┘
Wizard existente de selección de supuestos sin cambios de fórmula
```

En móvil: controles en una columna, tabla dentro de su propio scroll horizontal, fuentes envueltas, foco visible. Lectura bajo petición, no carga pagada automática. Cambio de selección limpia la cifra anterior; error o vencimiento limpia resultados; respuesta tardía no puede revivir otra selección. Mantener contexto de identidad/org; los valores son referencia pública común, no costos de la empresa seleccionada.

Interface: GET independiente de revisión B2 bajo ADMIN/OPERATOR y auth/org existentes. No parámetros orgId/baseId/versionId de cliente ni mutaciones. Payload empaquetado local, hash de integridad, 24 comparaciones, fuentes fijadas; regeneración sólo local mediante el compositor. Perfil `OWN_RELAY_SAME_TRAILER` sólo en el DTO de revisión: no enum V3/SQL, no cambio de applicabilityProfile ni reinterpretación histórica. Viewer no puede consultar este endpoint. El wizard ofrece enlace/panel; el snapshot no queda embebido en el cliente de producción ni funciona como fallback.

Cierre: misma aritmética de B2, tres recursos/caja única, costes/hipótesis separados de cotización; prueba de roles, contexto, replay de consulta, errores, stale snapshot, cuenta/vencimiento, UI y recarga de lectura. Persistencia de decisiones/auth real sigue fuera de este corte. Ejecutor Codex/OpenAI, gpt-6.1-sol/high recomendado/solicitado; efectivos desconocidos. Claude considerado, no invocado: continuidad y verificación local suficientes. Único escritor D:, 60 min desde 15:19 México, hasta dos reparaciones diagnosticadas; sin IA auxiliar/APIs facturables, cuota/consumo nativo desconocidos. Skills codebase-design/front-end mantienen seam pequeño y UI existente; pruebas proporcionales sin nueva plataforma.
