# Regresión local de permisos de revisión comercial

Base: `3a6b5955434da7d9c98bf067e89262d71547e3d7`, rama
`codex/supabase-auth-slice`, checkout verificado en D:, inicialmente limpio.

Se añadieron tres casos HTTP con Fastify inject: ADMIN y OPERATOR reciben el mismo
404 comercial para fuente ajena e inexistente; VIEWER no eleva privilegios con
role/orgId en cuerpo o cabeceras. Se verifica que VIEWER no consulta la fuente.
El teardown conserva las aserciones de cero creaciones de propuestas, borradores
de email y eventos de auditoría.

Resultado: 32/32 pruebas en customer-proposal-draft-route, customer-proposal-draft
y organization-member-roles. La primera ejecución produjo 30/32: la comparación
incluía requestId, que legítimamente cambia entre peticiones. Se ajustó la prueba
para comparar todo el cuerpo salvo ese identificador de correlación, verificando
que ambos IDs sean strings y que el único campo comercial restante sea error.
No se cambió código de aplicación para lograr PASS. Typecheck API: PASS.

Alcance: autorización de ruta real, autenticación y Prisma simulados; no prueba
tokens Supabase, roles de cuentas reales, aislamiento desplegado ni renovación.
AUTH-07/08/11/12 siguen pendientes. Para QA real se requieren cuentas de prueba
OPERATOR/VIEWER existentes y autorizadas y datos de prueba; no crear ni promover
usuarios como atajo. No se tocaron datos, Auth, infraestructura ni producción.

Preview vigente sin cambios: SHA `00cfa51`, pareja documentada en
`PREVIEW_RESPONSIVE_RELEASE_2026-09-08.md`. Este incremento sólo añade tests y
evidencia; no requiere despliegue ni wireframe nuevo porque no cambia la UI.
Rollback: revertir únicamente el commit de esta regresión, preservando otros cambios.

La skill testing-strategy guió la separación entre contrato HTTP y aceptación real.
Modelo recomendado: GPT-5.6 Sol, esfuerzo alto para límites de autorización;
medio para documentación. No se verificó ni cambió el selector real del modelo.
