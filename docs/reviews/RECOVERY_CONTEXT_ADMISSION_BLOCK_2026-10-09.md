# Recuperación aislada: contexto corregido, admisión bloqueada

9oct2026, Ciudad de México. Solicitud humana: «adelante con els iguiente trabajo». Alcance conservado: implementación local por `claude-opus-5-5/high`, revisión posterior por `gpt-6-astra/high`, diseño Fable ya entregado. No cambia el modelo nativo. HEAD31e2f7553b13fbd1f984b0e226bf134eaad7fc54, rama codex/cost-tires-release-s14, checkoutD:/andre/worktrees/freight-cost-model/cost-tires-release-20260927. Tres cambios documentales anteriores y45artefactos ajenos preservados.

## Preparación entregada

Leídos el contrato adjudicado y el módulo completo de inspección. Corregida la referencia «tercer contexto» a «segundo contexto»: el paquete incluye sólo contrato e inspector real, con los dos archivos nuevos deliberadamente ausentes. El encargo corregido permanece en el mismo problema/sprint/roles y conserva evidencia del run8906910513b84690aadbc87fbe405161; no se usa resume ni se repite ese contrato cerrado. Request preparado con40min,60pasos,24000bytes de prompt,2097152bytes de salida y cero reintentos automáticos.

Datos de preparación fuera del repositorio:

- D:/andre/validation/fcm-recovery-context-MwutuV: primer candidato de registro; metadataobservedAt2026-10-10T04:58:44.551Z.
- D:/andre/validation/fcm-recovery-context-1lAo7V: candidato recompuesto desde registro revision60; incluye request, metadata, candidato revision61 y propuesta de adición de scope. Ningún plan/apply o enmienda aplicado.
- D:/andre/validation/fcm-recovery-context-current.mjs: preparador mecánico local de esos JSON, no otro runner ni validador del kit. No lanza inferencia.

## Evidencia de admisión

`kit_info` confirmó plugin Windows0.3.0, release cargada/activa assignment-capacity-100000-20261010T020421Z, restart_requiredfalse y user_managed. La autoridad original sigue sin cierre/revocación y vence10oct15:11:57CDMX; no se amplió su vigencia ni se borraron contadores. Docker local respondió contextdesktop-linux/server29.7.2. Esa lectura no crea fixtures ni acredita restauración.

La operación soportada `allowlist.py plan --input <candidato>` produjo:

1. Primer candidato: `schema 2 / next revision required`. Diagnóstico posterior: registro compartido ya había avanzado a revision60 mientras el candidato también tenía revision60. La asignación corregida todavía no estaba registrada; el primer candidato se conserva y no se aplica sobre estado concurrente.
2. Candidato recompuesto revision61 desde registro60: `registry admission busy`, al vencer la espera de5000ms del mutex del registro. No se produjo plan ni efecto sobre el registro.
3. Tras espera acotada25s, la misma operación de planificación volvió a rechazar con `registry admission busy`. Segundo bloqueo de esta causa; se detienen nuevas admisiones conforme a AGENTS.md vigente.

El readback intermedio observó revision60/67asignaciones. No se identificó el propietario del mutex: un bloqueo ocupado no demuestra por sí solo qué sesión lo mantiene ni si está progresando. No se finalizaron procesos ajenos, borraron locks o alteraron guardas. El límite100,000 del registro ya no es la causa diagnosticada. No hubo `claude_prepare`, elección nueva, `claude_run`, consumo Claude nuevo ni implementación. Tokens/cuota de la sesión nativa no observados; no se declaran cero.

## Continuación y cierre de este intento

Para continuar debe terminar o cerrar normalmente la operación propietaria del registro. Una vez libre, revalidar la revisión vigente y generar un plan nuevo preservando entradas concurrentes; revisar/aplicar mediante P2, agregar el task al scope sin reset, atestar los dos contextos, preparar/registrar la elección Opus y lanzar una sola ejecución idempotente. Antes del lanzamiento comprobar vigencia y facturación mediante la ruta soportada. No renovar una autorización que siga vigente ni reutilizar un candidato viejo por conveniencia.

Tras implementación: fixture propia, captura durable, origen apagado, restauración independiente y revisión Astra. La aceptación de recuperación permanece pendiente. Este bloqueo no abre otro sprint ni modifica economía, Auth, datos reales o producción.

Verificación documental: git diff --check del alcance y readback de los archivos preparados. No pruebas de producto nuevas; los dos archivos de implementación todavía no existen. Rollback: retirar sólo este recibo y la precisión editorial del contrato si se solicita; conservar candidatos/evidencia y trabajo ajeno. No estado externo que revertir.
