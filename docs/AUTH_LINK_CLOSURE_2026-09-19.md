# C1: enlace de identidad previo al release

Fecha: 19 septiembre 2026. Baseline: c9d9f631675dc4518d78ab2897b761f419923ce6.

La revisión del resolvedor detectó una ventana entre consultar por email y actualizar por ID: una identidad concurrente podía reemplazar el vínculo. Se cambió a UPDATE parametrizado con condición de vínculo nulo o igual al sujeto solicitado y RETURNING de identidad, organización y rol efectivos. Si otra identidad ganó la carrera o el email cambió, falla cerrado. Los emails ambiguos ignorando mayúsculas requieren conciliación en vez de elegir arbitrariamente una organización.

Se conserva la lectura compatible con supabaseId nulo en registros heredados y la verificación de email confirmado en el servidor Auth. No se cambió el esquema ni se ejecutó SQL contra la base remota.

Validación local: seis casos de resolución PASS; TypeScript PASS. Los casos cubren rechazo de vínculo ajeno, enlace conservando rol/tenant, invitación, email no confirmado, email ambiguo y carrera perdida. Son pruebas con mocks; no acreditan ejecución PostgreSQL, login real, renovación ni aislamiento completo. A1/A2 permanecen pendientes.

La CLI de Vercel respondió a whoami con el usuario esperado. El enlace temporal del despliegue interrumpido no se encontró; esto no prueba por sí solo ausencia de deployments remotos. Antes de publicar se debe consultar el historial vigente, exportar el nuevo SHA y alinear web/API. El artefacto temporal de septiembre 8 no contiene esta corrección y no debe publicarse como candidato actual.

Rollback: retirar la pareja preview nueva y volver a la pareja anterior documentada; revertir el cambio de fuente mediante un commit separado si fuera necesario. La pareja antigua conserva el fallo de primer enlace y no es una solución productiva. No se requiere rollback de datos por este incremento local.

Modelo recomendado: GPT-6 Astra, esfuerzo alto, por identidad y aislamiento. No afirma modificación del selector.
