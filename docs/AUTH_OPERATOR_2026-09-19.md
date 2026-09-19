# C1: OPERATOR autenticado

Fecha 19 septiembre 2026, aproximadamente 14:39 UTC; candidato 04c7ed7, web jql3ypt8t y API 6j7xrgj50 (ver PREVIEW_RELEASE_2026-09-19.md).

Chrome completó Continuar con Google con la cuenta existente andresmclovin@gmail.com. Volvió al mismo origen y mostró organización HeyMarksman, rol OPERATOR. Configuración tras recarga conservó sesión, organización y rol; equipo de tres integrantes cargó y la cuenta quedó marcada Supabase vinculado. Los selectores de rol se mostraron deshabilitados y la pantalla explicó que el operador sólo puede consultar el equipo. Sales figuró Administrador y jgonzalez Consulta.

El fallo previo de primer enlace ya no se reprodujo. Esto prueba login y persistencia tras recarga del operador en este candidato; no prueba renovación tras expiración, bloqueo API de escritura, aislamiento entre organizaciones ni flujo de cotización. No se extrajeron tokens ni códigos. No se enviaron propuestas ni se crearon cotizaciones.

Se cerró la sesión del operador y se inició el selector Google para continuar con VIEWER. Esa prueba sigue pendiente.

Auditoría npm --omit=dev actual: tres paquetes afectados, baseline-browser-mapping moderado (<2.11.0), Next crítico (16.0.0–16.3.2) y sharp alto (<0.35.4). Fuente: respuesta del registro npm. Next reporta advisories GHSA-p293-qw3h-jr36 y GHSA-2xp9-vwfh-vxw4; sharp GHSA-rgj7-g3m4-5g8c. Falta revisar alcance y actualizar dependencias antes del candidato final. Los 16 hallazgos del build incluían desarrollo; no equivalen a 16 vulnerabilidades explotables en runtime.

Modelo recomendado: Astra alto para Auth/seguridad. A1/A2 permanecen parciales.
